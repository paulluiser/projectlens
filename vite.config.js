import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { createHandlers } from './server/workspace.mjs'
import { buildInfo } from './scripts/build-info.mjs'

function workspaceApi(env) {
  const handlers = createHandlers({ env })
  const configure = server => {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0]
      if (path === '/api/workspace') return handlers.workspace(req, res)
      if (path === '/api/session') return handlers.session(req, res)
      if (path === '/api/security') return handlers.security(req, res)
      if (path === '/api/history') return handlers.history(req, res)
      if (path === '/api/presence') return handlers.presence(req, res)
      next()
    })
  }
  return { name: 'workspace-api', configureServer: configure, configurePreviewServer: configure }
}

export default defineConfig(({ mode }) => ({
  define: { __LENS_BUILD__: JSON.stringify(buildInfo()) },
  plugins: [react(), tailwindcss(), workspaceApi({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}))
