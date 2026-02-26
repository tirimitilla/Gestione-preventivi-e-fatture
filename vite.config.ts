import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carica le variabili dai file .env (VITE_...)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Unisce le variabili del file .env con quelle di sistema (process.env)
  // Questo garantisce che le chiavi impostate su Vercel vengano trovate.
  const GEMINI_KEY = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || env.VITE_API_KEY || process.env.VITE_API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(GEMINI_KEY)
    }
  };
});