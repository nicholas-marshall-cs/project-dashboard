import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'project-dashboard' with your exact GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/project-dashboard/',
})
