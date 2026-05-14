import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://ipmobi.net',
  output: 'static',
  build: {
    format: 'directory',
  },
})
