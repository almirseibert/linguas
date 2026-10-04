import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icons/*.png", "push-handler.js"],
      manifest: {
        name: "Passaporte de Idiomas",
        short_name: "Passaporte",
        description: "Inglês e espanhol em família, 35 minutos por dia.",
        lang: "pt-BR",
        theme_color: "#2F6F4E",
        background_color: "#F3F5EC",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // Notificações push do lembrete diário (public/push-handler.js)
        importScripts: ["push-handler.js"],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Áudio nativo já ouvido fica disponível offline
            urlPattern: ({ url }) => url.pathname.startsWith("/api/audio/"),
            handler: "CacheFirst",
            options: { cacheName: "audio-nativo", expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 180 } },
          },
        ],
      },
      // Service worker também no `npm run dev`, para testar o lembrete localmente
      devOptions: { enabled: true, type: "classic" },
    }),
  ],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
