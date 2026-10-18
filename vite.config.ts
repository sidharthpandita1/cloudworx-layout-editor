import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Two pages: the editor, and the model optimisation benchmark (docs/OPTIMISATION.md).
    rollupOptions: {
      input: {
        main: 'index.html',
        bench: 'model-bench.html',
      },
    },
  },
})
