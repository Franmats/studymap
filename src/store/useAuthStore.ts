// ─────────────────────────────────────────────────────────────────────────────
// useAuthStore — autenticación con Supabase Auth
// ─────────────────────────────────────────────────────────────────────────────
// Maneja:
//   • Estado de sesión (user, session, loading)
//   • Login con email/contraseña
//   • Registro con email/contraseña
//   • Login con Google OAuth
//   • Logout
//   • Listener de cambios de sesión (onAuthStateChange)
//
// El USER_ID real del usuario autenticado se expone via getAuthUserId(),
// que los demás stores usan en lugar de la constante "personal".
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthStore {
  user:           User | null;
  session:        Session | null;
  loading:        boolean;   // true mientras verifica sesión inicial
  authError:      string | null;

  // Acciones
  initialize:     () => Promise<void>;   // llamar UNA vez al montar la app
  login:          (email: string, password: string) => Promise<boolean>;
  register:       (email: string, password: string, nombre?: string) => Promise<boolean>;
  loginGoogle:    () => Promise<void>;
  logout:         () => Promise<void>;
  clearError:     () => void;
}

// ── Helper: mensaje de error legible ────────────────────────────────────────
function friendlyError(e: AuthError | Error | unknown): string {
  const msg = (e as AuthError)?.message ?? String(e);
  if (msg.includes("Invalid login credentials"))   return "Email o contraseña incorrectos.";
  if (msg.includes("Email not confirmed"))         return "Confirmá tu email antes de ingresar.";
  if (msg.includes("User already registered"))     return "Ya existe una cuenta con ese email.";
  if (msg.includes("Password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("Unable to validate"))          return "Error de conexión. Intentá de nuevo.";
  return "Ocurrió un error. Intentá de nuevo.";
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user:      null,
  session:   null,
  loading:   true,
  authError: null,

  // ── initialize ─────────────────────────────────────────────────────────────
  // Verifica si hay sesión guardada y suscribe a cambios futuros.
  // Se llama UNA sola vez en main.tsx (antes de montar App).
  initialize: async () => {
    // Obtener sesión actual (puede venir de localStorage automáticamente)
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });

    // Suscribirse a cambios: login, logout, token refresh, OAuth callback
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  // ── login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { set({ authError: friendlyError(error) }); return false; }
    return true;
  },

  // ── register ───────────────────────────────────────────────────────────────
  register: async (email, password, nombre) => {
    set({ authError: null });
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: nombre?.trim() ?? "" } },
    });
    if (error) { set({ authError: friendlyError(error) }); return false; }
    // Supabase envía email de confirmación por defecto.
    // En desarrollo podés desactivarlo en Dashboard → Auth → Settings → "Enable email confirmations".
    return true;
  },

  // ── loginGoogle ────────────────────────────────────────────────────────────
  loginGoogle: async () => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,   // vuelve a la app después del OAuth
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) set({ authError: friendlyError(error) });
  },

  // ── logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut();
    // onAuthStateChange limpiará user y session automáticamente
  },

  clearError: () => set({ authError: null }),
}));

// ── getAuthUserId ─────────────────────────────────────────────────────────────
// Función sincrónica para obtener el user_id actual desde otros stores.
// Retorna "personal" como fallback si por algún motivo no hay usuario.
export function getAuthUserId(): string {
  return useAuthStore.getState().user?.id ?? "personal";
}