import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/queue-status': 'http://localhost:3001',
      '/register': 'http://localhost:3001',
      '/join-queue': 'http://localhost:3001',
      '/action': 'http://localhost:3001',
      '/my-game': 'http://localhost:3001',
      '/leave': 'http://localhost:3001',
      '/skill.md': 'http://localhost:3001',
    }
  }
})
