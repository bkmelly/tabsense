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
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Background script (service worker)
        background: resolve(__dirname, 'src/background/service-worker.js'),
        
        // Content scripts
        content: resolve(__dirname, 'src/content/content-script.js'),
        'lib/commentNavigator': resolve(__dirname, 'src/lib/commentNavigator.js'),
        
        // UI components - React
        sidebar: resolve(__dirname, 'src/ui/sidebar/sidebar.html'),
        'sidebar.jsx': resolve(__dirname, 'src/ui/sidebar/sidebar.jsx'),
        popup: resolve(__dirname, 'src/ui/popup/popup.html'),
        'popup.js': resolve(__dirname, 'src/ui/popup/popup.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background script as .js
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'lib/commentNavigator') return 'lib/commentNavigator.js';
          if (chunkInfo.name === 'popup.js') return 'popup.js';
          if (chunkInfo.name === 'sidebar.jsx') return 'sidebar.js';
          return '[name].js';
        },
        assetFileNames: (assetInfo) => {
          // Handle different asset types
          if (assetInfo.name?.endsWith('.html')) return '[name].[ext]';
          if (assetInfo.name?.endsWith('.css')) return '[name].[ext]';
          return 'assets/[name].[ext]';
        }
      }
    },
    // Chrome extension specific optimizations
    target: 'es2020',
    minify: 'terser',
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
