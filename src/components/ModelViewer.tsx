import { Grid, PointerLockControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ChangeEvent, Suspense, useEffect, useRef, useState } from 'react';
import { Box3, Vector3 } from 'three';

const EYE_HEIGHT = 1.65;

function Model({ url, onGroundChange }: { url: string; onGroundChange: (height: number) => void }) {
  const { scene } = useGLTF(url);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const bounds = new Box3().setFromObject(scene);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const groundHeight = bounds.min.y;
    const walkingHeight = groundHeight + EYE_HEIGHT;
    const approachDistance = Math.max(size.x, size.z) * 0.7;

    camera.position.set(center.x, walkingHeight, bounds.max.z + approachDistance);
    camera.lookAt(center.x, walkingHeight, center.z);
    camera.updateProjectionMatrix();
    onGroundChange(groundHeight);
  }, [camera, onGroundChange, scene]);

  return <primitive object={scene} />;
}

function WalkControls({ groundHeight, onLockChange }: { groundHeight: number; onLockChange: (locked: boolean) => void }) {
  const keys = useRef(new Set<string>());
  const isLocked = useRef(false);
  const verticalVelocity = useRef(0);
  const jumpCount = useRef(0);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      keys.current.add(event.key.toLowerCase());
      if (event.code === 'Space' && isLocked.current && !event.repeat && jumpCount.current < 2) {
        event.preventDefault();
        verticalVelocity.current = 7;
        jumpCount.current += 1;
      }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const walkingHeight = groundHeight + EYE_HEIGHT;
    verticalVelocity.current -= 18 * delta;
    camera.position.y += verticalVelocity.current * delta;
    if (camera.position.y <= walkingHeight) {
      camera.position.y = walkingHeight;
      verticalVelocity.current = 0;
      jumpCount.current = 0;
    }

    if (!isLocked.current) return;

    const forwardAmount = Number(keys.current.has('w') || keys.current.has('arrowup'))
      - Number(keys.current.has('s') || keys.current.has('arrowdown'));
    const sideAmount = Number(keys.current.has('d') || keys.current.has('arrowright'))
      - Number(keys.current.has('a') || keys.current.has('arrowleft'));
    if (!forwardAmount && !sideAmount) return;

    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const side = new Vector3().crossVectors(forward, camera.up).normalize();
    const movement = forward.multiplyScalar(forwardAmount).add(side.multiplyScalar(sideAmount));
    movement.normalize().multiplyScalar(delta * 5);
    camera.position.add(movement);
  });

  return (
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
  );
}

export default function ModelViewer() {
  const [modelUrl, setModelUrl] = useState<string>('/jacob-sweet-detail.glb');
  const [fileName, setFileName] = useState('jacob-sweet-detail.glb');
  const [isWalking, setIsWalking] = useState(false);
  const [groundHeight, setGroundHeight] = useState(0);

  useEffect(() => {
    return () => {
      if (modelUrl?.startsWith('blob:')) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  const loadModel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setModelUrl(URL.createObjectURL(file));
    setFileName(file.name);
  };

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <a href="/" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← Timpson Drafting &amp; Design
          </a>
          <h1 className="mt-1 text-xl font-semibold">3D model viewer</h1>
        </div>

        <label className="cursor-pointer rounded-lg bg-emerald-500 px-5 py-3 font-semibold transition hover:bg-emerald-600">
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
                Your file stays on this device. Use the button above, then drag to orbit, scroll to zoom,
                and right-drag to pan.
              </p>
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
            sectionColor="#10b981"
          />

          {modelUrl && (
            <Suspense fallback={null}>
              <Model key={modelUrl} url={modelUrl} onGroundChange={setGroundHeight} />
            </Suspense>
          )}

          <WalkControls groundHeight={groundHeight} onLockChange={setIsWalking} />
        </Canvas>

        {!isWalking && modelUrl && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/20 p-6">
            <button
              id="enter-world"
              className="rounded-xl border border-white/20 bg-slate-950/85 px-7 py-4 font-semibold shadow-2xl backdrop-blur transition hover:border-emerald-400 hover:text-emerald-300"
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

        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-slate-950/75 px-4 py-3 text-xs text-slate-300 backdrop-blur">
          <div>{fileName || 'No model loaded'}</div>
          <div className="mt-1 text-slate-500">Walk: WASD/arrows · Jump: Space (x2) · Look: mouse · Exit: Escape</div>
        </div>
      </section>
    </main>
  );
}
