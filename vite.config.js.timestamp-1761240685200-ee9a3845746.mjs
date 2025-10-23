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
        // Background script (service worker) - use the simple service worker
        background: resolve(__vite_injected_original_dirname, "src/background/simple-service-worker.js"),
        // Content scripts
        content: resolve(__vite_injected_original_dirname, "src/content/content-script.js"),
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ocC9PbmVEcml2ZS9EZXNrdG9wL1RhYnNlbnNlL3RhYnNlbnNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ3RhaWx3aW5kY3NzJztcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgLy8gQWRkIFJlYWN0IHBsdWdpblxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIFxuICAvLyBDaHJvbWUgZXh0ZW5zaW9uIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBlbXB0eU91dERpcjogZmFsc2UsIC8vIERvbid0IGVtcHR5IHRvIHByZXNlcnZlIHNpZGViYXIyLmpzXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgLy8gQmFja2dyb3VuZCBzY3JpcHQgKHNlcnZpY2Ugd29ya2VyKSAtIHVzZSB0aGUgc2ltcGxlIHNlcnZpY2Ugd29ya2VyXG4gICAgICAgIGJhY2tncm91bmQ6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2JhY2tncm91bmQvc2ltcGxlLXNlcnZpY2Utd29ya2VyLmpzJyksXG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZW50IHNjcmlwdHNcbiAgICAgICAgY29udGVudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvY29udGVudC9jb250ZW50LXNjcmlwdC5qcycpLFxuICAgICAgICBcbiAgICAgICAgLy8gVUkgY29tcG9uZW50c1xuICAgICAgICBwb3B1cDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdWkvcG9wdXAvcG9wdXAuaHRtbCcpLFxuICAgICAgICAncG9wdXAuanMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9wb3B1cC9wb3B1cC5qcycpLFxuICAgICAgICBcbiAgICAgICAgLy8gQ1NTIGZpbGVzXG4gICAgICAgICdzdHlsZXMvbWFpbic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VpL3N0eWxlcy9tYWluLmNzcycpLFxuICAgICAgICAnc3R5bGVzL3NpZGViYXInOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9zdHlsZXMvc2lkZWJhci5jc3MnKVxuICAgICAgfSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBlbnRyeUZpbGVOYW1lczogKGNodW5rSW5mbykgPT4ge1xuICAgICAgICAgIC8vIEtlZXAgYmFja2dyb3VuZCBzY3JpcHQgYXMgLmpzXG4gICAgICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAnYmFja2dyb3VuZCcpIHJldHVybiAnYmFja2dyb3VuZC5qcyc7XG4gICAgICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAnY29udGVudCcpIHJldHVybiAnY29udGVudC5qcyc7XG4gICAgICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAncG9wdXAuanMnKSByZXR1cm4gJ3BvcHVwLmpzJztcbiAgICAgICAgICByZXR1cm4gJ1tuYW1lXS5qcyc7XG4gICAgICAgIH0sXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBhc3NldCB0eXBlc1xuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZT8uZW5kc1dpdGgoJy5odG1sJykpIHJldHVybiAnW25hbWVdLltleHRdJztcbiAgICAgICAgICBpZiAoYXNzZXRJbmZvLm5hbWU/LmVuZHNXaXRoKCcuY3NzJykpIHJldHVybiAnW25hbWVdLltleHRdJztcbiAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV0uW2V4dF0nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAvLyBDaHJvbWUgZXh0ZW5zaW9uIHNwZWNpZmljIG9wdGltaXphdGlvbnNcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgIG1pbmlmeTogKGNodW5rSW5mbykgPT4ge1xuICAgICAgLy8gRG9uJ3QgbWluaWZ5IHNlcnZpY2Ugd29ya2VyIHRvIGF2b2lkIHJlZ2lzdHJhdGlvbiBpc3N1ZXNcbiAgICAgIGlmIChjaHVua0luZm8ubmFtZSA9PT0gJ2JhY2tncm91bmQnKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gJ3RlcnNlcic7XG4gICAgfSxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IGZhbHNlLCAvLyBLZWVwIGNvbnNvbGUgbG9ncyBmb3IgZGVidWdnaW5nXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFxuICAvLyBDU1MgcHJvY2Vzc2luZ1xuICBjc3M6IHtcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgIHRhaWx3aW5kY3NzLFxuICAgICAgICBhdXRvcHJlZml4ZXJcbiAgICAgIF1cbiAgICB9XG4gIH0sXG4gIFxuICAvLyBEZXZlbG9wbWVudCBzZXJ2ZXIgY29uZmlndXJhdGlvblxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IGZhbHNlXG4gIH0sXG4gIFxuICAvLyBSZXNvbHZlIGNvbmZpZ3VyYXRpb25cbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJyksXG4gICAgICAnQGxpYic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2xpYicpLFxuICAgICAgJ0B1dGlscyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3V0aWxzJyksXG4gICAgICAnQHR5cGVzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdHlwZXMnKVxuICAgIH1cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVSxTQUFTLG9CQUFvQjtBQUN2VyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxrQkFBa0I7QUFDekIsU0FBUyxlQUFlO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBO0FBQUEsRUFFMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBO0FBQUEsRUFHakIsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBO0FBQUEsSUFDYixlQUFlO0FBQUEsTUFDYixPQUFPO0FBQUE7QUFBQSxRQUVMLFlBQVksUUFBUSxrQ0FBVyx5Q0FBeUM7QUFBQTtBQUFBLFFBR3hFLFNBQVMsUUFBUSxrQ0FBVywrQkFBK0I7QUFBQTtBQUFBLFFBRzNELE9BQU8sUUFBUSxrQ0FBVyx5QkFBeUI7QUFBQSxRQUNuRCxZQUFZLFFBQVEsa0NBQVcsdUJBQXVCO0FBQUE7QUFBQSxRQUd0RCxlQUFlLFFBQVEsa0NBQVcsd0JBQXdCO0FBQUEsUUFDMUQsa0JBQWtCLFFBQVEsa0NBQVcsMkJBQTJCO0FBQUEsTUFDbEU7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLGdCQUFnQixDQUFDLGNBQWM7QUFFN0IsY0FBSSxVQUFVLFNBQVMsYUFBYyxRQUFPO0FBQzVDLGNBQUksVUFBVSxTQUFTLFVBQVcsUUFBTztBQUN6QyxjQUFJLFVBQVUsU0FBUyxXQUFZLFFBQU87QUFDMUMsaUJBQU87QUFBQSxRQUNUO0FBQUEsUUFDQSxnQkFBZ0IsQ0FBQyxjQUFjO0FBRTdCLGNBQUksVUFBVSxNQUFNLFNBQVMsT0FBTyxFQUFHLFFBQU87QUFDOUMsY0FBSSxVQUFVLE1BQU0sU0FBUyxNQUFNLEVBQUcsUUFBTztBQUM3QyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFFQSxRQUFRO0FBQUEsSUFDUixRQUFRLENBQUMsY0FBYztBQUVyQixVQUFJLFVBQVUsU0FBUyxhQUFjLFFBQU87QUFDNUMsYUFBTztBQUFBLElBQ1Q7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxRQUNSLGNBQWM7QUFBQTtBQUFBLFFBQ2QsZUFBZTtBQUFBLE1BQ2pCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBR0EsS0FBSztBQUFBLElBQ0gsU0FBUztBQUFBLE1BQ1AsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUE7QUFBQSxFQUdBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsTUFDN0IsUUFBUSxRQUFRLGtDQUFXLFNBQVM7QUFBQSxNQUNwQyxVQUFVLFFBQVEsa0NBQVcsV0FBVztBQUFBLE1BQ3hDLFVBQVUsUUFBUSxrQ0FBVyxXQUFXO0FBQUEsSUFDMUM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
