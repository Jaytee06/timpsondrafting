import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

/** Cache contact shading after navigation settles; never rerender depth while moving. */
export default function ViewerContactShading({ mobile, revision }: { mobile: boolean; revision: unknown }) {
  const { gl, scene, camera, size } = useThree();
  const cache = useRef({ pose: '', valid: false, changedAt: 0, readyAt: 0 });
  const pass = useMemo(() => {
    const ao = new SSAOPass(scene, camera, 1, 1, mobile ? 8 : 12);
    ao.renderToScreen = true;
    ao.kernelRadius = .18;
    ao.copyMaterial.uniforms.contactStrength = { value: 0 };
    ao.copyMaterial.fragmentShader = ao.copyMaterial.fragmentShader
      .replace('uniform float opacity;', 'uniform float opacity;\nuniform float contactStrength;')
      .replace('gl_FragColor = opacity * texel;', 'gl_FragColor = vec4(mix(vec3(1.0), texel.rgb, contactStrength), 1.0);');
    return ao;
  }, [scene, camera, mobile]);
  useEffect(() => () => pass.dispose(), [pass]);
  useEffect(() => {
    const scale = Math.min(.5 * gl.getPixelRatio(), (mobile ? 512 : 768) / Math.max(size.width, size.height));
    pass.setSize(Math.max(1, Math.round(size.width * scale)), Math.max(1, Math.round(size.height * scale)));
    cache.current.valid = false;
    cache.current.changedAt = performance.now();
  }, [pass, gl, size.width, size.height, revision, mobile]);

  const composite = () => {
    if (!cache.current.valid) return;
    pass.copyMaterial.uniforms.contactStrength.value = .4 * Math.min(1, (performance.now() - cache.current.readyAt) / 180);
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(null);
    pass.fsQuad.material = pass.copyMaterial;
    pass.fsQuad.render(gl);
    gl.autoClear = autoClear;
  };
  useEffect(() => {
    const capture = () => composite();
    window.addEventListener('viewer-capture-shading', capture);
    return () => window.removeEventListener('viewer-capture-shading', capture);
  }, [pass, gl]);

  useFrame(() => {
    const now = performance.now();
    const state = cache.current;
    const pose = [...camera.position.toArray(), ...camera.quaternion.toArray(), ...(camera instanceof PerspectiveCamera ? [camera.fov, camera.aspect] : [])].join(',');
    // Doors request shadow refresh while moving; also invalidate their contact shading.
    if (pose !== state.pose || gl.shadowMap.needsUpdate) {
      state.pose = pose; state.valid = false; state.changedAt = now;
    }
    gl.setRenderTarget(null);
    gl.render(scene, camera);
    if (!state.valid && now - state.changedAt > 250) {
      if (camera instanceof PerspectiveCamera) {
        const range = camera.far - camera.near;
        pass.minDistance = .002 / range;
        pass.maxDistance = .4 / range;
      }
      pass.copyMaterial.uniforms.contactStrength.value = 0;
      pass.render(gl, pass.normalRenderTarget, pass.normalRenderTarget, 0, false);
      state.valid = true; state.readyAt = now;
    }
    composite();
  }, 1);
  return null;
}
