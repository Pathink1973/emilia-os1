export default {
  envPrefix: 'VITE_',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
}
