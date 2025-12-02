import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/rss': {
        target: 'https://www.mountainproject.com',
        changeOrigin: true,
        rewrite: (path) => {
          // /api/rss?params -> /rss/new?params
          const url = new URL(path, 'http://localhost')
          return `/rss/new${url.search}`
        },
      },
    },
  },
})

