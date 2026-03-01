// useDebounce — retrasa la actualización de un valor hasta que el usuario
// deja de escribir por `delay` ms. Evita filtrar en cada keystroke.
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}