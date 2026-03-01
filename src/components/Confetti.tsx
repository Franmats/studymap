// Confetti puro en CSS + JS — sin dependencias externas.
// Se invoca cuando progress llega al 100%.
// Crea partículas DOM temporales y las limpia solas.

import { useEffect } from "react";

const COLORS = ["#6C5CE7","#a29bfe","#55EFC4","#FECA57","#FF6B6B","#FF9F43","#FD79A8","#48CAE4"];
const COUNT  = 80;

function randomBetween(a: number, b: number) { return a + Math.random() * (b - a); }

export function useConfetti(trigger: boolean) {
  useEffect(() => {
    if (!trigger) return;

    const container = document.createElement("div");
    container.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden;
    `;
    document.body.appendChild(container);

    const particles = Array.from({ length: COUNT }, (_, i) => {
      const el  = document.createElement("div");
      const size = randomBetween(6, 14);
      const x    = randomBetween(10, 90);       // % horizontal
      const color = COLORS[i % COLORS.length];
      const shape = Math.random() > .5 ? "50%" : "2px"; // círculo o cuadrado

      el.style.cssText = `
        position: absolute;
        width:  ${size}px;
        height: ${size}px;
        left:   ${x}%;
        top:    -20px;
        background: ${color};
        border-radius: ${shape};
        opacity: 0;
        transform: rotate(${randomBetween(-45, 45)}deg);
        animation: confetti-fall ${randomBetween(1.2, 2.5)}s ease-in ${randomBetween(0, .8)}s forwards;
      `;
      return el;
    });

    // Inyectamos el keyframe una sola vez
    const style = document.createElement("style");
    style.textContent = `
      @keyframes confetti-fall {
        0%   { opacity: 1; transform: translateY(0)       rotate(0deg)   scaleX(1); }
        25%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(100vh)   rotate(720deg) scaleX(.5); }
      }
    `;
    document.head.appendChild(style);

    particles.forEach(p => container.appendChild(p));

    // Cleanup: removemos todo después de 4s
    const timer = setTimeout(() => {
      container.remove();
      style.remove();
    }, 4000);

    return () => {
      clearTimeout(timer);
      container.remove();
      style.remove();
    };
  }, [trigger]);
}