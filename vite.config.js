import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: 'VITE_',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
});
