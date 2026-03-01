import { useAppStore } from "../store";
import type { View } from "../store";

const CSS = `
  .bnav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
    background: rgba(12,10,35,.92);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255,255,255,.08);
    display: flex; align-items: stretch; height: 60px;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .bnav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .15s;
    border: none; background: none; padding: 0;
  }
  .bnav-item:active { opacity: .6; }
  .bnav-icon { font-size: 20px; line-height: 1; transition: transform .2s; }
  .bnav-item.active .bnav-icon { transform: scale(1.15); }
  .bnav-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,.35);
    letter-spacing: .2px; transition: color .15s; }
  .bnav-item.active .bnav-label { color: #a29bfe; }

  /* Tab de "Nueva" — destacado en el centro */
  .bnav-item.upload-tab .bnav-icon-wrap {
    width: 40px; height: 40px; border-radius: 12px; margin-bottom: -2px;
    background: linear-gradient(135deg,#6C5CE7,#a29bfe);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 12px #6C5CE766;
  }
  .bnav-item.upload-tab .bnav-icon { font-size: 22px; }

  /* Solo visible en mobile */
  @media (min-width: 720px) {
    .bnav { display: none; }
  }
`;

const TABS: { view: View | "upload"; icon: string; label: string; special?: boolean }[] = [
  { view: "list",     icon: "📚", label: "Materias" },
  { view: "calendar", icon: "📅", label: "Calendario" },
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
    <>
      <style>{CSS}</style>
      <nav className="bnav">
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