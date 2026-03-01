// Toast — sistema de notificaciones in-app.
// Reemplaza todos los console.error mudos con feedback visible al usuario.
//
// Uso:
//   const { toast } = useToast();
//   toast.success("Guardado");
//   toast.error("No se pudo conectar con Supabase");
//   toast.info("Analizando tu temario…");
//
// El ToastContainer se monta una sola vez en App.tsx.
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id:      number;
  type:    ToastType;
  message: string;
  duration?: number;   // ms, default 4000
}

// ── Singleton store fuera de React ──────────────────────────────────────────
// Permite llamar toast() desde cualquier lugar sin props drilling.
type Listener = (items: ToastItem[]) => void;
let _items:     ToastItem[] = [];
let _listeners: Listener[]  = [];
let _nextId = 1;

function notify() { _listeners.forEach((l) => l([..._items])); }

export const toast = {
  show(type: ToastType, message: string, duration = 4000) {
    const id = _nextId++;
    _items = [..._items, { id, type, message, duration }];
    notify();
    if (duration > 0) setTimeout(() => toast.dismiss(id), duration);
  },
  success: (msg: string, dur?: number) => toast.show("success", msg, dur),
  error:   (msg: string, dur?: number) => toast.show("error",   msg, dur ?? 6000),
  info:    (msg: string, dur?: number) => toast.show("info",    msg, dur),
  warning: (msg: string, dur?: number) => toast.show("warning", msg, dur),
  dismiss(id: number) {
    _items = _items.filter((t) => t.id !== id);
    notify();
  },
};

// ── Hook para consumir el store en React ────────────────────────────────────
function useToastStore() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    _listeners.push(setItems);
    return () => { _listeners = _listeners.filter((l) => l !== setItems); };
  }, []);
  return items;
}

// ── Íconos y colores por tipo ────────────────────────────────────────────────
const CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon:"✓",  color:"#55EFC4", bg:"rgba(85,239,196,.1)",   border:"rgba(85,239,196,.3)" },
  error:   { icon:"✕",  color:"#FF6B6B", bg:"rgba(255,107,107,.1)",  border:"rgba(255,107,107,.3)" },
  info:    { icon:"ℹ",  color:"#a29bfe", bg:"rgba(162,155,254,.1)",  border:"rgba(162,155,254,.3)" },
  warning: { icon:"⚠",  color:"#FECA57", bg:"rgba(254,202,87,.1)",   border:"rgba(254,202,87,.3)" },
};

const CSS = `
  @keyframes toast-in  {
    from { opacity:0; transform:translateX(110%); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes toast-out {
    from { opacity:1; transform:translateX(0);    max-height:80px; margin-bottom:8px; }
    to   { opacity:0; transform:translateX(110%); max-height:0;    margin-bottom:0; }
  }

  .toast-container {
    position:fixed; bottom:80px; right:16px; z-index:10000;
    display:flex; flex-direction:column; gap:8px;
    pointer-events:none;
  }

  @media (min-width:720px) {
    .toast-container { bottom:20px; right:24px; }
  }

  .toast-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:11px 14px; border-radius:13px;
    border:1px solid; min-width:240px; max-width:340px;
    box-shadow:0 8px 24px rgba(0,0,0,.4);
    backdrop-filter:blur(12px);
    pointer-events:all; cursor:pointer;
    animation:toast-in .3s cubic-bezier(.34,1.2,.64,1) both;
  }
  .toast-item.exiting {
    animation:toast-out .25s ease forwards;
    pointer-events:none;
  }

  .toast-icon {
    width:22px; height:22px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:900; margin-top:1px;
  }
  .toast-msg {
    flex:1; font-size:13px; font-weight:600; line-height:1.45;
    color:rgba(255,255,255,.9);
  }
  .toast-close {
    font-size:16px; color:rgba(255,255,255,.3); flex-shrink:0;
    line-height:1; transition:color .15s; margin-top:1px;
  }
  .toast-item:hover .toast-close { color:rgba(255,255,255,.7); }
`;

// ── Ítem individual con animación de salida ──────────────────────────────────
function ToastItemEl({ item }: { item: ToastItem }) {
  const [exiting, setExiting] = useState(false);
  const cfg = CONFIG[item.type];

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => toast.dismiss(item.id), 240);
  }, [item.id]);

  return (
    <div
      className={`toast-item${exiting ? " exiting" : ""}`}
      style={{ background: cfg.bg, borderColor: cfg.border }}
      onClick={dismiss}
    >
      <div className="toast-icon" style={{ background: cfg.border, color: cfg.color }}>
        {cfg.icon}
      </div>
      <div className="toast-msg">{item.message}</div>
      <div className="toast-close">×</div>
    </div>
  );
}

// ── Componente que va en App.tsx ─────────────────────────────────────────────
export function ToastContainer() {
  const items = useToastStore();

  return createPortal(
    <>
      <style>{CSS}</style>
      <div className="toast-container">
        {items.map((item) => <ToastItemEl key={item.id} item={item} />)}
      </div>
    </>,
    document.body
  );
}