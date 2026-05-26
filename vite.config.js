import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'project-tracker' below with your actual GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/project-dashboard/',
})
