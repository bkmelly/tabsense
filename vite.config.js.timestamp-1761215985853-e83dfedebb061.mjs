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
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Background script (service worker) - use the simple service worker
        background: resolve(__vite_injected_original_dirname, "src/background/simple-service-worker.js"),
        // Content scripts
        content: resolve(__vite_injected_original_dirname, "src/content/content-script.js"),
        "lib/commentNavigator": resolve(__vite_injected_original_dirname, "src/lib/commentNavigator.js"),
        "lib/youtubeExtractor": resolve(__vite_injected_original_dirname, "src/lib/youtubeExtractor.js"),
        // UI components
        popup: resolve(__vite_injected_original_dirname, "src/ui/popup/popup.html"),
        "popup.js": resolve(__vite_injected_original_dirname, "src/ui/popup/popup.js"),
        // CSS files
        "styles/main": resolve(__vite_injected_original_dirname, "src/ui/styles/main.css"),
        "styles/sidebar": resolve(__vite_injected_original_dirname, "src/ui/styles/sidebar.css")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content") return "content.js";
          if (chunkInfo.name === "lib/commentNavigator") return "lib/commentNavigator.js";
          if (chunkInfo.name === "lib/youtubeExtractor") return "lib/youtubeExtractor.js";
          if (chunkInfo.name === "popup.js") return "popup.js";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ocC9PbmVEcml2ZS9EZXNrdG9wL1RhYnNlbnNlL3RhYnNlbnNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ3RhaWx3aW5kY3NzJztcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgLy8gQWRkIFJlYWN0IHBsdWdpblxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIFxuICAvLyBDaHJvbWUgZXh0ZW5zaW9uIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICAvLyBCYWNrZ3JvdW5kIHNjcmlwdCAoc2VydmljZSB3b3JrZXIpIC0gdXNlIHRoZSBzaW1wbGUgc2VydmljZSB3b3JrZXJcbiAgICAgICAgYmFja2dyb3VuZDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvYmFja2dyb3VuZC9zaW1wbGUtc2VydmljZS13b3JrZXIuanMnKSxcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnRlbnQgc2NyaXB0c1xuICAgICAgICBjb250ZW50OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jb250ZW50L2NvbnRlbnQtc2NyaXB0LmpzJyksXG4gICAgICAgICdsaWIvY29tbWVudE5hdmlnYXRvcic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2xpYi9jb21tZW50TmF2aWdhdG9yLmpzJyksXG4gICAgICAgICdsaWIveW91dHViZUV4dHJhY3Rvcic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2xpYi95b3V0dWJlRXh0cmFjdG9yLmpzJyksXG4gICAgICAgIFxuICAgICAgICAvLyBVSSBjb21wb25lbnRzXG4gICAgICAgIHBvcHVwOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9wb3B1cC9wb3B1cC5odG1sJyksXG4gICAgICAgICdwb3B1cC5qcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VpL3BvcHVwL3BvcHVwLmpzJyksXG4gICAgICAgIFxuICAgICAgICAvLyBDU1MgZmlsZXNcbiAgICAgICAgJ3N0eWxlcy9tYWluJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdWkvc3R5bGVzL21haW4uY3NzJyksXG4gICAgICAgICdzdHlsZXMvc2lkZWJhcic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VpL3N0eWxlcy9zaWRlYmFyLmNzcycpXG4gICAgICB9LFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAoY2h1bmtJbmZvKSA9PiB7XG4gICAgICAgICAgLy8gS2VlcCBiYWNrZ3JvdW5kIHNjcmlwdCBhcyAuanNcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdiYWNrZ3JvdW5kJykgcmV0dXJuICdiYWNrZ3JvdW5kLmpzJztcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdjb250ZW50JykgcmV0dXJuICdjb250ZW50LmpzJztcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdsaWIvY29tbWVudE5hdmlnYXRvcicpIHJldHVybiAnbGliL2NvbW1lbnROYXZpZ2F0b3IuanMnO1xuICAgICAgICAgIGlmIChjaHVua0luZm8ubmFtZSA9PT0gJ2xpYi95b3V0dWJlRXh0cmFjdG9yJykgcmV0dXJuICdsaWIveW91dHViZUV4dHJhY3Rvci5qcyc7XG4gICAgICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAncG9wdXAuanMnKSByZXR1cm4gJ3BvcHVwLmpzJztcbiAgICAgICAgICByZXR1cm4gJ1tuYW1lXS5qcyc7XG4gICAgICAgIH0sXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBhc3NldCB0eXBlc1xuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZT8uZW5kc1dpdGgoJy5odG1sJykpIHJldHVybiAnW25hbWVdLltleHRdJztcbiAgICAgICAgICBpZiAoYXNzZXRJbmZvLm5hbWU/LmVuZHNXaXRoKCcuY3NzJykpIHJldHVybiAnW25hbWVdLltleHRdJztcbiAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV0uW2V4dF0nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAvLyBDaHJvbWUgZXh0ZW5zaW9uIHNwZWNpZmljIG9wdGltaXphdGlvbnNcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgIG1pbmlmeTogKGNodW5rSW5mbykgPT4ge1xuICAgICAgLy8gRG9uJ3QgbWluaWZ5IHNlcnZpY2Ugd29ya2VyIHRvIGF2b2lkIHJlZ2lzdHJhdGlvbiBpc3N1ZXNcbiAgICAgIGlmIChjaHVua0luZm8ubmFtZSA9PT0gJ2JhY2tncm91bmQnKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gJ3RlcnNlcic7XG4gICAgfSxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IGZhbHNlLCAvLyBLZWVwIGNvbnNvbGUgbG9ncyBmb3IgZGVidWdnaW5nXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFxuICAvLyBDU1MgcHJvY2Vzc2luZ1xuICBjc3M6IHtcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgIHRhaWx3aW5kY3NzLFxuICAgICAgICBhdXRvcHJlZml4ZXJcbiAgICAgIF1cbiAgICB9XG4gIH0sXG4gIFxuICAvLyBEZXZlbG9wbWVudCBzZXJ2ZXIgY29uZmlndXJhdGlvblxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IGZhbHNlXG4gIH0sXG4gIFxuICAvLyBSZXNvbHZlIGNvbmZpZ3VyYXRpb25cbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksXG4gICAgICAnQGxpYic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2xpYicpLFxuICAgICAgJ0B1dGlscyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3V0aWxzJyksXG4gICAgICAnQHR5cGVzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdHlwZXMnKVxuICAgIH1cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVSxTQUFTLG9CQUFvQjtBQUN2VyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxrQkFBa0I7QUFDekIsU0FBUyxlQUFlO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBO0FBQUEsRUFFMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBO0FBQUEsRUFHakIsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsZUFBZTtBQUFBLE1BQ2IsT0FBTztBQUFBO0FBQUEsUUFFTCxZQUFZLFFBQVEsa0NBQVcseUNBQXlDO0FBQUE7QUFBQSxRQUd4RSxTQUFTLFFBQVEsa0NBQVcsK0JBQStCO0FBQUEsUUFDM0Qsd0JBQXdCLFFBQVEsa0NBQVcsNkJBQTZCO0FBQUEsUUFDeEUsd0JBQXdCLFFBQVEsa0NBQVcsNkJBQTZCO0FBQUE7QUFBQSxRQUd4RSxPQUFPLFFBQVEsa0NBQVcseUJBQXlCO0FBQUEsUUFDbkQsWUFBWSxRQUFRLGtDQUFXLHVCQUF1QjtBQUFBO0FBQUEsUUFHdEQsZUFBZSxRQUFRLGtDQUFXLHdCQUF3QjtBQUFBLFFBQzFELGtCQUFrQixRQUFRLGtDQUFXLDJCQUEyQjtBQUFBLE1BQ2xFO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixnQkFBZ0IsQ0FBQyxjQUFjO0FBRTdCLGNBQUksVUFBVSxTQUFTLGFBQWMsUUFBTztBQUM1QyxjQUFJLFVBQVUsU0FBUyxVQUFXLFFBQU87QUFDekMsY0FBSSxVQUFVLFNBQVMsdUJBQXdCLFFBQU87QUFDdEQsY0FBSSxVQUFVLFNBQVMsdUJBQXdCLFFBQU87QUFDdEQsY0FBSSxVQUFVLFNBQVMsV0FBWSxRQUFPO0FBQzFDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLFFBQ0EsZ0JBQWdCLENBQUMsY0FBYztBQUU3QixjQUFJLFVBQVUsTUFBTSxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBQzlDLGNBQUksVUFBVSxNQUFNLFNBQVMsTUFBTSxFQUFHLFFBQU87QUFDN0MsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUTtBQUFBLElBQ1IsUUFBUSxDQUFDLGNBQWM7QUFFckIsVUFBSSxVQUFVLFNBQVMsYUFBYyxRQUFPO0FBQzVDLGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUE7QUFBQSxRQUNkLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLEtBQUs7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNQLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBO0FBQUEsRUFHQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQzdCLFFBQVEsUUFBUSxrQ0FBVyxTQUFTO0FBQUEsTUFDcEMsVUFBVSxRQUFRLGtDQUFXLFdBQVc7QUFBQSxNQUN4QyxVQUFVLFFBQVEsa0NBQVcsV0FBVztBQUFBLElBQzFDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
