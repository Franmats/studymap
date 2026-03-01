// AuthScreen — pantalla de login y registro.
// Alterna entre modo "login" y "registro" con animación.
// Incluye: email/contraseña, Google OAuth, manejo de errores.
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";


// Logo SVG de Google (colores oficiales, sin copyright)
const GoogleLogo = () => (
  <svg className="auth-google-logo" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

type Modo = "login" | "registro";

export function AuthScreen() {
  const { login, register, loginGoogle, authError, clearError } = useAuthStore();

  const [modo,       setModo]       = useState<Modo>("login");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [nombre,     setNombre]     = useState("");
  const [working,    setWorking]    = useState(false);
  const [confirmed,  setConfirmed]  = useState(false); // registro exitoso, esperando email
  const [hasError,   setHasError]   = useState(false); // para la animación del input

  // Limpiar error al cambiar de modo o al escribir
  useEffect(() => { clearError(); setHasError(false); }, [modo]);
  useEffect(() => { if (authError) setHasError(true); }, [authError]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setWorking(true);
    setHasError(false);

    if (modo === "login") {
      await login(email, password);
      // Si login exitoso → onAuthStateChange actualiza el store → App re-renderiza
    } else {
      const ok = await register(email, password, nombre);
      if (ok) setConfirmed(true); // Mostrar pantalla de "revisá tu email"
    }
    setWorking(false);
  };

  const cambiarModo = (m: Modo) => {
    setModo(m); setEmail(""); setPassword(""); setNombre("");
    setConfirmed(false); setHasError(false);
  };

  // Pantalla de confirmación post-registro
  if (confirmed) return (
    <>      <div className="auth-page">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-card">
          <div className="auth-confirm">
            <span className="auth-confirm-icon">📬</span>
            <div className="auth-confirm-title">¡Revisá tu email!</div>
            <div className="auth-confirm-desc">
              Te enviamos un link de confirmación a<br/>
              <strong style={{ color:"#a29bfe" }}>{email}</strong>.<br/><br/>
              Hacé click en el link para activar tu cuenta y empezar a estudiar.
            </div>
            <button className="auth-confirm-back" onClick={() => cambiarModo("login")}>
              ← Volver al login
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>      <div className="auth-page">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />

        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">🗺️</div>
            <div className="auth-logo-title">StudyMap AI</div>
            <div className="auth-logo-sub">Tu organizador de estudio inteligente</div>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab${modo === "login" ? " active" : ""}`} onClick={() => cambiarModo("login")}>
              Ingresar
            </button>
            <button className={`auth-tab${modo === "registro" ? " active" : ""}`} onClick={() => cambiarModo("registro")}>
              Crear cuenta
            </button>
          </div>

          {/* Error */}
          {authError && <div className="auth-error">⚠ {authError}</div>}

          {/* Nombre (solo en registro) */}
          {modo === "registro" && (
            <div className="auth-field">
              <label className="auth-label">Nombre (opcional)</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input
                  className="auth-input"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">✉</span>
              <input
                className={`auth-input${hasError ? " error" : ""}`}
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setHasError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="auth-field">
            <label className="auth-label">Contraseña {modo === "registro" && <span style={{color:"rgba(255,255,255,.25)"}}>— mínimo 6 caracteres</span>}</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔑</span>
              <input
                className={`auth-input${hasError ? " error" : ""}`}
                type="password"
                placeholder={modo === "registro" ? "Elegí una contraseña" : "Tu contraseña"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setHasError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {/* Botón principal */}
          <button
            className="auth-btn"
            onClick={handleSubmit}
            disabled={working || !email.trim() || !password}
          >
            {working
              ? <><div className="auth-btn-spinner" /> {modo === "login" ? "Ingresando…" : "Creando cuenta…"}</>
              : modo === "login" ? "Ingresar →" : "Crear cuenta →"
            }
          </button>

          {/* Divisor */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-txt">o continuá con</span>
            <div className="auth-divider-line" />
          </div>

          {/* Google */}
          <button className="auth-btn-google" onClick={loginGoogle}>
            <GoogleLogo />
            Continuar con Google
          </button>
        </div>

        <div className="auth-footer">
          Al continuar aceptás los términos de uso de StudyMap AI
        </div>
      </div>
    </>
  );
}