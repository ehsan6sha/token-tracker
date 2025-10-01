import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ? `/${process.env.VITE_BASE_PATH}/` : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
