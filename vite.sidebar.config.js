import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';

export default defineConfig({
  // Add React plugin
  plugins: [react()],
  
  // Define global variables for browser compatibility
  define: {
    'process.env': '{}',
    'process.env.NODE_ENV': '"production"',
    'process': '{}'
  },
  
  // Build configuration for React sidebar only
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty since we have other files
    lib: {
      entry: resolve(__dirname, 'src/ui/sidebar/sidebar.jsx'),
      name: 'TabSenseSidebar',
      fileName: 'sidebar2',
      formats: ['umd']
    },
    rollupOptions: {
      external: [], // Bundle everything
      output: {
        globals: {},
        // Clean up stack traces by providing a name for the UMD factory
        name: 'TabSenseSidebar'
      }
    },
    // Chrome extension specific optimizations
    target: 'es2020',
    minify: false, // Don't minify for debugging
    sourcemap: true // Generate source maps for cleaner debugging
  },
  
  // CSS processing
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer
      ]
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types')
    }
  }
});
