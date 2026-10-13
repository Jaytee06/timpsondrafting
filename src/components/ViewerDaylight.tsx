import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Mesh, Object3D, PMREMGenerator, Vector3 } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** One cached sun shadow and a low-intensity packaged environment. */
export default function ViewerDaylight({ model, mobile, revision, tuned = true }: { model: Object3D | null; mobile: boolean; revision: unknown; tuned?: boolean }) {
  const { gl, scene } = useThree();
  const target = useMemo(() => new Object3D(), []);
  const bounds = useMemo(() => {
    const box = new Box3();
    model?.updateMatrixWorld(true);
    model?.traverse(node => {
      if (!(node instanceof Mesh)) return;
      let parent: Object3D | null = node;
      while (parent) {
        if (!parent.visible || /MATERIAL_LIBRARY|COLLISION|LANDSCAPING/i.test(parent.name)) return;
        parent = parent.parent;
      }
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      if (node.geometry.boundingBox) box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
    });
    if (box.isEmpty()) box.setFromCenterAndSize(new Vector3(), new Vector3(20, 10, 20));
    const center = box.getCenter(new Vector3());
    const radius = Math.max(5, box.getSize(new Vector3()).length() / 2);
    target.position.copy(center);
    return { center, radius };
  }, [model, target]);
  useEffect(() => {
    const originalEnvironment = scene.environment, intensity = scene.environmentIntensity;
    const generator = new PMREMGenerator(gl), room = new RoomEnvironment();
    const environment = generator.fromScene(room);
    room.dispose(); generator.dispose();
    scene.environment = environment.texture; scene.environmentIntensity = .15;
    return () => { scene.environment = originalEnvironment; scene.environmentIntensity = intensity; environment.dispose(); };
  }, [gl, scene]);
  useEffect(() => { scene.environmentIntensity = tuned ? .12 : .15; }, [scene, tuned]);
  useEffect(() => {
    const autoUpdate = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.autoUpdate = autoUpdate; gl.shadowMap.needsUpdate = true; };
  }, [gl]);
  useEffect(() => {
    const original: { mesh: Mesh; cast: boolean; receive: boolean }[] = [];
    model?.traverse(node => {
      if (!(node instanceof Mesh)) return;
      original.push({ mesh: node, cast: node.castShadow, receive: node.receiveShadow });
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      node.castShadow = materials.some(material => !material.transparent || material.opacity >= .95);
      node.receiveShadow = true;
    });
    gl.shadowMap.needsUpdate = true;
    return () => { original.forEach(({ mesh, cast, receive }) => { mesh.castShadow = cast; mesh.receiveShadow = receive; }); gl.shadowMap.needsUpdate = true; };
  }, [model, gl]);
  useEffect(() => { gl.shadowMap.needsUpdate = true; }, [revision, mobile, gl, tuned]);
  const { center, radius } = bounds;
  return <>
    <primitive object={target} />
    <hemisphereLight args={['#f4f7ff', '#b9b1a4', tuned ? .48 : .65]} />
    <ambientLight intensity={tuned ? .04 : .08} />
    {/* Broad studio fill gives vertical faces different brightness indoors.
        No shadow map: deliberately a presentation cue, not a fixture simulation. */}
    <directionalLight intensity={tuned ? .6 : .35} color="#f4f7ff" target={target}
      position={[center.x - radius, center.y + radius * .6, center.z + radius * .35]} />
    <directionalLight castShadow intensity={1.8} color="#fff8ed" target={target}
      position={[center.x + radius, center.y + radius * 1.5, center.z + radius * .75]}
      shadow-mapSize={[mobile ? 1024 : 2048, mobile ? 1024 : 2048]}
      shadow-camera-left={-radius} shadow-camera-right={radius}
      shadow-camera-top={radius} shadow-camera-bottom={-radius}
      shadow-camera-near={.1} shadow-camera-far={radius * 5}
      shadow-intensity={.55}
      shadow-normalBias={.015} shadow-bias={-.0001} />
  </>;
}
