import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTimeControlStore } from "./useTimeControlStore";

export type PomodoroMode = "work" | "break" | "long_break";

export interface PomodoroConfig {
  work_min:       number;   // minutos de trabajo (default 25)
  break_min:      number;   // descanso corto (default 5)
  long_break_min: number;   // descanso largo (default 15)
  long_break_every: number; // cada cuántos pomodoros (default 4)
  auto_start:     boolean;  // iniciar siguiente fase automáticamente
}

export interface PomodoroStore {
  // Config
  config: PomodoroConfig;
  updateConfig: (patch: Partial<PomodoroConfig>) => void;

  // Estado del timer
  mode:          PomodoroMode;
  secondsLeft:   number;
  running:       boolean;
  pomodorosHoy:  number;   // completados hoy
  totalPomodoros: number;  // completados totales

  // Visibilidad del widget
  visible:   boolean;
  minimized: boolean;
  toggleVisible:   () => void;
  toggleMinimized: () => void;

  // Controles
  start:  () => void;
  pause:  () => void;
  reset:  () => void;
  skip:   () => void;        // saltar a la siguiente fase
  tick:   () => void;        // llamado cada segundo por el interval

  // Helpers
  totalSeconds: () => number;
  pct:          () => number;
}

function hoy() { return new Date().toISOString().split("T")[0]; }

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      config: {
        work_min:         25,
        break_min:        5,
        long_break_min:   15,
        long_break_every: 4,
        auto_start:       false,
      },

      mode:           "work",
      secondsLeft:    25 * 60,
      running:        false,
      pomodorosHoy:   0,
      totalPomodoros: 0,
      visible:        false,
      minimized:      false,

      updateConfig: (patch) => {
        set(s => {
          const newCfg = { ...s.config, ...patch };
          // Si no está corriendo, resetear el timer con la nueva config
          const newSeconds = s.running ? s.secondsLeft : (
            s.mode === "work"       ? newCfg.work_min * 60 :
            s.mode === "long_break" ? newCfg.long_break_min * 60 :
                                      newCfg.break_min * 60
          );
          return { config: newCfg, secondsLeft: newSeconds };
        });
      },

      toggleVisible:   () => set(s => ({ visible: !s.visible, minimized: false })),
      toggleMinimized: () => set(s => ({ minimized: !s.minimized })),

      start: () => set({ running: true }),
      pause: () => set({ running: false }),

      reset: () => {
        const { mode, config } = get();
        const secs = mode === "work"       ? config.work_min * 60 :
                     mode === "long_break" ? config.long_break_min * 60 :
                                             config.break_min * 60;
        set({ running: false, secondsLeft: secs });
      },

      skip: () => {
        const { mode, pomodorosHoy, config } = get();
        let nextMode: PomodoroMode;
        let nextPoms = pomodorosHoy;

        if (mode === "work") {
          nextPoms = pomodorosHoy + 1;
          nextMode = nextPoms % config.long_break_every === 0 ? "long_break" : "break";
        } else {
          nextMode = "work";
        }

        const secs = nextMode === "work"       ? config.work_min * 60 :
                     nextMode === "long_break" ? config.long_break_min * 60 :
                                                  config.break_min * 60;
        set({
          mode: nextMode,
          secondsLeft: secs,
          running: config.auto_start,
          pomodorosHoy: nextPoms,
        });
      },

      tick: () => {
        const { secondsLeft, mode, pomodorosHoy, totalPomodoros, config } = get();

        if (secondsLeft > 1) {
          set({ secondsLeft: secondsLeft - 1 });
          return;
        }

        // Timer completado
        set({ running: false });

        if (mode === "work") {
          // Completó un pomodoro — registrar en Time Control
          const newPoms     = pomodorosHoy + 1;
          const newTotal    = totalPomodoros + 1;
          const horasAgregadas = config.work_min / 60;

          // Auto-registrar en Time Control (suma a estudio del día)
          const tcStore = useTimeControlStore.getState();
          const horasActuales = tcStore.horasDelDia(hoy(), "estudio");
          tcStore.upsertRegistro(
            hoy(), "estudio",
            Math.round((horasActuales + horasAgregadas) * 10) / 10,
          );

          // Pasar a descanso
          const nextMode: PomodoroMode =
            newPoms % config.long_break_every === 0 ? "long_break" : "break";
          const nextSecs =
            nextMode === "long_break" ? config.long_break_min * 60 : config.break_min * 60;

          set({
            mode: nextMode,
            secondsLeft: nextSecs,
            pomodorosHoy: newPoms,
            totalPomodoros: newTotal,
            running: config.auto_start,
          });
        } else {
          // Descanso terminado → volver a trabajo
          set({
            mode: "work",
            secondsLeft: config.work_min * 60,
            running: config.auto_start,
          });
        }
      },

      totalSeconds: () => {
        const { mode, config } = get();
        return mode === "work"       ? config.work_min * 60 :
               mode === "long_break" ? config.long_break_min * 60 :
                                        config.break_min * 60;
      },

      pct: () => {
        const { secondsLeft } = get();
        const total = get().totalSeconds();
        return total === 0 ? 0 : ((total - secondsLeft) / total) * 100;
      },
    }),
    {
      name: "studymap-pomodoro",
      partialize: s => ({
        config:         s.config,
        pomodorosHoy:   s.pomodorosHoy,
        totalPomodoros: s.totalPomodoros,
        visible:        s.visible,
      }),
    }
  )
);