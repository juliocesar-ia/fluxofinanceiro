import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'], // Arquivos estáticos
      manifest: {
        name: 'FinancePro - Controle Financeiro',
        short_name: 'FinancePro',
        description: 'Organize suas finanças, investimentos e metas em um só lugar.',
        theme_color: '#09090b', // Cor da barra de status (Dark)
        background_color: '#09090b',
        display: 'standalone', // Remove a barra de URL do navegador
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png', // Vamos criar esses ícones no próximo passo
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
