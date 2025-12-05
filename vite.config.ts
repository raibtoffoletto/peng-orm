import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      outDir: 'dist',
      entryRoot: 'src',
      exclude: ['**/*.test.ts'],
    }),
  ],

  root: __dirname,

  build: {
    emptyOutDir: true,
    target: 'node22',

    lib: {
      entry: './src/main.ts',
      name: 'index',
      fileName: 'index',
      formats: ['es'],
    },

    rollupOptions: {
      external: ['node:sqlite'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        dir: 'dist',
      },
    },
  },
});
