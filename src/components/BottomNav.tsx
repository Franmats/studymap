import { useAppStore } from "../store";
import type { View } from "../store";


const TABS: { view: View | "upload"; icon: string; label: string; special?: boolean }[] = [
  { view: "list",     icon: "📚", label: "Materias" },
  { view: "sprint",   icon: "🚀", label: "Sprints"  },
  { view: "time-control", icon: "⏱️", label: "Tiempo"  },
  { view: "calendar",    icon: "📅", label: "Exámenes" },
  { view: "upload",   icon: "✦",  label: "Nueva",   special: true },
];

interface Props {
  onUpload: () => void;
}

export function BottomNav({ onUpload }: Props) {
  const view    = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  const handleTab = (tab: typeof TABS[number]) => {
    if (tab.view === "upload") { onUpload(); return; }
    setView(tab.view as View);
  };

  return (
    <>      <nav className="bnav">
        {TABS.map((tab) => {
          const isActive = view === tab.view;
          return (
            <button
              key={tab.view}
              className={`bnav-item${tab.special ? " upload-tab" : ""}${isActive ? " active" : ""}`}
              onClick={() => handleTab(tab)}
            >
              {tab.special ? (
                <>
                  <div className="bnav-icon-wrap">
                    <span className="bnav-icon" style={{ color: "#fff" }}>{tab.icon}</span>
                  </div>
                  <span className="bnav-label">{tab.label}</span>
                </>
              ) : (
                <>
                  <span className="bnav-icon">{tab.icon}</span>
                  <span className="bnav-label">{tab.label}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}