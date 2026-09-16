import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'URL de l'API vient de VITE_API_URL (voir .env / .env.example).
// Les appels sont cross-origin : c'est le backend qui les autorise via
// CORS_ALLOWED_ORIGINS, aucun proxy n'est donc necessaire.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    // Pas de sourcemaps en production : le code metier bancaire n'a pas a
    // etre lisible tel quel dans le navigateur.
    sourcemap: false,
  },
})
