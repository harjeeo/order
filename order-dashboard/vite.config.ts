import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Only the app shell (JS/CSS/HTML/icons) is precached, so the POS
      // can still load with no connection. API responses are deliberately
      // left uncached (NetworkOnly) — serving stale menu/order data to a
      // live POS would be worse than an honest failure, which is what the
      // offline order queue (lib/offlineQueue.ts) exists to catch instead.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico}"],
        // Without this, the service worker treats a real static file's
        // request (like a .csv download) as SPA navigation and serves the
        // cached index.html instead — React Router then renders its own
        // "no route matched" 404 page for a file that exists on disk.
        navigateFallbackDenylist: [/\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Cafe POS",
        short_name: "Cafe POS",
        description: "Multi-tenant cafe/restaurant point-of-sale",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/cafe",
        icons: [
          { src: "/pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/pwa-icon.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      },
    }),
  ],
});
