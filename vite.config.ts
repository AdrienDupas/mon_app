import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  resolve: {
    alias: {
      // Permet à react-map-gl de résoudre maplibre-gl correctement
      'mapbox-gl': 'maplibre-gl'
    }
  }
});




