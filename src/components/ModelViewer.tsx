import { DEFAULT_EYE_HEIGHT, sceneModelSpawn } from '../viewer/modelSpawn';
import { createPaintVariations } from '../viewer/paintVariations';
import { INTERACTION_DISTANCE_METERS, availableFinishThemes, cycleFinishTheme, parseModelFinish, parseModelVariant, walkAction } from '../viewer/finishControls';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { exportCustomizedGlb, snapshotModel } from '../viewer/exportModel';
import { saveModelTransfer } from '../viewer/modelTransfer';
import { parseFinishPreferences } from '../viewer/finishPreferences';
import { slideMovement } from '../viewer/walkMovement';
import DropboxModelButton from './DropboxModelButton';
import { Grid, PointerLockControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ChangeEvent, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Color, Euler, Group, Material, MeshBasicMaterial, MathUtils, Mesh, MeshStandardMaterial, Object3D, Quaternion, Raycaster, Vector2, Vector3 } from 'three';

const EYE_HEIGHT = DEFAULT_EYE_HEIGHT;
const MAX_STEP_HEIGHT = 0.75;

type FinishTheme = string;

type FinishOption = {
  key: string;
  category: string;
  surface: string;
  label: string;
  samples?: Partial<Record<FinishTheme, { color: string; texture?: string; label: string }>>;
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

const finishCategory = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes('counter')) return 'countertops';
  if (normalized.includes('cabinet')) return 'cabinets';
  if (normalized.includes('floor')) return 'flooring';
  if (normalized.includes('wall')) return 'walls';
  if (normalized.includes('ceiling')) return 'ceilings';
  return ['doors', 'trim', 'roof', 'siding'].find((category) => normalized.includes(category)) ?? 'default';
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

function Model({ url, showLandscaping, finishTheme, finishOverrides, onLandscapingChange, onCapabilitiesChange, onSceneReady, onGroundChange, onCollisionChange, onWallCollisionChange, onWalkFinishChange, onApplyWalkFinish, mobileMode }: { url: string; showLandscaping: boolean; finishTheme: FinishTheme; finishOverrides: Record<string, FinishTheme>; onLandscapingChange: (count: number) => void; onCapabilitiesChange: (doors: number, finishes: FinishOption[]) => void; onContextTarget: (target: ContextTarget | null) => void; onSceneReady: (scene: Object3D | null) => void; onGroundChange: (height: number) => void; onCollisionChange: (objects: Object3D[]) => void; onWallCollisionChange: (objects: Object3D[]) => void; onWalkFinishChange: (finish: FinishOption | null) => void; onApplyWalkFinish: (key: string, theme: FinishTheme) => void; mobileMode: boolean }) {
  const { scene } = useGLTF(url);
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const isSceneLocked = () => Boolean(document.pointerLockElement && (document.pointerLockElement === canvas || document.pointerLockElement.contains(canvas)));
  const walkFinish = useRef<FinishOption | null>(null);
  const highlight = useRef(new Group());
  const highlighted = useRef<Array<{ source: Mesh; overlay: Mesh }>>([]);
  const highlightSignature = useRef('');
  const highlightMaterial = useMemo(() => new MeshBasicMaterial({ color: '#f1e6d2', toneMapped: false, transparent: true, opacity: 0.14, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), []);
  const hiddenHighlightMaterial = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => { highlightMaterial.dispose(); hiddenHighlightMaterial.dispose(); }, [highlightMaterial, hiddenHighlightMaterial]);
  const finishMode = useRef(false);
  const previewedFinishKey = useRef<string | null>(null);
  const heldShifts = useRef(new Set<string>());
  const wheelProgress = useRef(0);
  const lastWheelChange = useRef(0);
  const doors = useRef<DoorState[]>([]);
  const interactiveRay = useRef(new Raycaster());
  const originalMaterials = useRef(new Map<string, { material: MeshStandardMaterial; color: Color; roughness: number; metalness: number; category: string }>());
  const finishTargets = useRef<Array<{ mesh: Mesh; index: number; original: Material; category: string; surface: string }>>([]);
  const finishVariants = useRef(new Map<string, Material>());
  const availableFinishes = useRef<FinishOption[]>([]);

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

    const frontSpawn = sceneModelSpawn(scene);
    if (frontSpawn) {
      camera.position.fromArray(frontSpawn.position);
      camera.position.y += EYE_HEIGHT;
      camera.lookAt(camera.position.clone().add(new Vector3().fromArray(frontSpawn.direction)));
    } else {
      camera.position.set(center.x, walkingHeight, bounds.max.z + approachDistance);
      camera.lookAt(center.x, walkingHeight, center.z);
    }
    camera.updateProjectionMatrix();
    onGroundChange(groundHeight);

    const collisionObjects: Object3D[] = [];
    const wallCollisionObjects: Object3D[] = [];
    const collectCollisionMeshes = (object: Object3D, insideCollisionGroup = false, insideInteractiveDoor = false) => {
      if (isInsideNamedHierarchy(object, 'MATERIAL_LIBRARY') || object.userData.excludeFromCollision) return;
      const isCollisionGroup = insideCollisionGroup || object.name.toUpperCase().startsWith('COLLISION');
      const isInteractiveDoor = insideInteractiveDoor || object.name.toUpperCase().includes('DOOR_SWING');
      const normalizedName = object.name.toLowerCase();
      const isWalkable = /floor|stair.*tread|tread.*stair|landing/.test(normalizedName) || Boolean(object.userData.walkable);
      if ('isMesh' in object && (isCollisionGroup || (isWalkable && !isInteractiveDoor))) collisionObjects.push(object);
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
    const modelThemes = new Set<FinishTheme>(['original']);
    scene.traverse((object) => {
      if (object.name.toUpperCase().includes('MATERIAL_LIBRARY')) object.visible = false;
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const variant = parseModelVariant(material.name);
        if (variant) {
          const category = finishCategory(variant.category);
          variants.set(`${variant.theme}:${category}:${variant.surface}`, material);
          modelThemes.add(variant.theme);
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
          const isDoorFinish = isInsideNamedHierarchy(object, 'DOOR_SWING')
            && !/glass|glaz|handle|hardware|hinge|lever|lock|rose|jamb|casing|frame/i.test(`${object.name} ${material.name}`)
            && !(material instanceof MeshStandardMaterial && material.transparent && material.opacity < 0.95);
          if (material.name.toUpperCase().includes('FINISH_') || normalizedName.includes('FINISH_') || isDoorFinish) {
            detectedMaterials.add(material);
            const taggedFinish = material.name.toUpperCase().includes('FINISH_') || normalizedName.includes('FINISH_');
            const explicitFinish = parseModelFinish(material.name) ?? parseModelFinish(object.name);
            const category = explicitFinish ? finishCategory(explicitFinish.category) : taggedFinish ? finishCategory(`${object.name} ${material.name}`) : 'doors';
            const sourceName = material.name.toUpperCase().startsWith('FINISH_') ? material.name : isDoorFinish ? `Door ${material.name || object.name}` : object.name;
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
    const thumbnails = new Map<string, string | undefined>();
    const sampleMaterial = (material: Material, theme: FinishTheme, surfaceLabel: string) => {
      const standard = material instanceof MeshStandardMaterial ? material : undefined;
      const map = standard?.map;
      if (map && !thumbnails.has(map.uuid)) {
        let thumbnail: string | undefined;
        try {
          const image = map.image as CanvasImageSource;
          const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
          const context = canvas.getContext('2d');
          if (context && image) { context.drawImage(image, 0, 0, 64, 64); thumbnail = canvas.toDataURL(); }
        } catch { /* A solid material sample remains available for unsupported textures. */ }
        thumbnails.set(map.uuid, thumbnail);
      }
      const paletteLabel = theme.replace(/^viewer:/, 'Studio · ').replace(/^model:/, '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
      return { color: `#${standard?.color.getHexString() ?? '94a3b8'}`, texture: map ? thumbnails.get(map.uuid) : undefined, label: `${paletteLabel} · ${surfaceLabel || 'Material'}` };
    };
    const viewerMaterials: Material[] = [];
    const addedGroups = new Set<string>();
    targets.forEach(({ category, surface }) => {
      const key = `${category}:${surface}`;
      if (addedGroups.has(key)) return;
      addedGroups.add(key);
      const base = variants.get(`model:warm_white:${category}:${surface}`) ?? variants.get(`model:warm_white:${category}:*`);
      createPaintVariations(category, base).forEach(({ theme, material }) => {
        variants.set(`${theme}:${category}:${surface}`, material);
        modelThemes.add(theme);
        viewerMaterials.push(material);
      });
    });
    const options = targets.map(({ original, category, surface }) => {
      const metadata = original.userData?.tddFinish as { label?: string } | undefined;
      const label = metadata?.label ?? surface.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
      return {
        key: `${category}:${surface}`,
        category,
        surface,
        samples: Object.fromEntries(Array.from(modelThemes).flatMap((theme) => {
          const variant = theme === 'original' ? undefined : variants.get(`${theme}:${category}:${surface}`) ?? variants.get(`${theme}:${category}:*`);
          if (theme !== 'original' && !variant) return [];
          return [[theme, sampleMaterial(variant ?? original, theme, label)]];
        })) as FinishOption['samples'],
        label,
      };
    }).filter((option, index, all) => all.findIndex((candidate) => candidate.key === option.key) === index);
    availableFinishes.current = options;
    onCapabilitiesChange(detectedDoors.length, options);
    return () => {
      targets.forEach(({ mesh, index, original }) => {
        if (Array.isArray(mesh.material)) mesh.material[index] = original;
        else mesh.material = original;
      });
      viewerMaterials.forEach((material) => material.dispose());
      doors.current = [];
      finishTargets.current = [];
      availableFinishes.current = [];
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
      const nextMaterial = variant ?? original;
      if (Array.isArray(mesh.material)) mesh.material[index] = nextMaterial;
      else mesh.material = nextMaterial;
    });
    originalMaterials.current.forEach(({ material, color, roughness, metalness }) => {
      material.color.copy(color);
      material.roughness = roughness;
      material.metalness = metalness;
      material.needsUpdate = true;
    });
  }, [finishOverrides, finishTheme]);

  useEffect(() => {
    const clearSelection = () => {
      finishMode.current = false;
      previewedFinishKey.current = null;
      heldShifts.current.clear();
      walkFinish.current = null;
      wheelProgress.current = 0;
      onWalkFinishChange(null);
    };
    const interact = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable=true]')) return;
      const action = walkAction(event.code || (event.key === 'Shift' ? 'Shift' : `Key${event.key.toUpperCase()}`));
      if ((!mobileMode && !isSceneLocked()) || !action || event.repeat) return;
      event.preventDefault();
      if (action === 'finish') {
        if (!finishMode.current) previewedFinishKey.current = null;
        heldShifts.current.add(event.code || 'Shift');
        finishMode.current = true;
        return;
      }
      interactiveRay.current.setFromCamera(new Vector2(0, 0), camera);
      interactiveRay.current.far = INTERACTION_DISTANCE_METERS;
      // Only the nearest visible surface is reachable; never select through a wall.
      const hit = interactiveRay.current.intersectObjects(scene.children, true).find((candidate) => {
        let object: Object3D | null = candidate.object;
        while (object) {
          if (!object.visible) return false;
          object = object.parent;
        }
        return true;
      });
      if (!hit) return;
      toggleDoor(hit.object);
    };
    const releaseShift = (event: KeyboardEvent) => {
      if (walkAction(event.code || event.key) !== 'finish') return;
      heldShifts.current.delete(event.code || 'Shift');
      if (!heldShifts.current.size) clearSelection();
    };
    const visibilityChange = () => { if (document.hidden) clearSelection(); };

    const scroll = (event: WheelEvent) => {
      const finish = walkFinish.current;
      const wheelDelta = event.deltaY || event.deltaX;
      if (!finishMode.current || !isSceneLocked() || !finish || event.ctrlKey || !wheelDelta) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheelChange.current < 180) return;
      const delta = wheelDelta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      if (Math.sign(delta) !== Math.sign(wheelProgress.current)) wheelProgress.current = 0;
      wheelProgress.current += delta;
      if (Math.abs(wheelProgress.current) < 40) return;
      const current = finishOverrides[finish.key] ?? finishOverrides[`category:${finish.category}`] ?? finishTheme;
      const direction = wheelProgress.current > 0 ? 1 : -1;
      onApplyWalkFinish(finish.key, cycleFinishTheme(current, direction, availableFinishThemes(finish.samples)));
      wheelProgress.current = 0;
      lastWheelChange.current = now;
    };
    const unlock = () => {
      if (!mobileMode && !isSceneLocked()) clearSelection();
    };
    const cycleTouchFinish = (event: Event) => {
      const finish = walkFinish.current;
      if (!mobileMode || !finish) return;
      const direction = (event as CustomEvent<number>).detail;
      const current = finishOverrides[finish.key] ?? finishOverrides[`category:${finish.category}`] ?? finishTheme;
      onApplyWalkFinish(finish.key, cycleFinishTheme(current, direction, availableFinishThemes(finish.samples)));
    };
    const previewFinish = (event: Event) => {
      previewedFinishKey.current = (event as CustomEvent<string>).detail;
      highlight.current.visible = false;
    };
    window.addEventListener('viewer-preview-finish', previewFinish);
    window.addEventListener('viewer-clear-finish', clearSelection);
    window.addEventListener('viewer-cycle-finish', cycleTouchFinish);
    window.addEventListener('keydown', interact);
    window.addEventListener('keyup', releaseShift);
    window.addEventListener('blur', clearSelection);
    document.addEventListener('visibilitychange', visibilityChange);
    canvas.addEventListener('wheel', scroll, { passive: false });
    document.addEventListener('pointerlockchange', unlock);
    return () => {
      window.removeEventListener('viewer-preview-finish', previewFinish);
      window.removeEventListener('viewer-clear-finish', clearSelection);
      window.removeEventListener('viewer-cycle-finish', cycleTouchFinish);
      window.removeEventListener('keydown', interact);
      window.removeEventListener('keyup', releaseShift);
      window.removeEventListener('blur', clearSelection);
      document.removeEventListener('visibilitychange', visibilityChange);
      canvas.removeEventListener('wheel', scroll);
      document.removeEventListener('pointerlockchange', unlock);
    };
  });

  useEffect(() => () => onWalkFinishChange(null), [onWalkFinishChange]);

  useFrame((_, delta) => {
    let aimed: Object3D | null = null;
    let materialIndex = 0;
    if (finishMode.current && (mobileMode || isSceneLocked())) {
      interactiveRay.current.setFromCamera(new Vector2(0, 0), camera);
      interactiveRay.current.far = INTERACTION_DISTANCE_METERS;
      const hit = interactiveRay.current.intersectObjects(scene.children, true).find((candidate) => {
        let object: Object3D | null = candidate.object;
        while (object) { if (!object.visible) return false; object = object.parent; }
        return true;
      });
      aimed = hit?.object ?? null;
      materialIndex = hit?.face?.materialIndex ?? 0;
    }
    const target = finishTargets.current.find((candidate) => candidate.mesh === aimed && candidate.index === materialIndex);
    const nextFinish = target ? availableFinishes.current.find((option) => option.key === `${target.category}:${target.surface}`) ?? null : null;
    if (nextFinish?.key !== walkFinish.current?.key) {
      previewedFinishKey.current = null;
      walkFinish.current = nextFinish;
      wheelProgress.current = 0;
      lastWheelChange.current = 0;
      onWalkFinishChange(nextFinish);
    }
    const selectedKey = finishMode.current ? walkFinish.current?.key : undefined;
    highlight.current.visible = Boolean(selectedKey) && previewedFinishKey.current !== selectedKey;
    const sources = selectedKey
      ? [...new Set(finishTargets.current.filter((target) => `${target.category}:${target.surface}` === selectedKey).map((target) => target.mesh))]
      : [];
    const signature = `${selectedKey ?? 'hover'}:${sources.map((mesh) => mesh.uuid).join(',')}`;
    if (signature !== highlightSignature.current) {
      highlight.current.clear();
      highlighted.current = sources.map((source) => {
        const materials = Array.isArray(source.material) ? source.material.map((_, index) =>
          !selectedKey || finishTargets.current.some((target) => target.mesh === source && target.index === index && `${target.category}:${target.surface}` === selectedKey)
            ? highlightMaterial : hiddenHighlightMaterial) : highlightMaterial;
        const overlay = new Mesh(source.geometry, materials);
        overlay.matrixAutoUpdate = false;
        overlay.raycast = () => {};
        highlight.current.add(overlay);
        return { source, overlay };
      });
      highlightMaterial.opacity = 0.14;
      highlight.current.visible = Boolean(selectedKey) && previewedFinishKey.current !== selectedKey;
      highlightSignature.current = signature;
    }
    highlighted.current.forEach(({ source, overlay }) => {
      source.updateWorldMatrix(true, false);
      overlay.matrix.copy(source.matrixWorld);
      let object: Object3D | null = source;
      overlay.visible = true;
      while (object) { if (!object.visible) overlay.visible = false; object = object.parent; }
    });
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

  return <><primitive object={highlight.current} /><primitive object={scene} /></>;
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

function WalkControls({ frozen, collisionObjects, wallCollisionObjects, groundHeight, mobileMode, onLockChange }: { frozen: boolean; collisionObjects: Object3D[]; wallCollisionObjects: Object3D[]; groundHeight: number; mobileMode: boolean; onLockChange: (locked: boolean) => void }) {
  const canvas = useThree((state) => state.gl.domElement);
  const keys = useRef(new Set<string>());
  const isLocked = useRef(false);
  const verticalVelocity = useRef(0);
  const jumpCount = useRef(0);
  const grounded = useRef(true);
  const groundRay = useRef(new Raycaster());

  useEffect(() => {
    isLocked.current = mobileMode;
    if (mobileMode) onLockChange(true);
  }, [mobileMode, onLockChange]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (frozen) return;
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
  }, [frozen]);

  useEffect(() => {
    const blockPointerSpike = (event: MouseEvent) => {
      if (isLocked.current && (Math.abs(event.movementX) > 250 || Math.abs(event.movementY) > 250)) {
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('mousemove', blockPointerSpike, true);
    return () => document.removeEventListener('mousemove', blockPointerSpike, true);
  }, []);

  useEffect(() => { if (frozen) keys.current.clear(); }, [frozen]);

  useFrame(({ camera }, delta) => {
    if (frozen) return;
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

        camera.position.copy(slideMovement(camera.position, movement, wallCollisionObjects));
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
          domElement={canvas}
          selector="#model-scene canvas"
          pointerSpeed={frozen ? 0 : 1}
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
      <TouchLookControls enabled={mobileMode && !frozen} />
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
      className="relative h-24 w-24 shrink-0 touch-none select-none rounded-full border border-white/25 bg-slate-950/65 shadow-2xl backdrop-blur"
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

function FinishScrollWheel({ finish, activeTheme, walking, onCycle, onApply, onClose }: {
  finish: FinishOption; activeTheme: FinishTheme; walking: boolean;
  onCycle: (direction: number) => void; onApply: (theme: FinishTheme) => void; onClose: () => void;
}) {
  const available = availableFinishThemes(finish.samples);
  const active = available.includes(activeTheme) ? activeTheme : 'original';
  const index = Math.max(0, available.indexOf(active));
  const ordered = available.length >= 3 ? [-1, 0, 1].map((offset) => ({ theme: available[(index + offset + available.length) % available.length], selected: offset === 0 })) : available.map((theme) => ({ theme, selected: theme === active }));
  return <section aria-label="Finish sample wheel" title={finish.label} className="flex flex-col items-center gap-3 py-3">
    <button type="button" aria-label="Close finish selection" title="Close finishes" onClick={onClose} className="grid h-11 w-11 place-items-center text-xl text-white/60 hover:text-white">×</button>
    {available.length > 1 && <button type="button" aria-label="Previous finish" onClick={() => onCycle(-1)} className="grid h-11 w-11 place-items-center text-white/60 hover:text-white"><ChevronUp className="h-4 w-4" /></button>}
    <div className="flex flex-col items-center gap-3">
      {ordered.map(({ theme, selected }) => {
        const sample = finish.samples?.[theme];
        if (!sample) return null;
        return <button type="button" key={theme} title={sample.label} aria-pressed={selected} aria-label={`Apply ${sample.label}`} onClick={() => onApply(theme)} className={`h-11 w-11 rounded-xl border transition-all duration-150 ${selected ? 'scale-110 border-white ring-2 ring-white/40 ring-offset-2 ring-offset-transparent' : 'border-white/15 opacity-55 hover:opacity-100'}`} style={{ backgroundColor: sample.color, backgroundImage: sample.texture ? `url(${sample.texture})` : undefined, backgroundSize: 'cover', backgroundBlendMode: 'multiply' }} />;
      })}
    </div>
    {available.length > 1 && <button type="button" aria-label="Next finish" onClick={() => onCycle(1)} className="grid h-11 w-11 place-items-center text-white/60 hover:text-white"><ChevronDown className="h-4 w-4" /></button>}
    <p className="max-w-full px-1.5 text-center text-[10px] leading-4 text-white/70" aria-label="Active finish">{finish.samples?.[active]?.label.split(' · ').slice(0, active.startsWith('viewer:') ? 2 : 1).join(' · ')}</p>
    <span className="text-[10px] tabular-nums text-white/45">{index + 1} / {available.length}</span>
    <span className="sr-only">{finish.label}. {walking ? 'Hold Shift and scroll to compare. Release Shift to close.' : 'Choose a finish.'} Changes surfaces sharing this finish. {available.length === 1 ? 'No alternate finishes supplied.' : ''}</span>
    <p className="sr-only" role="status">Applied: {finish.samples?.[active]?.label}</p>
  </section>;
}

type ViewerProject = { id: string; label: string; modelUrl: string | null; version: string };

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
  const [showSettings, setShowSettings] = useState(false);
  const [surfaceSearch, setSurfaceSearch] = useState('');
  const [walkFinish, setWalkFinish] = useState<FinishOption | null>(null);
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);
  const [exportScene, setExportScene] = useState<Object3D | null>(null);
  const [usdzUrl, setUsdzUrl] = useState('');
  const [isExportingUsdz, setIsExportingUsdz] = useState(false);
  const [usdzError, setUsdzError] = useState('');
  const dragDepth = useRef(0);
  const requestedProject = useRef(new URLSearchParams(window.location.search).get('project')).current;
  const [linkedProject, setLinkedProject] = useState<ViewerProject | null>(null);
  const [preferenceKey, setPreferenceKey] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [isSendingToSite, setIsSendingToSite] = useState(false);
  const [siteError, setSiteError] = useState('');

  useEffect(() => {
    if (!requestedProject) return;
    let cancelled = false;
    void fetch('/viewer-projects.json').then((response) => {
      if (!response.ok) throw new Error('Project models could not be loaded.');
      return response.json() as Promise<ViewerProject[]>;
    }).then((catalog) => {
      if (cancelled) return;
      const project = catalog.find((entry) => entry.id === requestedProject);
      if (!project) { setFileError('This project link is not recognized.'); return; }
      setLinkedProject(project);
      if (!project.modelUrl) { setFileError(`${project.label}: the latest model has not been added yet. You can open its GLB below.`); return; }
      setFileName(project.label);
      setPreferenceKey(`tdd-finishes:project:${project.id}:${project.version}`);
      setModelUrl(project.modelUrl);
    }).catch(() => { if (!cancelled) setFileError('Project models could not be loaded. You can still open a GLB.'); });
    return () => { cancelled = true; };
  }, [requestedProject]);

  // Restore before enabling writes, so a returning customer's choices are not overwritten.
  const [loadedPreferenceKey, setLoadedPreferenceKey] = useState('');
  useEffect(() => {
    if (!preferenceKey) return;
    try {
      const saved = parseFinishPreferences(localStorage.getItem(preferenceKey));
      setFinishTheme(saved?.theme ?? 'original');
      setFinishOverrides(saved?.overrides ?? {});
      setShowLandscaping(saved?.landscaping ?? true);
      setSaveNotice(saved ? 'Saved choices restored on this device.' : 'Choices are saved on this device.');
    } catch { setSaveNotice('Browser storage is unavailable; choices will last for this visit.'); }
    setLoadedPreferenceKey(preferenceKey);
  }, [preferenceKey, modelUrl]);

  useEffect(() => {
    if (!preferenceKey || loadedPreferenceKey !== preferenceKey) return;
    try { localStorage.setItem(preferenceKey, JSON.stringify({ theme: finishTheme, overrides: finishOverrides, landscaping: showLandscaping })); }
    catch { setSaveNotice('Choices could not be saved on this device.'); }
  }, [finishTheme, finishOverrides, showLandscaping, preferenceKey, loadedPreferenceKey]);

  const resetFinishes = () => {
    setFinishTheme('original'); setFinishOverrides({}); setShowLandscaping(true);
    window.dispatchEvent(new Event('viewer-clear-finish'));
    setContextTarget(null); setWalkFinish(null); clearUsdz();
    setSaveNotice('Default finishes restored.');
  };

  const sendToSite = async () => {
    if (!exportScene || isSendingToSite) return;
    setIsSendingToSite(true); setSiteError('');
    try {
      const blob = await exportCustomizedGlb(exportScene);
      const id = await saveModelTransfer(blob, fileName.replace(/\.glb$/i, '') + '-customized.glb');
      window.location.assign(`/cesium-viewer?transfer=${encodeURIComponent(id)}`);
    } catch (error) { setSiteError(error instanceof Error ? error.message : 'The customized model could not be sent to the site viewer.'); }
    finally { setIsSendingToSite(false); }
  };

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
      const bytes = await exporter.parseAsync(snapshotModel(exportScene), {
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

    setContextTarget(null);
    setExportScene(null);
    clearUsdz();
    setDoorCount(0);
    setFinishOptions([]);
    setLoadedPreferenceKey('');
    setPreferenceKey(requestedProject
      ? `tdd-finishes:project:${requestedProject}:${linkedProject?.version ?? '1'}`
      : `tdd-finishes:file:${file.name}:${file.size}:${file.lastModified}`);
    setModelUrl(URL.createObjectURL(file));
    setFileName(linkedProject?.label ?? file.name);
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

  const selectedFinish = walkFinish ?? contextTarget?.finish;
  const selectedTheme = selectedFinish ? finishOverrides[selectedFinish.key] ?? finishOverrides[`category:${selectedFinish.category}`] ?? finishTheme : 'original';
  const applySelectedFinish = (theme: FinishTheme) => {
    if (!selectedFinish) return;
    window.dispatchEvent(new CustomEvent('viewer-preview-finish', { detail: selectedFinish.key }));
    setFinishOverrides((current) => ({ ...current, [selectedFinish.key]: theme })); clearUsdz();
  };
  const closeInspector = useCallback(() => {
    window.dispatchEvent(new Event('viewer-clear-finish')); setWalkFinish(null); setContextTarget(null); setShowSettings(false);
  }, []);
  const handleWalkLock = useCallback((locked: boolean) => {
    setIsWalking(locked);
    if (locked) closeInspector();
  }, [closeInspector]);
  const hasInspector = !selectedFinish && Boolean(contextTarget?.doorAction || showSettings);
  const toolbarButton = 'shrink-0 rounded border border-white/20 px-3 py-2 text-xs font-semibold transition hover:border-orange disabled:opacity-40';

  return <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-950 text-white" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5">
      <div className="min-w-0"><a href="/" className="text-xs text-[#F3A06F]">← Timpson Drafting &amp; Design</a><h1 className="mt-1 truncate text-sm font-semibold sm:text-lg">{fileName || '3D model viewer'}</h1></div>
      <button type="button" aria-expanded={showSettings} aria-controls="viewer-inspector" onClick={() => { closeInspector(); setShowSettings(!showSettings); }} className={toolbarButton}>Model tools</button>
    </header>
    {modelUrl && <nav aria-label="Model actions" className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 px-3 py-2 sm:px-5">
      {isWalking && !isMobile && <span className="flex items-center text-xs text-slate-400">Walking · Escape to exit</span>}
      <button type="button" disabled={!exportScene || isSendingToSite} onClick={sendToSite} className={toolbarButton}>{isSendingToSite ? 'Preparing…' : 'Place at an address'}</button>
      {canOpenAppleAr && (usdzUrl ? <a rel="ar" href={usdzUrl} className={toolbarButton}><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="" className="hidden" />Open in AR</a> : <button type="button" disabled={!exportScene || isExportingUsdz} onClick={prepareUsdz} className={toolbarButton}>{isExportingUsdz ? 'Preparing AR…' : 'Prepare AR'}</button>)}
    </nav>}
    {(siteError || usdzError || fileError) && <p className="shrink-0 border-b border-red-400/20 px-3 py-2 text-xs text-red-200" role="alert">{siteError || usdzError || fileError}</p>}
    <div className="flex min-h-0 flex-1">
      <section id="model-scene" aria-label="Model scene" className="relative min-h-0 min-w-0 flex-1">
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
                onContextTarget={(target) => { setContextTarget(target); setShowSettings(false); }}
                onSceneReady={handleSceneReady}
                onGroundChange={setGroundHeight}
                onCollisionChange={setCollisionObjects}
                onWallCollisionChange={setWallCollisionObjects}
                mobileMode={isMobile}
                onWalkFinishChange={setWalkFinish}
                onApplyWalkFinish={(key, theme) => {
                  window.dispatchEvent(new CustomEvent('viewer-preview-finish', { detail: key }));
                  setFinishOverrides((current) => ({ ...current, [key]: theme }));
                  clearUsdz();
                }}
              />
            </Suspense>
          )}

          {exportScene && <WalkControls
            frozen={Boolean(contextTarget?.finish)}
            collisionObjects={collisionObjects}
            wallCollisionObjects={wallCollisionObjects}
            groundHeight={groundHeight}
            mobileMode={isMobile}
            onLockChange={handleWalkLock}
          />}
        </Canvas>
        {!modelUrl && <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center"><div className="max-w-sm"><p className="text-lg font-medium">Open a GLB model to enter the scene</p><p className="mt-3 text-sm leading-6 text-slate-400">Use Model tools to open a file from your device or Dropbox, or drop a GLB here.</p></div></div>}
        {isDraggingFile && <div className="pointer-events-none absolute inset-3 grid place-items-center rounded border-2 border-dashed border-orange bg-slate-950/85 text-lg">Drop GLB to open</div>}
        {selectedFinish && <div aria-label="Finish samples" className="absolute right-3 top-1/2 z-10 max-h-[calc(100%_-_1.5rem)] w-16 -translate-y-1/2 overflow-y-auto overscroll-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:right-5">
          <FinishScrollWheel finish={selectedFinish} activeTheme={selectedTheme} walking={isWalking && !isMobile} onApply={applySelectedFinish} onCycle={(direction) => applySelectedFinish(cycleFinishTheme(selectedTheme, direction, availableFinishThemes(selectedFinish.samples)))} onClose={closeInspector} />
        </div>}
        {isWalking && <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />}
      </section>
      {hasInspector && <aside id="viewer-inspector" aria-label="Model inspector" className="w-40 shrink-0 overflow-y-auto overscroll-contain border-l border-white/10 bg-slate-900 sm:w-64 lg:w-72">
        {contextTarget?.doorAction ? <div className="p-3"><h2 className="text-sm font-semibold">Door controls</h2><button type="button" onClick={() => { contextTarget.doorAction?.(); clearUsdz(); }} className={`${toolbarButton} mt-3 w-full`}>Open / close door</button><button type="button" onClick={closeInspector} className={`${toolbarButton} mt-3 w-full`}>Close panel</button></div> : <div className="space-y-4 p-3 sm:p-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Model tools</h2><button type="button" aria-label="Close model tools" onClick={closeInspector} className="min-h-10 min-w-10">×</button></div>
          <DropboxModelButton onFile={openModelFile} />
          <label className="block cursor-pointer rounded border border-white/20 p-3 text-center text-xs">Open .glb<input className="sr-only" type="file" accept=".glb,model/gltf-binary" onChange={loadModel} /></label>
          {modelUrl && <>
            {landscapingCount > 0 && <label className="flex items-center justify-between gap-2 text-xs">Landscaping<input type="checkbox" checked={showLandscaping} onChange={(event) => { setShowLandscaping(event.target.checked); clearUsdz(); }} className="h-5 w-5 accent-orange" /></label>}
            {finishOptions.length > 0 && <><label className="block text-xs">Find a surface<input type="search" value={surfaceSearch} onChange={(event) => setSurfaceSearch(event.target.value)} placeholder="Wall, door, kitchen…" className="mt-2 w-full rounded border border-white/20 bg-slate-950 p-2" /></label><label className="block text-xs">Inspect a surface<select aria-label="Inspect model finish" value="" onChange={(event) => { const finish = finishOptions.find((option) => option.key === event.target.value); if (finish) { setContextTarget({ x: 0, y: 0, label: finish.label, finish }); setShowSettings(false); } }} className="mt-2 w-full rounded border border-white/20 bg-slate-950 p-2"><option value="">Choose surface</option>{finishOptions.filter((option) => `${option.label} ${option.category}`.toLowerCase().includes(surfaceSearch.toLowerCase())).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label></>}
            <button type="button" onClick={resetFinishes} className={`${toolbarButton} w-full whitespace-normal`}>Reset to default</button>
          </>}
          <p className="text-[11px] leading-5 text-slate-400">{doorCount > 0 && `${doorCount} interactive doors. `}{saveNotice || 'Models stay on this device.'}</p>
        </div>}
      </aside>}
    </div>
    {isMobile && modelUrl ? <footer aria-label="Walk controls" className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-3 py-2">
      <MobileJoystick />
      <div className="grid grid-cols-2 gap-2"><MobileControl label="Interact" keyName="e" code="KeyE" className="h-12 w-20 text-xs" /><MobileControl label="Hold finishes" keyName="Shift" code="ShiftLeft" className="h-12 w-20 text-xs" /><MobileControl label="Jump" keyName=" " code="Space" className="col-span-2 h-12 w-full text-xs" /></div>
    </footer> : <footer className="shrink-0 border-t border-white/10 px-3 py-2 text-[11px] leading-5 text-slate-400 sm:px-5">{isWalking ? 'WASD: move · Space: jump · E: open door · Hold Shift + scroll: finishes · Escape: exit' : 'Click scene to walk · Hold Shift + scroll: finishes · Escape: exit · Reach: 10 ft'}<span className="sr-only" role="status">{saveNotice}</span></footer>}
  </main>;
}
