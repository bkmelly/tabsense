import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';

export default defineConfig({
  // Add React plugin
  plugins: [react()],
  
  // Chrome extension specific configuration
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty to preserve sidebar2.js
    rollupOptions: {
      input: {
        // Background script (service worker) - use the updated service worker
        background: resolve(__dirname, 'src/background/service-worker.js'),
        
        // Offscreen document for heavy processing
        offscreen: resolve(__dirname, 'src/background/offscreen.js'),
        
        // Content scripts
        content: resolve(__dirname, 'src/content/content-script.js'),
        
        // UI components - only sidebar
        sidebar2: resolve(__dirname, 'src/ui/sidebar/sidebar.jsx'),
        
        // CSS files
        'styles/main': resolve(__dirname, 'src/ui/styles/main.css'),
        'styles/sidebar': resolve(__dirname, 'src/ui/styles/sidebar.css')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'offscreen') return 'offscreen.js';
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'sidebar2') return 'sidebar2.js';
          return '[name].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            if (assetInfo.name.includes('offscreen')) return 'offscreen.html';
            return '[name].[ext]';
          }
          if (assetInfo.name?.endsWith('.css')) return '[name].[ext]';
          return 'assets/[name].[ext]';
        }
      }
    },
    // Chrome extension specific optimizations
    target: 'es2020',
    minify: (chunkInfo) => {
      // Don't minify service worker to avoid registration issues
      if (chunkInfo.name === 'background') return false;
      return 'terser';
    },
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true
      }
    }
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
  
  // Development server configuration
  server: {
    port: 3000,
    open: false
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