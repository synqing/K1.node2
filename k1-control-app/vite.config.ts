import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';
  import fs from 'fs';

  export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-artifacts',
      configureServer(server) {
        const artifactsDir = path.resolve(__dirname, '../tools/artifacts');
        try { if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true }); } catch {}
        server.middlewares.use('/artifacts', (req, res, next) => {
          const reqPath = req.url || '/';
          const fileRel = reqPath.replace(/^\//, '');
          const fileAbs = path.join(artifactsDir, fileRel);
          if (fs.existsSync(fileAbs) && fs.statSync(fileAbs).isFile()) {
            const ext = path.extname(fileAbs).toLowerCase();
            const type = ext === '.json' ? 'application/json'
              : ext === '.dot' ? 'text/vnd.graphviz'
              : ext === '.txt' ? 'text/plain'
              : 'application/octet-stream';
            res.setHeader('Content-Type', type);
            res.end(fs.readFileSync(fileAbs));
            return;
          }
          next();
        });
        const originalPrint = server.printUrls?.bind(server);
        server.printUrls = () => {
          if (originalPrint) originalPrint();
          const info = server.config.logger?.info ?? console.log;
          info(`  Artifacts served from ${artifactsDir} at /artifacts`);
        };
      },
    },
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('@radix-ui')) return 'radix-vendor';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false, // Disable error overlay to reduce visual noise
    },
    fs: {
      strict: false,
      allow: ['..']
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    reporters: ['basic', 'json'],
    // Enable fetch for integration tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  // Reduce console noise in development
  logLevel: 'warn',
});
