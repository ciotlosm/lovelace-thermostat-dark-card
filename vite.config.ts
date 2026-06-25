import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2017',
    minify: 'terser',
    lib: {
      entry: 'src/thermostat-dark-card.ts',
      formats: ['es'],
      fileName: () => 'thermostat-dark-card.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
      },
    },
  },
  preview: {
    port: 4000,
    host: '0.0.0.0',
    cors: true,
    allowedHosts: true,
  },
});
