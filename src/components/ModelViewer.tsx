import { Grid, PointerLockControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ChangeEvent, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, Suspense, useEffect, useRef, useState } from 'react';
import { Box3, Euler, MathUtils, Object3D, Raycaster, Vector3 } from 'three';

const EYE_HEIGHT = 1.65;
const MAX_STEP_HEIGHT = 0.75;
const PLAYER_RADIUS = 0.3;

function Model({ url, onGroundChange, onCollisionChange, onWallCollisionChange }: { url: string; onGroundChange: (height: number) => void; onCollisionChange: (objects: Object3D[]) => void; onWallCollisionChange: (objects: Object3D[]) => void }) {
  const { scene } = useGLTF(url);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const bounds = new Box3().setFromObject(scene);
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
    const collectCollisionMeshes = (object: Object3D, insideCollisionGroup = false) => {
      const isCollisionGroup = insideCollisionGroup || object.name.toUpperCase().startsWith('COLLISION');
      if (isCollisionGroup && 'isMesh' in object) collisionObjects.push(object);
      const normalizedName = object.name.toLowerCase();
      const isDoorPart = /door|leaf|jamb|trim|handle|lever|rose/.test(normalizedName);
      const isWallPart = /wall|sill infill|above header/.test(normalizedName);
      if ('isMesh' in object && isWallPart && !isDoorPart) wallCollisionObjects.push(object);
      for (const child of object.children) collectCollisionMeshes(child, isCollisionGroup);
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

  return <primitive object={scene} />;
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

export default function ModelViewer() {
  const [modelUrl, setModelUrl] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [isWalking, setIsWalking] = useState(false);
  const [groundHeight, setGroundHeight] = useState(0);
  const [collisionObjects, setCollisionObjects] = useState<Object3D[]>([]);
  const [wallCollisionObjects, setWallCollisionObjects] = useState<Object3D[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const dragDepth = useRef(0);

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

  const openModelFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setFileError('That file is not a GLB model. Drop a file ending in .glb.');
      return;
    }
    setFileError('');
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

        <label className="cursor-pointer rounded bg-orange px-5 py-3 font-semibold transition hover:bg-[#a94718]">
          Open .glb
          <input className="sr-only" type="file" accept=".glb,model/gltf-binary" onChange={loadModel} />
        </label>
      </header>

      <section className="relative min-h-0 flex-1">
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
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/20 p-6">
            <button
              id="enter-world"
              className="rounded border border-white/20 bg-slate-950/85 px-7 py-4 font-semibold shadow-2xl backdrop-blur transition hover:border-orange hover:text-[#F3A06F]"
            >
              Click to walk through the model
              <span className="mt-1 block text-xs font-normal text-slate-400">
                Mouse to look · WASD/arrows to move · Space to double jump · Escape to exit
              </span>
            </button>
          </div>
        )}

        {isWalking && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
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
