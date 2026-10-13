import type { RootState } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';

// Review captures must use the same rendering path as navigation.
const renderers = new WeakMap<WebGLRenderer, () => void>();

export function registerViewerRender(gl: WebGLRenderer, render: () => void) {
  renderers.set(gl, render);
  return () => { if (renderers.get(gl) === render) renderers.delete(gl); };
}

export function renderViewerFrame({ gl, scene, camera }: Pick<RootState, 'gl' | 'scene' | 'camera'>) {
  const render = renderers.get(gl);
  if (render) render();
  else gl.render(scene, camera);
}
