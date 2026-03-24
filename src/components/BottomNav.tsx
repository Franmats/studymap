import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import type { View } from "../store";

const TABS: { view: View | "upload"; icon: string; label: string; special?: boolean }[] = [
  { view: "list",         icon: "📚", label: "Materias"  },
  { view: "sprint",       icon: "🚀", label: "Sprints"   },
  { view: "tps",          icon: "📝", label: "TPs"       },
  { view: "schedule",     icon: "🗓️", label: "Horarios"  },
  { view: "calendar",     icon: "📅", label: "Exámenes"  },
  { view: "time-control", icon: "⏱️", label: "Tiempo"    },
  { view: "upload",       icon: "✦",  label: "Nueva", special: true },
];

interface Props { onUpload: () => void; }

export function BottomNav({ onUpload }: Props) {
  const view    = useAppStore(s => s.view);
  const setView = useAppStore(s => s.setView);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll al tab activo cuando cambia la vista
  useEffect(() => {
    const el = activeRef.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const elLeft   = el.offsetLeft;
    const elWidth  = el.offsetWidth;
    const contWidth = container.offsetWidth;
    const target   = elLeft - contWidth / 2 + elWidth / 2;
    container.scrollTo({ left: target, behavior: "smooth" });
  }, [view]);

  const handleTab = (tab: typeof TABS[number]) => {
    if (tab.view === "upload") { onUpload(); return; }
    setView(tab.view as View);
  };

  return (
    <nav className="bnav">
      {/* Scrollable track */}
      <div className="bnav-track" ref={scrollRef}>
        {TABS.map(tab => {
          const isActive = view === tab.view;
          return (
            <button
              key={tab.view}
              ref={isActive ? activeRef : null}
              className={`bnav-item${tab.special ? " upload-tab" : ""}${isActive ? " active" : ""}`}
              onClick={() => handleTab(tab)}
            >
              {tab.special ? (
                <>
                  <div className="bnav-icon-wrap">
                    <span className="bnav-icon" style={{ color:"#fff" }}>{tab.icon}</span>
                  </div>
                  <span className="bnav-label">{tab.label}</span>
                </>
              ) : (
                <>
                  <span className="bnav-icon">{tab.icon}</span>
                  <span className="bnav-label">{tab.label}</span>
                  {isActive && <span className="bnav-active-dot" />}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Fade edges para indicar scroll */}
      <div className="bnav-fade-left"  />
      <div className="bnav-fade-right" />
    </nav>
  );
}