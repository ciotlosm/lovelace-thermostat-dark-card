import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: {
    __CARD_VERSION__: JSON.stringify(pkg.version),
  },
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
