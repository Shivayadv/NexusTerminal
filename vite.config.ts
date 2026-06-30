import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig(({ command }) => {
  const isServe = command === 'serve'
  const isBuild = command === 'build'

  return {
    plugins: [
      react(),
      electron([
        {
          entry: 'electron/main/index.ts',
          onstart(options) {
            options.startup()
          },
          vite: {
            build: {
              sourcemap: isServe,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: ['electron', 'better-sqlite3', 'node-pty'],
              },
            },
          },
        },
        {
          entry: 'electron/preload/index.ts',
          onstart(options) {
            options.reload()
          },
          vite: {
            build: {
              sourcemap: isServe,
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      ]),
      renderer(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@app': resolve(__dirname, 'src/app'),
        '@components': resolve(__dirname, 'src/components'),
        '@features': resolve(__dirname, 'src/features'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@core': resolve(__dirname, 'src/core'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@electron': resolve(__dirname, 'electron'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
  }
})
