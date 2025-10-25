// vite.config.js
import { defineConfig } from "file:///C:/Users/hp/OneDrive/Desktop/Tabsense/tabsense/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/hp/OneDrive/Desktop/Tabsense/tabsense/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/hp/OneDrive/Desktop/Tabsense/tabsense/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///C:/Users/hp/OneDrive/Desktop/Tabsense/tabsense/node_modules/autoprefixer/lib/autoprefixer.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\hp\\OneDrive\\Desktop\\Tabsense\\tabsense";
var vite_config_default = defineConfig({
  // Add React plugin
  plugins: [react()],
  // Chrome extension specific configuration
  build: {
    outDir: "dist",
    emptyOutDir: false,
    // Don't empty to preserve sidebar2.js
    rollupOptions: {
      input: {
        // Background script (service worker) - use the updated service worker
        background: resolve(__vite_injected_original_dirname, "src/background/background.js"),
        // Content scripts
        content: resolve(__vite_injected_original_dirname, "src/content/content-script.js"),
        // UI components - only sidebar
        sidebar2: resolve(__vite_injected_original_dirname, "src/ui/sidebar/sidebar.jsx"),
        // CSS files
        "styles/main": resolve(__vite_injected_original_dirname, "src/ui/styles/main.css"),
        "styles/sidebar": resolve(__vite_injected_original_dirname, "src/ui/styles/sidebar.css")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content") return "content.js";
          if (chunkInfo.name === "sidebar2") return "sidebar2.js";
          return "[name].js";
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".html")) return "[name].[ext]";
          if (assetInfo.name?.endsWith(".css")) return "[name].[ext]";
          return "assets/[name].[ext]";
        }
      }
    },
    // Chrome extension specific optimizations
    target: "es2020",
    minify: (chunkInfo) => {
      if (chunkInfo.name === "background") return false;
      return "terser";
    },
    terserOptions: {
      compress: {
        drop_console: false,
        // Keep console logs for debugging
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
    port: 3e3,
    open: false
  },
  // Resolve configuration
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src"),
      "@lib": resolve(__vite_injected_original_dirname, "src/lib"),
      "@utils": resolve(__vite_injected_original_dirname, "src/utils"),
      "@types": resolve(__vite_injected_original_dirname, "src/types")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ocC9PbmVEcml2ZS9EZXNrdG9wL1RhYnNlbnNlL3RhYnNlbnNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ3RhaWx3aW5kY3NzJztcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgLy8gQWRkIFJlYWN0IHBsdWdpblxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIFxuICAvLyBDaHJvbWUgZXh0ZW5zaW9uIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBlbXB0eU91dERpcjogZmFsc2UsIC8vIERvbid0IGVtcHR5IHRvIHByZXNlcnZlIHNpZGViYXIyLmpzXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgLy8gQmFja2dyb3VuZCBzY3JpcHQgKHNlcnZpY2Ugd29ya2VyKSAtIHVzZSB0aGUgdXBkYXRlZCBzZXJ2aWNlIHdvcmtlclxuICAgICAgICBiYWNrZ3JvdW5kOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9iYWNrZ3JvdW5kL2JhY2tncm91bmQuanMnKSxcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnRlbnQgc2NyaXB0c1xuICAgICAgICBjb250ZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jb250ZW50L2NvbnRlbnQtc2NyaXB0LmpzJyksXG4gICAgICAgIFxuICAgICAgICAvLyBVSSBjb21wb25lbnRzIC0gb25seSBzaWRlYmFyXG4gICAgICAgIHNpZGViYXIyOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9zaWRlYmFyL3NpZGViYXIuanN4JyksXG4gICAgICAgIFxuICAgICAgICAvLyBDU1MgZmlsZXNcbiAgICAgICAgJ3N0eWxlcy9tYWluJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdWkvc3R5bGVzL21haW4uY3NzJyksXG4gICAgICAgICdzdHlsZXMvc2lkZWJhcic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VpL3N0eWxlcy9zaWRlYmFyLmNzcycpXG4gICAgICB9LFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAoY2h1bmtJbmZvKSA9PiB7XG4gICAgICAgICAgLy8gS2VlcCBiYWNrZ3JvdW5kIHNjcmlwdCBhcyAuanNcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdiYWNrZ3JvdW5kJykgcmV0dXJuICdiYWNrZ3JvdW5kLmpzJztcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdjb250ZW50JykgcmV0dXJuICdjb250ZW50LmpzJztcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdzaWRlYmFyMicpIHJldHVybiAnc2lkZWJhcjIuanMnO1xuICAgICAgICAgIHJldHVybiAnW25hbWVdLmpzJztcbiAgICAgICAgfSxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IGFzc2V0IHR5cGVzXG4gICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lPy5lbmRzV2l0aCgnLmh0bWwnKSkgcmV0dXJuICdbbmFtZV0uW2V4dF0nO1xuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZT8uZW5kc1dpdGgoJy5jc3MnKSkgcmV0dXJuICdbbmFtZV0uW2V4dF0nO1xuICAgICAgICAgIHJldHVybiAnYXNzZXRzL1tuYW1lXS5bZXh0XSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIENocm9tZSBleHRlbnNpb24gc3BlY2lmaWMgb3B0aW1pemF0aW9uc1xuICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgbWluaWZ5OiAoY2h1bmtJbmZvKSA9PiB7XG4gICAgICAvLyBEb24ndCBtaW5pZnkgc2VydmljZSB3b3JrZXIgdG8gYXZvaWQgcmVnaXN0cmF0aW9uIGlzc3Vlc1xuICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAnYmFja2dyb3VuZCcpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiAndGVyc2VyJztcbiAgICB9LFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsIC8vIEtlZXAgY29uc29sZSBsb2dzIGZvciBkZWJ1Z2dpbmdcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXG4gIC8vIENTUyBwcm9jZXNzaW5nXG4gIGNzczoge1xuICAgIHBvc3Rjc3M6IHtcbiAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgdGFpbHdpbmRjc3MsXG4gICAgICAgIGF1dG9wcmVmaXhlclxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAgXG4gIC8vIERldmVsb3BtZW50IHNlcnZlciBjb25maWd1cmF0aW9uXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgb3BlbjogZmFsc2VcbiAgfSxcbiAgXG4gIC8vIFJlc29sdmUgY29uZmlndXJhdGlvblxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICdAbGliJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvbGliJyksXG4gICAgICAnQHV0aWxzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdXRpbHMnKSxcbiAgICAgICdAdHlwZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy90eXBlcycpXG4gICAgfVxuICB9XG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQTBVLFNBQVMsb0JBQW9CO0FBQ3ZXLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLGtCQUFrQjtBQUN6QixTQUFTLGVBQWU7QUFKeEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUE7QUFBQSxFQUUxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUE7QUFBQSxFQUdqQixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUE7QUFBQSxJQUNiLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQTtBQUFBLFFBRUwsWUFBWSxRQUFRLGtDQUFXLDhCQUE4QjtBQUFBO0FBQUEsUUFHN0QsU0FBUyxRQUFRLGtDQUFXLCtCQUErQjtBQUFBO0FBQUEsUUFHM0QsVUFBVSxRQUFRLGtDQUFXLDRCQUE0QjtBQUFBO0FBQUEsUUFHekQsZUFBZSxRQUFRLGtDQUFXLHdCQUF3QjtBQUFBLFFBQzFELGtCQUFrQixRQUFRLGtDQUFXLDJCQUEyQjtBQUFBLE1BQ2xFO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixnQkFBZ0IsQ0FBQyxjQUFjO0FBRTdCLGNBQUksVUFBVSxTQUFTLGFBQWMsUUFBTztBQUM1QyxjQUFJLFVBQVUsU0FBUyxVQUFXLFFBQU87QUFDekMsY0FBSSxVQUFVLFNBQVMsV0FBWSxRQUFPO0FBQzFDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLFFBQ0EsZ0JBQWdCLENBQUMsY0FBYztBQUU3QixjQUFJLFVBQVUsTUFBTSxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBQzlDLGNBQUksVUFBVSxNQUFNLFNBQVMsTUFBTSxFQUFHLFFBQU87QUFDN0MsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUTtBQUFBLElBQ1IsUUFBUSxDQUFDLGNBQWM7QUFFckIsVUFBSSxVQUFVLFNBQVMsYUFBYyxRQUFPO0FBQzVDLGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUE7QUFBQSxRQUNkLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLEtBQUs7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNQLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBO0FBQUEsRUFHQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQzdCLFFBQVEsUUFBUSxrQ0FBVyxTQUFTO0FBQUEsTUFDcEMsVUFBVSxRQUFRLGtDQUFXLFdBQVc7QUFBQSxNQUN4QyxVQUFVLFFBQVEsa0NBQVcsV0FBVztBQUFBLElBQzFDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
