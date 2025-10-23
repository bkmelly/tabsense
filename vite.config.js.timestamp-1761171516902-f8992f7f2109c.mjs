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
        // Background script (service worker)
        background: resolve(__vite_injected_original_dirname, "src/background/background.js"),
        // Content scripts
        content: resolve(__vite_injected_original_dirname, "src/content/content-script.js"),
        "lib/commentNavigator": resolve(__vite_injected_original_dirname, "src/lib/commentNavigator.js"),
        // UI components - React
        sidebar: resolve(__vite_injected_original_dirname, "src/ui/sidebar/sidebar.html"),
        "sidebar.jsx": resolve(__vite_injected_original_dirname, "src/ui/sidebar/sidebar.jsx"),
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
          if (chunkInfo.name === "popup.js") return "popup.js";
          if (chunkInfo.name === "sidebar.jsx") return "sidebar.js";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxocFxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFRhYnNlbnNlXFxcXHRhYnNlbnNlXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ocC9PbmVEcml2ZS9EZXNrdG9wL1RhYnNlbnNlL3RhYnNlbnNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ3RhaWx3aW5kY3NzJztcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgLy8gQWRkIFJlYWN0IHBsdWdpblxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIFxuICAvLyBDaHJvbWUgZXh0ZW5zaW9uIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICAvLyBCYWNrZ3JvdW5kIHNjcmlwdCAoc2VydmljZSB3b3JrZXIpXG4gICAgICAgIGJhY2tncm91bmQ6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2JhY2tncm91bmQvYmFja2dyb3VuZC5qcycpLFxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGVudCBzY3JpcHRzXG4gICAgICAgIGNvbnRlbnQ6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2NvbnRlbnQvY29udGVudC1zY3JpcHQuanMnKSxcbiAgICAgICAgJ2xpYi9jb21tZW50TmF2aWdhdG9yJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvbGliL2NvbW1lbnROYXZpZ2F0b3IuanMnKSxcbiAgICAgICAgXG4gICAgICAgIC8vIFVJIGNvbXBvbmVudHMgLSBSZWFjdFxuICAgICAgICBzaWRlYmFyOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9zaWRlYmFyL3NpZGViYXIuaHRtbCcpLFxuICAgICAgICAnc2lkZWJhci5qc3gnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9zaWRlYmFyL3NpZGViYXIuanN4JyksXG4gICAgICAgIHBvcHVwOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91aS9wb3B1cC9wb3B1cC5odG1sJyksXG4gICAgICAgICdwb3B1cC5qcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VpL3BvcHVwL3BvcHVwLmpzJyksXG4gICAgICAgIFxuICAgICAgICAvLyBDU1MgZmlsZXNcbiAgICAgICAgJ3N0eWxlcy9tYWluJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdWkvc3R5bGVzL21haW4uY3NzJyksXG4gICAgICAgICdzdHlsZXMvc2lkZWJhcic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VpL3N0eWxlcy9zaWRlYmFyLmNzcycpXG4gICAgICB9LFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAoY2h1bmtJbmZvKSA9PiB7XG4gICAgICAgICAgLy8gS2VlcCBiYWNrZ3JvdW5kIHNjcmlwdCBhcyAuanNcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdiYWNrZ3JvdW5kJykgcmV0dXJuICdiYWNrZ3JvdW5kLmpzJztcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdjb250ZW50JykgcmV0dXJuICdjb250ZW50LmpzJztcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdsaWIvY29tbWVudE5hdmlnYXRvcicpIHJldHVybiAnbGliL2NvbW1lbnROYXZpZ2F0b3IuanMnO1xuICAgICAgICAgIGlmIChjaHVua0luZm8ubmFtZSA9PT0gJ3BvcHVwLmpzJykgcmV0dXJuICdwb3B1cC5qcyc7XG4gICAgICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAnc2lkZWJhci5qc3gnKSByZXR1cm4gJ3NpZGViYXIuanMnO1xuICAgICAgICAgIHJldHVybiAnW25hbWVdLmpzJztcbiAgICAgICAgfSxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IGFzc2V0IHR5cGVzXG4gICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lPy5lbmRzV2l0aCgnLmh0bWwnKSkgcmV0dXJuICdbbmFtZV0uW2V4dF0nO1xuICAgICAgICAgIGlmIChhc3NldEluZm8ubmFtZT8uZW5kc1dpdGgoJy5jc3MnKSkgcmV0dXJuICdbbmFtZV0uW2V4dF0nO1xuICAgICAgICAgIHJldHVybiAnYXNzZXRzL1tuYW1lXS5bZXh0XSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIENocm9tZSBleHRlbnNpb24gc3BlY2lmaWMgb3B0aW1pemF0aW9uc1xuICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgbWluaWZ5OiAoY2h1bmtJbmZvKSA9PiB7XG4gICAgICAvLyBEb24ndCBtaW5pZnkgc2VydmljZSB3b3JrZXIgdG8gYXZvaWQgcmVnaXN0cmF0aW9uIGlzc3Vlc1xuICAgICAgaWYgKGNodW5rSW5mby5uYW1lID09PSAnYmFja2dyb3VuZCcpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiAndGVyc2VyJztcbiAgICB9LFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsIC8vIEtlZXAgY29uc29sZSBsb2dzIGZvciBkZWJ1Z2dpbmdcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXG4gIC8vIENTUyBwcm9jZXNzaW5nXG4gIGNzczoge1xuICAgIHBvc3Rjc3M6IHtcbiAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgdGFpbHdpbmRjc3MsXG4gICAgICAgIGF1dG9wcmVmaXhlclxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAgXG4gIC8vIERldmVsb3BtZW50IHNlcnZlciBjb25maWd1cmF0aW9uXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgb3BlbjogZmFsc2VcbiAgfSxcbiAgXG4gIC8vIFJlc29sdmUgY29uZmlndXJhdGlvblxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICdAbGliJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvbGliJyksXG4gICAgICAnQHV0aWxzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdXRpbHMnKSxcbiAgICAgICdAdHlwZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy90eXBlcycpXG4gICAgfVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFUsU0FBUyxvQkFBb0I7QUFDdlcsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sa0JBQWtCO0FBQ3pCLFNBQVMsZUFBZTtBQUp4QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQTtBQUFBLEVBRTFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQTtBQUFBLEVBR2pCLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQTtBQUFBLFFBRUwsWUFBWSxRQUFRLGtDQUFXLDhCQUE4QjtBQUFBO0FBQUEsUUFHN0QsU0FBUyxRQUFRLGtDQUFXLCtCQUErQjtBQUFBLFFBQzNELHdCQUF3QixRQUFRLGtDQUFXLDZCQUE2QjtBQUFBO0FBQUEsUUFHeEUsU0FBUyxRQUFRLGtDQUFXLDZCQUE2QjtBQUFBLFFBQ3pELGVBQWUsUUFBUSxrQ0FBVyw0QkFBNEI7QUFBQSxRQUM5RCxPQUFPLFFBQVEsa0NBQVcseUJBQXlCO0FBQUEsUUFDbkQsWUFBWSxRQUFRLGtDQUFXLHVCQUF1QjtBQUFBO0FBQUEsUUFHdEQsZUFBZSxRQUFRLGtDQUFXLHdCQUF3QjtBQUFBLFFBQzFELGtCQUFrQixRQUFRLGtDQUFXLDJCQUEyQjtBQUFBLE1BQ2xFO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixnQkFBZ0IsQ0FBQyxjQUFjO0FBRTdCLGNBQUksVUFBVSxTQUFTLGFBQWMsUUFBTztBQUM1QyxjQUFJLFVBQVUsU0FBUyxVQUFXLFFBQU87QUFDekMsY0FBSSxVQUFVLFNBQVMsdUJBQXdCLFFBQU87QUFDdEQsY0FBSSxVQUFVLFNBQVMsV0FBWSxRQUFPO0FBQzFDLGNBQUksVUFBVSxTQUFTLGNBQWUsUUFBTztBQUM3QyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxRQUNBLGdCQUFnQixDQUFDLGNBQWM7QUFFN0IsY0FBSSxVQUFVLE1BQU0sU0FBUyxPQUFPLEVBQUcsUUFBTztBQUM5QyxjQUFJLFVBQVUsTUFBTSxTQUFTLE1BQU0sRUFBRyxRQUFPO0FBQzdDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUVBLFFBQVE7QUFBQSxJQUNSLFFBQVEsQ0FBQyxjQUFjO0FBRXJCLFVBQUksVUFBVSxTQUFTLGFBQWMsUUFBTztBQUM1QyxhQUFPO0FBQUEsSUFDVDtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBO0FBQUEsUUFDZCxlQUFlO0FBQUEsTUFDakI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxLQUFLO0FBQUEsSUFDSCxTQUFTO0FBQUEsTUFDUCxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBR0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQTtBQUFBLEVBR0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxNQUM3QixRQUFRLFFBQVEsa0NBQVcsU0FBUztBQUFBLE1BQ3BDLFVBQVUsUUFBUSxrQ0FBVyxXQUFXO0FBQUEsTUFDeEMsVUFBVSxRQUFRLGtDQUFXLFdBQVc7QUFBQSxJQUMxQztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
