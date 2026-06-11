import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_PUBLIC_BASE || '/';
  const buildStamp = new Date().toISOString();

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_BUILD_STAMP__: JSON.stringify(buildStamp)
    },
    plugins: [react()],
    build: {
      sourcemap: true
    }
  };
});
