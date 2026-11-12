import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { createHandlers } from './server/workspace.mjs'

function workspaceApi(env) {
  const handlers = createHandlers({ env })
  const configure = server => {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0]
      if (path === '/api/workspace') return handlers.workspace(req, res)
      if (path === '/api/session') return handlers.session(req, res)
      next()
    })
  }
  return { name: 'workspace-api', configureServer: configure, configurePreviewServer: configure }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), workspaceApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
  optimizeDeps: { include: ['three'] },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}))
