import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useAuthStore } from "./store/useAuthStore";
import "./styles/components.css";

// Inicializar Supabase Auth ANTES de montar la app.
// Esto verifica si hay sesión guardada (localStorage) y suscribe a cambios.
// El App.tsx espera a que loading=false para decidir qué mostrar.
useAuthStore.getState().initialize().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});