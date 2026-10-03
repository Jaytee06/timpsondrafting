import { defineConfig } from 'vite';
// @ts-expect-error Local development adapter is JavaScript and excluded from the production bundle.
import { localCadPlugin } from './scripts/cad/vite-cad-plugin.mjs';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesiumStatic'),
  },
  plugins: [
    react(),
    localCadPlugin(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesiumStatic' },
        { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesiumStatic' },
        { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesiumStatic' },
        { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesiumStatic' },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
