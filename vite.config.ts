import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base relativo: o build funciona tanto no Netlify quanto como página estática de prévia
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    // só o NOME do repositório vai para o navegador (para o link do histórico) — nunca o token
    __GITHUB_REPO__: JSON.stringify(process.env.GITHUB_REPO ?? ''),
  },
  test: {
    environment: 'node',
  },
} as never);
