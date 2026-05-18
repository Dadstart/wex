import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5118',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  title: 'API unavailable',
                  detail:
                    'Start the backend with: dotnet run --project server',
                }),
              )
            }
          })
        },
      },
    },
  },
  build: {
    outDir: '../server/wwwroot',
    emptyOutDir: true,
  },
})
