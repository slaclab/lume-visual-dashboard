import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // @swapps/ui is compiled from the submodule's source (see docs/development/design-system.md);
    // keep it on the app's single copy of React and Carbon.
    dedupe: ['react', 'react-dom', '@carbon/react', '@carbon/icons-react'],
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generateRouteTree: './src/routeTree.gen.ts',
      routeFileIgnorePrefix: '-',
      quoteStyle: 'single',
    }),
    react(),
  ],
  test: {
    passWithNoTests: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Submodules run their own test suites.
    exclude: [...configDefaults.exclude, 'external/**'],
  },
});
