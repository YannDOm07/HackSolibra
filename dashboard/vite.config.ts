import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// En production, le tableau de bord est servi par le serveur Python sous /tableau/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tableau/' : '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: true, port: 5173 },
}))
