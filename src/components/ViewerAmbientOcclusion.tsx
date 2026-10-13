import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, MeshPhysicalMaterial, Object3D } from 'three';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { registerViewerRender } from '../viewer/renderFrame';

/** Continuous, short-range contact shading, composited over the antialiased canvas. */
export default function ViewerAmbientOcclusion({ model, enabled, mobile }: { model: Object3D | null; enabled: boolean; mobile: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const render = useRef<(() => void) | null>(null);
  const pass = useRef<GTAOPass | null>(null);
  const active = useRef(enabled);
  useEffect(() => { active.current = enabled; }, [enabled]);

  useEffect(() => {
    if (!model) return;
    // Half-float render targets are required by the bundled GTAO implementation.
    const ao = gl.extensions.has('EXT_color_buffer_float') ? new GTAOPass(scene, camera, 1, 1) : null;
    pass.current = ao;
    if (ao) {
      ao.output = GTAOPass.OUTPUT.Off;
      ao.updateGtaoMaterial({ radius: .12, thickness: .06, distanceFallOff: 1, scale: 1, samples: mobile ? 8 : 12, screenSpaceRadius: false });
      ao.updatePdMaterial({ radius: 3, samples: mobile ? 8 : 12, rings: 2, depthPhi: 4, normalPhi: 8 });
      ao.blendMaterial.uniforms.intensity.value = .32;
    }
    const meshes: Mesh[] = [];
    model.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
    const draw = () => {
      gl.render(scene, camera);
      if (!ao || !active.current) return;
      const hidden: Object3D[] = [];
      const hide = (object: Object3D) => { if (object.visible) { hidden.push(object); object.visible = false; } };
      // The grid, selection overlay and glass should not become opaque AO blockers.
      scene.children.forEach(child => { if (child !== model && !child.getObjectById(model.id)) hide(child); });
      meshes.forEach(mesh => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (materials.every(material => !material.depthWrite || (material.transparent && material.opacity < .95) || (material instanceof MeshPhysicalMaterial && material.transmission > 0))) hide(mesh);
      });
      const target = gl.getRenderTarget(), override = scene.overrideMaterial;
      const shadows = gl.shadowMap.enabled;
      try {
        gl.shadowMap.enabled = false;
        // OUTPUT.Off calculates depth/normals, AO and denoise without copying color.
        ao.render(gl, ao.gtaoRenderTarget, ao.gtaoRenderTarget, 0, false);
        ao.blendMaterial.uniforms.tDiffuse.value = ao.gtaoMap;
        ao.renderPass(gl, ao.blendMaterial, target);
      } finally {
        hidden.forEach(object => { object.visible = true; });
        scene.overrideMaterial = override;
        gl.shadowMap.enabled = shadows;
        gl.setRenderTarget(target);
      }
    };
    render.current = draw;
    const unregister = registerViewerRender(gl, draw);
    return () => {
      unregister(); render.current = null; pass.current = null;
      if (ao) {
        // r170's dispose omits these two materials and the depth texture.
        ao.blendMaterial.dispose(); ao.gtaoMaterial.dispose(); ao.depthTexture.dispose(); ao.dispose();
      }
    };
  }, [gl, scene, camera, model, mobile]);

  useEffect(() => {
    const ao = pass.current;
    if (!ao) return;
    // Independent of device DPR: bound pixel work while retaining the main canvas resolution.
    const scale = Math.min(.5, (mobile ? 480 : 720) / Math.max(size.width, size.height));
    ao.setSize(Math.max(1, Math.round(size.width * scale)), Math.max(1, Math.round(size.height * scale)));
  }, [size.width, size.height, model, mobile, camera, gl, scene]);

  useFrame(() => {
    if (render.current) render.current();
    else gl.render(scene, camera);
  }, 1);
  return null;
}
