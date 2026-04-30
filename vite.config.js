import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_PUBLIC_BASE || '/';

  return {
    base,
    plugins: [react()],
    build: {
      sourcemap: true
    }
  };
});
