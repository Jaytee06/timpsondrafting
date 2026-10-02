import { Grid, PointerLockControls, useGLTF } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { ChangeEvent, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Box3, Color, Euler, Material, MathUtils, Mesh, MeshStandardMaterial, Object3D, Quaternion, Raycaster, Vector2, Vector3 } from 'three';

const EYE_HEIGHT = 1.65;
const MAX_STEP_HEIGHT = 0.75;
const PLAYER_RADIUS = 0.3;

type FinishTheme = 'original' | 'warm' | 'light' | 'dark';

type FinishOption = {
  key: string;
  category: string;
  surface: string;
  label: string;
};

type ContextTarget = {
  x: number;
  y: number;
  label: string;
  doorAction?: () => void;
  finish?: FinishOption;
};

type DoorState = {
  object: Object3D;
  closedQuaternion: Quaternion;
  openQuaternion: Quaternion;
  progress: number;
  targetProgress: number;
  duration: number;
  pairGroup?: string;
};

const finishPalettes: Record<Exclude<FinishTheme, 'original'>, Record<string, string>> = {
  warm: { walls: '#e7ddca', ceilings: '#efe6d7', trim: '#f8f2e8', cabinets: '#8a5d3b', countertops: '#d8d0c3', flooring: '#9a6b45', roof: '#514942', siding: '#c9b99f', default: '#c9b99f' },
  light: { walls: '#eeeae0', ceilings: '#f5f3ed', trim: '#ffffff', cabinets: '#d8d4c9', countertops: '#f3f1eb', flooring: '#c4a986', roof: '#73777a', siding: '#dad7cf', default: '#e4e0d7' },
  dark: { walls: '#77736c', ceilings: '#99958d', trim: '#292b2d', cabinets: '#34302d', countertops: '#74706a', flooring: '#554437', roof: '#24282b', siding: '#4b5052', default: '#55585a' },
};

const finishCategory = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes('counter')) return 'countertops';
  if (normalized.includes('cabinet')) return 'cabinets';
  if (normalized.includes('floor')) return 'flooring';
  if (normalized.includes('wall')) return 'walls';
  if (normalized.includes('ceiling')) return 'ceilings';
  return ['trim', 'roof', 'siding'].find((category) => normalized.includes(category)) ?? 'default';
};

const finishSurface = (name: string) => name.replace(/^FINISH_[A-Z]+__/i, '').toUpperCase();

const isInsideNamedHierarchy = (object: Object3D, identifier: string) => {
  let current: Object3D | null = object;
  while (current) {
    if (current.name.toUpperCase().includes(identifier)) return true;
    current = current.parent;
  }
  return false;
};

type ViewerManifestDoor = {
  id?: string;
  node?: string;
  openAngleDegrees?: number;
  initialState?: 'open' | 'closed';
  closedQuaternion?: number[];
  axis?: number[];
  durationSeconds?: number;
  pairGroup?: string;
};

type ViewerManifest = { doors?: ViewerManifestDoor[] };

function Model({ url, showLandscaping, finishTheme, finishOverrides, onLandscapingChange, onCapabilitiesChange, onContextTarget, onSceneReady, onGroundChange, onCollisionChange, onWallCollisionChange }: { url: string; showLandscaping: boolean; finishTheme: FinishTheme; finishOverrides: Record<string, FinishTheme>; onLandscapingChange: (count: number) => void; onCapabilitiesChange: (doors: number, finishes: FinishOption[]) => void; onContextTarget: (target: ContextTarget | null) => void; onSceneReady: (scene: Object3D | null) => void; onGroundChange: (height: number) => void; onCollisionChange: (objects: Object3D[]) => void; onWallCollisionChange: (objects: Object3D[]) => void }) {
  const { scene } = useGLTF(url);
  const camera = useThree((state) => state.camera);
  const doors = useRef<DoorState[]>([]);
  const interactiveRay = useRef(new Raycaster());
  const originalMaterials = useRef(new Map<string, { material: MeshStandardMaterial; color: Color; roughness: number; metalness: number; category: string }>());
  const finishTargets = useRef<Array<{ mesh: Mesh; index: number; original: Material; category: string; surface: string }>>([]);
  const finishVariants = useRef(new Map<string, Material>());

  useEffect(() => {
    onSceneReady(scene);
    return () => onSceneReady(null);
  }, [onSceneReady, scene]);

  const toggleDoor = (object: Object3D) => {
    let current: Object3D | null = object;
    while (current) {
      const door = doors.current.find((entry) => entry.object === current);
      if (door) {
        const nextProgress = door.targetProgress > 0.5 ? 0 : 1;
        door.targetProgress = nextProgress;
        if (door.pairGroup) {
          doors.current.forEach((pairedDoor) => {
            if (pairedDoor.pairGroup === door.pairGroup) pairedDoor.targetProgress = nextProgress;
          });
        }
        return true;
      }
      current = current.parent;
    }
    return false;
  };

  const findDoor = (object: Object3D) => {
    let current: Object3D | null = object;
    while (current) {
      const door = doors.current.find((entry) => entry.object === current);
      if (door) return door;
      current = current.parent;
    }
    return undefined;
  };

  useEffect(() => {
    scene.traverse((object) => {
      if (object.name.toUpperCase().includes('MATERIAL_LIBRARY')) object.visible = false;
    });
    scene.updateMatrixWorld(true);
    const bounds = new Box3().makeEmpty();
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || isInsideNamedHierarchy(object, 'MATERIAL_LIBRARY')) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
    });
    if (bounds.isEmpty()) bounds.setFromObject(scene);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const groundHeight = bounds.min.y;
    const walkingHeight = groundHeight + EYE_HEIGHT;
    const approachDistance = Math.max(size.x, size.z) * 0.7;

    scene.updateMatrixWorld(true);
    let frontSpawn: Object3D | undefined;
    scene.traverse((object) => {
      if (!frontSpawn && object.name.trim().toUpperCase() === 'SPAWN_FRONT') frontSpawn = object;
    });
    if (frontSpawn) {
      camera.position.copy(frontSpawn.getWorldPosition(new Vector3()));
      frontSpawn.getWorldQuaternion(camera.quaternion);
      const spawnBackward = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
      spawnBackward.y = 0;
      if (spawnBackward.lengthSq() > 0) camera.position.add(spawnBackward.normalize().multiplyScalar(10));
      camera.position.y += EYE_HEIGHT;
    } else {
      camera.position.set(center.x, walkingHeight, bounds.max.z + approachDistance);
      camera.lookAt(center.x, walkingHeight, center.z);
    }
    camera.updateProjectionMatrix();
    onGroundChange(groundHeight);

    const collisionObjects: Object3D[] = [];
    const wallCollisionObjects: Object3D[] = [];
    const collectCollisionMeshes = (object: Object3D, insideCollisionGroup = false, insideInteractiveDoor = false) => {
      if (isInsideNamedHierarchy(object, 'MATERIAL_LIBRARY')) return;
      const isCollisionGroup = insideCollisionGroup || object.name.toUpperCase().startsWith('COLLISION');
      const isInteractiveDoor = insideInteractiveDoor || object.name.toUpperCase().includes('DOOR_SWING');
      if (isCollisionGroup && 'isMesh' in object) collisionObjects.push(object);
      const normalizedName = object.name.toLowerCase();
      const isDoorPart = /door|leaf|jamb|trim|handle|lever|rose/.test(normalizedName);
      const isWallPart = /wall|sill infill|above header/.test(normalizedName);
      if ('isMesh' in object && ((isWallPart && !isDoorPart) || isInteractiveDoor)) wallCollisionObjects.push(object);
      for (const child of object.children) collectCollisionMeshes(child, isCollisionGroup, isInteractiveDoor);
      if (!insideCollisionGroup && object.name.toUpperCase().startsWith('COLLISION')) object.visible = false;
    };
    collectCollisionMeshes(scene);
    onCollisionChange(collisionObjects);
    onWallCollisionChange(wallCollisionObjects);

    return () => {
      onCollisionChange([]);
      onWallCollisionChange([]);
    };
  }, [camera, onCollisionChange, onGroundChange, onWallCollisionChange, scene]);

  useEffect(() => {
    const landscapingRoots: Object3D[] = [];
    scene.traverse((object) => {
      const isLandscaping = object.name.toUpperCase().includes('LANDSCAPING');
      const hasLandscapingParent = object.parent?.name.toUpperCase().includes('LANDSCAPING');
      if (isLandscaping && !hasLandscapingParent) landscapingRoots.push(object);
    });
    landscapingRoots.forEach((object) => {
      object.visible = showLandscaping;
    });
    onLandscapingChange(landscapingRoots.length);
  }, [onLandscapingChange, scene, showLandscaping]);

  useEffect(() => {
    const detectedDoors: DoorState[] = [];
    const detectedMaterials = new Set<Material>();
    const targets: Array<{ mesh: Mesh; index: number; original: Material; category: string; surface: string }> = [];
    const variants = new Map<string, Material>();
    let manifest: ViewerManifest = {};
    scene.traverse((object) => {
      const manifestString = object.userData?.viewerOptionsJSON;
      if (typeof manifestString === 'string') {
        try {
          manifest = JSON.parse(manifestString) as ViewerManifest;
        } catch {
          // Node/material discovery remains available if embedded JSON is malformed.
        }
      }
    });
    const manifestDoors = new Map((manifest.doors ?? []).flatMap((door) => {
      const key = door.node ?? door.id;
      return key ? [[key, door] as const] : [];
    }));
    scene.traverse((object) => {
      if (object.name.toUpperCase().includes('MATERIAL_LIBRARY')) object.visible = false;
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const match = material.name.toUpperCase().match(/^THEME_(WARM|LIGHT|DARK)__([A-Z]+)(?:__(.+))?$/);
        if (match) {
          const category = finishCategory(match[2]);
          variants.set(`${match[1].toLowerCase()}:${category}:${match[3] ?? '*'}`, material);
        }
      });
    });
    scene.traverse((object) => {
      const normalizedName = object.name.toUpperCase();
      if (normalizedName.includes('DOOR_SWING')) {
        const metadata = manifestDoors.get(object.name);
        const extras = object.userData as {
          openAngleDegrees?: number;
          initialState?: 'open' | 'closed';
          closedQuaternionGLTF?: number[];
          tddDoor?: { initialState?: 'open' | 'closed'; maxAngleDegrees?: number; direction?: 'L' | 'R' };
        };
        const angleMatch = normalizedName.match(/(?:^|_)MAX_?(\d+)|(?:^|_)(\d{2,3})(?:_|$)/);
        const direction = metadata?.openAngleDegrees !== undefined
          ? Math.sign(metadata.openAngleDegrees)
          : extras.openAngleDegrees !== undefined
            ? Math.sign(extras.openAngleDegrees)
            : extras.tddDoor?.direction === 'R' || /SWING_R|RIGHT/.test(normalizedName) ? -1 : 1;
        const degrees = Math.abs(metadata?.openAngleDegrees ?? extras.openAngleDegrees ?? extras.tddDoor?.maxAngleDegrees ?? Number(angleMatch?.[1] ?? angleMatch?.[2] ?? 90));
        const closedValues = metadata?.closedQuaternion ?? extras.closedQuaternionGLTF;
        const closedQuaternion = closedValues?.length === 4
          ? new Quaternion(closedValues[0], closedValues[1], closedValues[2], closedValues[3]).normalize()
          : object.quaternion.clone();
        const axisValues = metadata?.axis?.length === 3 ? metadata.axis : [0, 1, 0];
        const openQuaternion = closedQuaternion.clone().multiply(new Quaternion().setFromAxisAngle(
          new Vector3(axisValues[0], axisValues[1], axisValues[2]).normalize(),
          MathUtils.degToRad(MathUtils.clamp(degrees, 15, 170)) * direction,
        ));
        const startsOpen = (metadata?.initialState ?? extras.initialState ?? extras.tddDoor?.initialState) === 'open';
        object.quaternion.copy(startsOpen ? openQuaternion : closedQuaternion);
        detectedDoors.push({
          object,
          closedQuaternion,
          openQuaternion,
          progress: startsOpen ? 1 : 0,
          targetProgress: startsOpen ? 1 : 0,
          duration: metadata?.durationSeconds ?? 0.65,
          pairGroup: metadata?.pairGroup,
        });
      }
      if (object instanceof Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material, index) => {
          if (material.name.toUpperCase().includes('FINISH_') || normalizedName.includes('FINISH_')) {
            detectedMaterials.add(material);
            const category = finishCategory(`${object.name} ${material.name}`);
            const sourceName = material.name.toUpperCase().startsWith('FINISH_') ? material.name : object.name;
            targets.push({ mesh: object, index, original: material, category, surface: finishSurface(sourceName) });
            if (material instanceof MeshStandardMaterial && !originalMaterials.current.has(material.uuid)) {
              originalMaterials.current.set(material.uuid, {
                material,
                color: material.color.clone(),
                roughness: material.roughness,
                metalness: material.metalness,
                category,
              });
            }
          }
        });
      }
    });
    doors.current = detectedDoors;
    finishTargets.current = targets;
    finishVariants.current = variants;
    const options = targets.map(({ original, category, surface }) => {
      const metadata = original.userData?.tddFinish as { label?: string } | undefined;
      return {
        key: `${category}:${surface}`,
        category,
        surface,
        label: metadata?.label ?? surface.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()),
      };
    }).filter((option, index, all) => all.findIndex((candidate) => candidate.key === option.key) === index);
    onCapabilitiesChange(detectedDoors.length, options);
    return () => {
      doors.current = [];
      finishTargets.current = [];
      finishVariants.current.clear();
      onCapabilitiesChange(0, []);
    };
  }, [onCapabilitiesChange, scene]);

  useEffect(() => {
    finishTargets.current.forEach(({ mesh, index, original, category, surface }) => {
      const activeTheme = finishOverrides[`${category}:${surface}`]
        ?? finishOverrides[`category:${category}`]
        ?? finishTheme;
      const variant = activeTheme === 'original'
        ? undefined
        : finishVariants.current.get(`${activeTheme}:${category}:${surface}`)
          ?? finishVariants.current.get(`${activeTheme}:${category}:*`);
      const nextMaterial = variant?.clone() ?? original;
      if (Array.isArray(mesh.material)) mesh.material[index] = nextMaterial;
      else mesh.material = nextMaterial;
    });
    originalMaterials.current.forEach(({ material, color, roughness, metalness, category }) => {
      const target = finishTargets.current.find((candidate) => candidate.original === material);
      const activeTheme = target
        ? finishOverrides[`${target.category}:${target.surface}`]
          ?? finishOverrides[`category:${target.category}`]
          ?? finishTheme
        : finishTheme;
      const hasPackagedVariant = activeTheme !== 'original' && target
        ? finishVariants.current.has(`${activeTheme}:${target.category}:${target.surface}`)
          || finishVariants.current.has(`${activeTheme}:${target.category}:*`)
        : false;
      if (activeTheme === 'original' || hasPackagedVariant) {
        material.color.copy(color);
        material.roughness = roughness;
        material.metalness = metalness;
      } else {
        material.color.set(finishPalettes[activeTheme][category]);
        material.roughness = activeTheme === 'dark' ? 0.72 : 0.62;
        material.metalness = 0;
      }
      material.needsUpdate = true;
    });
  }, [finishOverrides, finishTheme]);

  useEffect(() => {
    const interact = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || event.repeat || !doors.current.length) return;
      interactiveRay.current.setFromCamera(new Vector2(0, 0), camera);
      const hits = interactiveRay.current.intersectObjects(scene.children, true);
      if (hits.some((hit) => toggleDoor(hit.object))) event.preventDefault();
    };
    window.addEventListener('keydown', interact);
    return () => window.removeEventListener('keydown', interact);
  });

  useFrame((_, delta) => {
    doors.current.forEach((door) => {
      const step = Math.min(delta, 1 / 20) / Math.max(0.1, door.duration);
      door.progress = MathUtils.clamp(
        door.progress + Math.sign(door.targetProgress - door.progress) * Math.min(step, Math.abs(door.targetProgress - door.progress)),
        0,
        1,
      );
      door.object.quaternion.slerpQuaternions(door.closedQuaternion, door.openQuaternion, door.progress);
      door.object.updateMatrixWorld(true);
    });
  });

  return <primitive object={scene} onClick={(event: ThreeEvent<MouseEvent>) => {
    const door = findDoor(event.object);
    const materialIndex = event.face?.materialIndex ?? 0;
    const finishTarget = finishTargets.current.find((candidate) => (
      candidate.mesh === event.object && candidate.index === materialIndex
    )) ?? finishTargets.current.find((candidate) => candidate.mesh === event.object);

    if (!door && !finishTarget) {
      onContextTarget(null);
      return;
    }

    event.stopPropagation();
    const nativeEvent = event.nativeEvent;
    const finish = finishTarget ? {
      key: `${finishTarget.category}:${finishTarget.surface}`,
      category: finishTarget.category,
      surface: finishTarget.surface,
      label: finishTarget.surface.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    } : undefined;
    onContextTarget({
      x: nativeEvent.clientX,
      y: nativeEvent.clientY,
      label: finish?.label ?? door?.object.name.replace(/_/g, ' ') ?? 'Model option',
      doorAction: door ? () => toggleDoor(door.object) : undefined,
      finish,
    });
  }} />;
}

function TouchLookControls({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;
    const previousTouchAction = canvas.style.touchAction;
    const rotation = new Euler(0, 0, 0, 'YXZ');
    let activePointer: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const start = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || activePointer !== null) return;
      activePointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      rotation.setFromQuaternion(camera.quaternion);
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      rotation.y -= (event.clientX - lastX) * 0.004;
      rotation.x -= (event.clientY - lastY) * 0.004;
      rotation.x = MathUtils.clamp(rotation.x, -Math.PI / 2, Math.PI / 2);
      camera.quaternion.setFromEuler(rotation);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const stop = (event: PointerEvent) => {
      if (event.pointerId === activePointer) activePointer = null;
    };

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    return () => {
      canvas.style.touchAction = previousTouchAction;
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', stop);
      canvas.removeEventListener('pointercancel', stop);
    };
  }, [camera, enabled, gl]);

  return null;
}

function WalkControls({ collisionObjects, wallCollisionObjects, groundHeight, mobileMode, onLockChange }: { collisionObjects: Object3D[]; wallCollisionObjects: Object3D[]; groundHeight: number; mobileMode: boolean; onLockChange: (locked: boolean) => void }) {
  const keys = useRef(new Set<string>());
  const isLocked = useRef(false);
  const verticalVelocity = useRef(0);
  const jumpCount = useRef(0);
  const grounded = useRef(true);
  const groundRay = useRef(new Raycaster());
  const wallRay = useRef(new Raycaster());

  useEffect(() => {
    isLocked.current = mobileMode;
    if (mobileMode) onLockChange(true);
  }, [mobileMode, onLockChange]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (isLocked.current && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      keys.current.add(event.key.toLowerCase());
      if (event.code === 'Space' && isLocked.current && !event.repeat && jumpCount.current < 2) {
        verticalVelocity.current = 7;
        jumpCount.current += 1;
        grounded.current = false;
      }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const clearKeys = () => keys.current.clear();
    const visibilityChange = () => {
      if (document.hidden) clearKeys();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', visibilityChange);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', visibilityChange);
    };
  }, []);

  useEffect(() => {
    const blockPointerSpike = (event: MouseEvent) => {
      if (isLocked.current && (Math.abs(event.movementX) > 250 || Math.abs(event.movementY) > 250)) {
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('mousemove', blockPointerSpike, true);
    return () => document.removeEventListener('mousemove', blockPointerSpike, true);
  }, []);

  useFrame(({ camera }, delta) => {
    // A suspended/background tab can report a very large delta on its first frame back.
    // Cap it so one delayed frame cannot teleport the player or blow through the floor.
    const frameDelta = Math.min(delta, 1 / 30);
    verticalVelocity.current -= 18 * frameDelta;
    camera.position.y += verticalVelocity.current * frameDelta;

    if (isLocked.current) {
      const forwardAmount = Number(keys.current.has('w') || keys.current.has('arrowup'))
        - Number(keys.current.has('s') || keys.current.has('arrowdown'));
      const sideAmount = Number(keys.current.has('d') || keys.current.has('arrowright'))
        - Number(keys.current.has('a') || keys.current.has('arrowleft'));
      if (forwardAmount || sideAmount) {
        const forward = new Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const side = new Vector3().crossVectors(forward, camera.up).normalize();
        const movement = forward.multiplyScalar(forwardAmount).add(side.multiplyScalar(sideAmount));
        movement.normalize().multiplyScalar(frameDelta * 5);

        const moveDirection = movement.clone().normalize();
        const probeSide = new Vector3(-moveDirection.z, 0, moveDirection.x).multiplyScalar(PLAYER_RADIUS);
        const probeOffsets = [new Vector3(), probeSide, probeSide.clone().negate()];
        const blockedByWall = wallCollisionObjects.length > 0 && probeOffsets.some((offset) => {
          wallRay.current.set(camera.position.clone().add(offset), moveDirection);
          wallRay.current.far = movement.length() + PLAYER_RADIUS;
          return wallRay.current.intersectObjects(wallCollisionObjects, false).length > 0;
        });
        if (!blockedByWall) camera.position.add(movement);
      }
    }

    let walkingHeight = groundHeight + EYE_HEIGHT;
    if (collisionObjects.length) {
      const feetHeight = camera.position.y - EYE_HEIGHT;
      groundRay.current.set(
        new Vector3(camera.position.x, feetHeight + MAX_STEP_HEIGHT, camera.position.z),
        new Vector3(0, -1, 0),
      );
      groundRay.current.far = MAX_STEP_HEIGHT + 0.5;
      const hit = groundRay.current.intersectObjects(collisionObjects, false)[0];
      if (hit) walkingHeight = hit.point.y + EYE_HEIGHT;
    }

    const stepDifference = walkingHeight - camera.position.y;
    const canStepUp = grounded.current && stepDifference > -0.1 && stepDifference <= MAX_STEP_HEIGHT;
    const hasLanded = verticalVelocity.current <= 0 && camera.position.y <= walkingHeight;
    if (canStepUp || hasLanded) {
      camera.position.y = walkingHeight;
      verticalVelocity.current = 0;
      jumpCount.current = 0;
      grounded.current = true;
    } else if (camera.position.y > walkingHeight + 0.05) {
      grounded.current = false;
    }
  });

  return (
    <>
      {!mobileMode && (
        <PointerLockControls
          selector="#enter-world"
          onLock={() => {
            isLocked.current = true;
            onLockChange(true);
          }}
          onUnlock={() => {
            isLocked.current = false;
            keys.current.clear();
            onLockChange(false);
          }}
        />
      )}
      <TouchLookControls enabled={mobileMode} />
    </>
  );
}

const sendControlKey = (type: 'keydown' | 'keyup', key: string, code = '') => {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
};

function MobileControl({ label, keyName, code, className = '' }: { label: string; keyName: string; code?: string; className?: string }) {
  const handleDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    sendControlKey('keydown', keyName, code);
  };
  const handleUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    sendControlKey('keyup', keyName, code);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={`grid h-14 w-14 touch-none select-none place-items-center rounded border border-white/25 bg-slate-950/75 text-xl font-bold shadow-xl backdrop-blur active:bg-orange/80 ${className}`}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onLostPointerCapture={handleUp}
    >
      {label}
    </button>
  );
}

function MobileJoystick() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const activeKeys = useRef(new Set<string>());

  const updateKeys = (x: number, y: number) => {
    const next = new Set<string>();
    if (y < -0.25) next.add('w');
    if (y > 0.25) next.add('s');
    if (x < -0.25) next.add('a');
    if (x > 0.25) next.add('d');

    for (const key of activeKeys.current) {
      if (!next.has(key)) sendControlKey('keyup', key);
    }
    for (const key of next) {
      if (!activeKeys.current.has(key)) sendControlKey('keydown', key);
    }
    activeKeys.current = next;
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2;
    let x = event.clientX - (bounds.left + radius);
    let y = event.clientY - (bounds.top + radius);
    const distance = Math.hypot(x, y);
    const travel = radius * 0.58;
    if (distance > travel) {
      x = (x / distance) * travel;
      y = (y / distance) * travel;
    }
    setPosition({ x, y });
    updateKeys(x / travel, y / travel);
  };

  const release = () => {
    for (const key of activeKeys.current) sendControlKey('keyup', key);
    activeKeys.current.clear();
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      role="group"
      aria-label="Movement joystick"
      className="relative h-32 w-32 touch-none select-none rounded-full border border-white/25 bg-slate-950/65 shadow-2xl backdrop-blur"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className="pointer-events-none absolute inset-5 rounded-full border border-white/10" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35 bg-orange/85 shadow-lg"
        style={{ marginLeft: position.x, marginTop: position.y }}
      />
    </div>
  );
}

const contextSwatches: Array<{ theme: FinishTheme; label: string; color: string }> = [
  { theme: 'original', label: 'Original', color: '#94a3b8' },
  { theme: 'warm', label: 'Warm', color: '#c9a576' },
  { theme: 'light', label: 'Light', color: '#eeeae0' },
  { theme: 'dark', label: 'Dark', color: '#34383b' },
];

function ContextWheel({ target, activeTheme, onApplyFinish, onModelChange, onClose }: {
  target: ContextTarget;
  activeTheme: FinishTheme;
  onApplyFinish: (theme: FinishTheme) => void;
  onModelChange: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'actions' | 'finishes'>('actions');
  const left = Math.min(Math.max(target.x, 132), window.innerWidth - 132);
  const top = Math.min(Math.max(target.y, 132), window.innerHeight - 132);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const radialButton = 'absolute grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-slate-900/95 px-2 text-center text-[11px] font-semibold leading-tight text-white shadow-xl backdrop-blur transition hover:scale-105 hover:border-orange focus:border-orange focus:outline-none';

  return (
    <div className="pointer-events-none fixed inset-0 z-50" onPointerDown={onClose}>
      <div
        role="dialog"
        aria-label={`Options for ${target.label}`}
        className="pointer-events-auto fixed h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950/35 shadow-2xl backdrop-blur-sm"
        style={{ left, top }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-orange/70 bg-slate-950 px-3 text-center shadow-xl">
          <span className="line-clamp-3 text-xs font-semibold leading-4 text-white">{target.label}</span>
        </div>

        {mode === 'actions' ? (
          <>
            {target.doorAction && (
              <button type="button" className={`${radialButton} left-1/2 top-2 -translate-x-1/2`} onClick={() => { target.doorAction?.(); onModelChange(); onClose(); }}>
                Open / close
              </button>
            )}
            {target.finish && (
              <button type="button" className={`${radialButton} right-2 top-1/2 -translate-y-1/2`} onClick={() => setMode('finishes')}>
                Change finish
              </button>
            )}
            <button type="button" className={`${radialButton} bottom-2 left-1/2 -translate-x-1/2`} onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            {contextSwatches.map((swatch, index) => {
              const positions = ['left-1/2 top-2 -translate-x-1/2', 'right-2 top-1/2 -translate-y-1/2', 'bottom-2 left-1/2 -translate-x-1/2', 'left-2 top-1/2 -translate-y-1/2'];
              return (
                <button
                  type="button"
                  key={swatch.theme}
                  aria-label={`${swatch.label} finish`}
                  aria-pressed={activeTheme === swatch.theme}
                  className={`${radialButton} ${positions[index]} ${activeTheme === swatch.theme ? 'border-orange ring-2 ring-orange/40' : ''}`}
                  onClick={() => { onApplyFinish(swatch.theme); onClose(); }}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="h-6 w-6 rounded-full border border-white/40" style={{ backgroundColor: swatch.color }} />
                    {swatch.label}
                  </span>
                </button>
              );
            })}
            <button type="button" className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 translate-y-7 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-white" onClick={() => setMode('actions')}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ModelViewer() {
  const isAppleMobile = typeof navigator !== 'undefined' && (
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  const canOpenAppleAr = isAppleMobile
    && typeof document !== 'undefined'
    && document.createElement('a').relList.supports('ar');
  const [modelUrl, setModelUrl] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [isWalking, setIsWalking] = useState(false);
  const [groundHeight, setGroundHeight] = useState(0);
  const [collisionObjects, setCollisionObjects] = useState<Object3D[]>([]);
  const [wallCollisionObjects, setWallCollisionObjects] = useState<Object3D[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [showLandscaping, setShowLandscaping] = useState(true);
  const [landscapingCount, setLandscapingCount] = useState(0);
  const [finishTheme, setFinishTheme] = useState<FinishTheme>('original');
  const [doorCount, setDoorCount] = useState(0);
  const [finishOptions, setFinishOptions] = useState<FinishOption[]>([]);
  const [finishOverrides, setFinishOverrides] = useState<Record<string, FinishTheme>>({});
  const [finishCategorySelection, setFinishCategorySelection] = useState('');
  const [finishScope, setFinishScope] = useState('');
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);
  const [exportScene, setExportScene] = useState<Object3D | null>(null);
  const [usdzUrl, setUsdzUrl] = useState('');
  const [isExportingUsdz, setIsExportingUsdz] = useState(false);
  const [usdzError, setUsdzError] = useState('');
  const dragDepth = useRef(0);

  const clearUsdz = useCallback(() => {
    setUsdzUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
    setUsdzError('');
  }, []);

  const handleSceneReady = useCallback((scene: Object3D | null) => setExportScene(scene), []);

  const handleCapabilitiesChange = useCallback((doors: number, finishes: FinishOption[]) => {
    setDoorCount(doors);
    setFinishOptions(finishes);
  }, []);

  const finishCategories = Array.from(new Set(finishOptions.map((option) => option.category))).sort();
  const activeFinishCategory = finishCategorySelection || finishCategories[0] || '';
  const visibleFinishOptions = finishOptions.filter((option) => option.category === activeFinishCategory);

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    return () => {
      if (modelUrl?.startsWith('blob:')) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  useEffect(() => () => {
    if (usdzUrl) URL.revokeObjectURL(usdzUrl);
  }, [usdzUrl]);

  const prepareUsdz = async () => {
    if (!exportScene || isExportingUsdz) return;
    clearUsdz();
    setIsExportingUsdz(true);
    try {
      exportScene.updateMatrixWorld(true);
      const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
      const exporter = new USDZExporter();
      const bytes = await exporter.parseAsync(exportScene, {
        onlyVisible: true,
        quickLookCompatible: true,
        maxTextureSize: 1024,
        includeAnchoringProperties: true,
        ar: {
          anchoring: { type: 'plane' },
          planeAnchoring: { alignment: 'horizontal' },
        },
      });
      setUsdzUrl(URL.createObjectURL(new Blob([bytes], { type: 'model/vnd.usdz+zip' })));
    } catch (error) {
      console.error('USDZ export failed', error);
      setUsdzError('This model could not be prepared for Apple AR. Check its materials and textures.');
    } finally {
      setIsExportingUsdz(false);
    }
  };

  const openModelFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setFileError('That file is not a GLB model. Drop a file ending in .glb.');
      return;
    }
    setFileError('');
    setShowLandscaping(true);
    setLandscapingCount(0);
    setFinishTheme('original');
    setFinishOverrides({});
    setFinishCategorySelection('');
    setFinishScope('');
    setContextTarget(null);
    setExportScene(null);
    clearUsdz();
    setDoorCount(0);
    setFinishOptions([]);
    setModelUrl(URL.createObjectURL(file));
    setFileName(file.name);
  };

  const loadModel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) openModelFile(file);
    event.target.value = '';
  };

  const handleDragEnter = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.types.includes('Files')) return;
    dragDepth.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragLeave = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDraggingFile(false);
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) openModelFile(file);
  };

  return (
    <main
      className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-950 text-white"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <a href="/" className="text-sm text-[#F3A06F] hover:text-white">
            ← Timpson Drafting &amp; Design
          </a>
          <h1 className="mt-1 text-xl font-semibold">3D model viewer</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {modelUrl && landscapingCount > 0 && (
            <label className="flex cursor-pointer items-center gap-3 rounded border border-white/20 bg-slate-900 px-4 py-3 text-sm font-semibold transition hover:border-orange">
              <span>Landscaping</span>
              <input
                type="checkbox"
                checked={showLandscaping}
                onChange={(event) => {
                  setShowLandscaping(event.target.checked);
                  clearUsdz();
                }}
                className="h-4 w-4 accent-orange"
              />
            </label>
          )}
          {modelUrl && finishOptions.length > 0 && (
            <label className="flex items-center gap-2 rounded border border-white/20 bg-slate-900 px-3 py-2 text-sm font-semibold">
              <span>Finish</span>
              <select
                value={finishTheme}
                onChange={(event) => {
                  setFinishTheme(event.target.value as FinishTheme);
                  clearUsdz();
                }}
                className="rounded border border-white/15 bg-slate-950 px-2 py-1.5 text-sm outline-none focus:border-orange"
              >
                <option value="original">Original</option>
                <option value="warm">Desert warm</option>
                <option value="light">Modern light</option>
                <option value="dark">Dark contemporary</option>
              </select>
            </label>
          )}
          {modelUrl && canOpenAppleAr && !usdzUrl && (
            <button
              type="button"
              disabled={!exportScene || isExportingUsdz}
              onClick={prepareUsdz}
              className="rounded border border-white/20 bg-slate-900 px-4 py-3 text-sm font-semibold transition hover:border-orange disabled:cursor-wait disabled:opacity-50"
            >
              {isExportingUsdz ? 'Preparing AR…' : 'Prepare AR'}
            </button>
          )}
          {modelUrl && canOpenAppleAr && usdzUrl && (
            <a
              rel="ar"
              href={usdzUrl}
              className="flex items-center gap-2 rounded border border-orange bg-slate-900 px-4 py-3 text-sm font-semibold text-[#F3A06F] transition hover:bg-orange hover:text-white"
            >
              <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="" className="h-1 w-1 opacity-0" />
              Open in AR
            </a>
          )}
          {modelUrl && finishOptions.length > 0 && (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded border border-white/20 bg-slate-900 px-4 py-3 text-sm font-semibold transition hover:border-orange">
                Customize finishes
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-80 rounded-xl border border-white/15 bg-slate-950 p-4 shadow-2xl">
                <div className="text-sm font-semibold">Finish controls</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">Override a complete category or one available model surface.</p>
                <label className="mt-3 block text-xs text-slate-300">
                  Category
                  <select
                    value={activeFinishCategory}
                    onChange={(event) => {
                      const category = event.target.value;
                      setFinishCategorySelection(category);
                      setFinishScope(`category:${category}`);
                    }}
                    className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-3 py-2 outline-none focus:border-orange"
                  >
                    {finishCategories.map((category) => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}
                  </select>
                </label>
                <label className="mt-3 block text-xs text-slate-300">
                  Apply to
                  <select
                    value={finishScope || `category:${activeFinishCategory}`}
                    onChange={(event) => setFinishScope(event.target.value)}
                    className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-3 py-2 outline-none focus:border-orange"
                  >
                    <option value={`category:${activeFinishCategory}`}>All {activeFinishCategory.replace(/_/g, ' ')}</option>
                    {visibleFinishOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </label>
                <label className="mt-3 block text-xs text-slate-300">
                  Theme
                  <select
                    value={finishOverrides[finishScope || `category:${activeFinishCategory}`] ?? 'inherit'}
                    onChange={(event) => {
                      const scope = finishScope || `category:${activeFinishCategory}`;
                      const value = event.target.value;
                      setFinishOverrides((current) => {
                        const next = { ...current };
                        if (value === 'inherit') delete next[scope];
                        else next[scope] = value as FinishTheme;
                        return next;
                      });
                      clearUsdz();
                    }}
                    className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-3 py-2 outline-none focus:border-orange"
                  >
                    <option value="inherit">Use whole-model theme</option>
                    <option value="original">Original</option>
                    <option value="warm">Desert warm</option>
                    <option value="light">Modern light</option>
                    <option value="dark">Dark contemporary</option>
                  </select>
                </label>
                <button type="button" onClick={() => { setFinishOverrides({}); clearUsdz(); }} className="mt-3 w-full rounded border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-orange hover:text-white">
                  Clear individual overrides
                </button>
              </div>
            </details>
          )}
          <label className="cursor-pointer rounded bg-orange px-5 py-3 font-semibold transition hover:bg-[#a94718]">
            Open .glb
            <input className="sr-only" type="file" accept=".glb,model/gltf-binary" onChange={loadModel} />
          </label>
        </div>
      </header>

      <section className="relative min-h-0 flex-1">
        {usdzError && (
          <div role="alert" className="absolute left-1/2 top-4 z-40 max-w-md -translate-x-1/2 rounded-lg border border-red-400/30 bg-slate-950/95 px-4 py-3 text-center text-sm text-red-200 shadow-xl">
            {usdzError}
          </div>
        )}
        {!modelUrl && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6 text-center">
            <div className="max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl">
              <p className="text-lg font-medium">Open a GLB model to enter the scene</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your file stays on this device. Drop a .glb anywhere on this page or use the button above,
                then drag to orbit, scroll to zoom, and right-drag to pan.
              </p>
              {fileError && <p className="mt-4 text-sm font-medium text-[#F3A06F]" role="alert">{fileError}</p>}
            </div>
          </div>
        )}

        {isDraggingFile && (
          <div className="pointer-events-none absolute inset-4 z-30 grid place-items-center rounded border-2 border-dashed border-orange bg-slate-950/85 text-center backdrop-blur-sm">
            <div>
              <p className="font-display text-3xl font-bold uppercase text-white">Drop GLB to open</p>
              <p className="mt-2 text-sm text-slate-300">The model stays on this device.</p>
            </div>
          </div>
        )}

        <Canvas className="h-full w-full" shadows camera={{ position: [8, 6, 8], fov: 45 }}>
          <color attach="background" args={['#0f172a']} />
          <ambientLight intensity={1.1} />
          <directionalLight
            castShadow
            intensity={2.2}
            position={[8, 12, 6]}
            shadow-mapSize={[2048, 2048]}
          />
          <Grid
            infiniteGrid
            position={[0, groundHeight, 0]}
            fadeDistance={80}
            fadeStrength={5}
            cellColor="#334155"
            sectionColor="#C8581E"
          />

          {modelUrl && (
            <Suspense fallback={null}>
              <Model
                key={modelUrl}
                url={modelUrl}
                showLandscaping={showLandscaping}
                finishTheme={finishTheme}
                finishOverrides={finishOverrides}
                onLandscapingChange={setLandscapingCount}
                onCapabilitiesChange={handleCapabilitiesChange}
                onContextTarget={setContextTarget}
                onSceneReady={handleSceneReady}
                onGroundChange={setGroundHeight}
                onCollisionChange={setCollisionObjects}
                onWallCollisionChange={setWallCollisionObjects}
              />
            </Suspense>
          )}

          <WalkControls
            collisionObjects={collisionObjects}
            wallCollisionObjects={wallCollisionObjects}
            groundHeight={groundHeight}
            mobileMode={isMobile}
            onLockChange={setIsWalking}
          />
        </Canvas>

        {!isMobile && !isWalking && modelUrl && (
          <button
            id="enter-world"
            type="button"
            title="Mouse to look · WASD or arrows to move · Space to jump · Escape to exit"
            className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-slate-950/55 px-4 py-2 text-xs font-medium text-white/75 opacity-40 shadow-lg backdrop-blur-sm transition hover:border-orange/70 hover:text-white hover:opacity-100 focus:border-orange focus:opacity-100 focus:outline-none"
          >
            Walk through <span aria-hidden="true">→</span>
          </button>
        )}

        {contextTarget && !isWalking && (
          <ContextWheel
            key={`${contextTarget.x}:${contextTarget.y}:${contextTarget.label}`}
            target={contextTarget}
            activeTheme={contextTarget.finish
              ? finishOverrides[contextTarget.finish.key] ?? finishOverrides[`category:${contextTarget.finish.category}`] ?? finishTheme
              : finishTheme}
            onApplyFinish={(theme) => {
              if (!contextTarget.finish) return;
              setFinishOverrides((current) => ({ ...current, [contextTarget.finish!.key]: theme }));
              clearUsdz();
            }}
            onModelChange={clearUsdz}
            onClose={() => setContextTarget(null)}
          />
        )}

        {isWalking && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
        )}

        {modelUrl && doorCount > 0 && !isWalking && (
          <div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-white/10 bg-slate-950/80 px-4 py-3 text-xs text-slate-300 shadow-xl backdrop-blur">
            {doorCount} interactive {doorCount === 1 ? 'door' : 'doors'} · Click a door to open
          </div>
        )}

        {isMobile && modelUrl && (
          <div className="absolute inset-x-0 bottom-4 z-20 flex items-end justify-between px-4">
            <MobileJoystick />
            <MobileControl label="Jump" keyName=" " code="Space" className="h-16 w-20 text-sm" />
          </div>
        )}

        {!isMobile && (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-slate-950/75 px-4 py-3 text-xs text-slate-300 backdrop-blur">
            <div>{fileName || 'No model loaded'}</div>
            <div className="mt-1 text-slate-500">Walk: WASD/arrows · Jump: Space (x2) · Look: mouse · Exit: Escape</div>
          </div>
        )}
      </section>
    </main>
  );
}
