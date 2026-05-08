import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If your GitHub repo name is different, change this base path.
export default defineConfig({
  plugins: [react()],
  base: '/acoustic-metamaterial-lab/',
})
