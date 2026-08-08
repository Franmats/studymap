import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GCalEvent {
  id:          string;
  summary:     string;
  description: string | null;
  start:       string;   // ISO datetime or date
  end:         string;
  color:       string;
  allDay:      boolean;
  htmlLink:    string;
}

interface GCalStore {
  events:      GCalEvent[];
  connected:   boolean;
  loading:     boolean;
  error:       string | null;
  accessToken: string | null;

  connect:     () => Promise<void>;
  disconnect:  () => void;
  fetchEvents: () => Promise<void>;
}

const CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID ?? "";
const SCOPES    = "https://www.googleapis.com/auth/calendar.readonly";

function colorFromEvent(event: any): string {
  const colorMap: Record<string, string> = {
    "1": "#7986CB", "2": "#33B679", "3": "#8E24AA", "4": "#E67C73",
    "5": "#F6BF26", "6": "#F4511E", "7": "#039BE5", "8": "#616161",
    "9": "#3F51B5", "10": "#0B8043", "11": "#D50000",
  };
  return colorMap[event.colorId] ?? "#6C5CE7";
}

function parseEventDate(dt: { dateTime?: string; date?: string }): { iso: string; allDay: boolean } {
  if (dt.dateTime) return { iso: dt.dateTime, allDay: false };
  return { iso: dt.date + "T00:00:00", allDay: true };
}

export const useGCalStore = create<GCalStore>()(
  persist(
    (set, get) => ({
      events:      [],
      connected:   false,
      loading:     false,
      error:       null,
      accessToken: null,

      connect: async () => {
        if (!CLIENT_ID) {
          set({ error: "Configurá VITE_GCAL_CLIENT_ID en tu .env" });
          return;
        }
        return new Promise((resolve) => {
          const client = (window as any).google?.accounts?.oauth2?.initTokenClient({
            client_id: CLIENT_ID,
            scope:     SCOPES,
            callback:  async (resp: any) => {
              if (resp.error) {
                set({ error: "No se pudo conectar con Google Calendar" });
                resolve();
                return;
              }
              set({ accessToken: resp.access_token, connected: true, error: null });
              await get().fetchEvents();
              resolve();
            },
          });
          client?.requestAccessToken();
        });
      },

      disconnect: () => {
        const token = get().accessToken;
        if (token) {
          (window as any).google?.accounts?.oauth2?.revoke(token);
        }
        set({ connected: false, accessToken: null, events: [], error: null });
      },

      fetchEvents: async () => {
        const token = get().accessToken;
        if (!token) return;
        set({ loading: true, error: null });

        try {
          const now      = new Date();
          const timeMin  = now.toISOString();
          const timeMax  = new Date(now.getTime() + 30 * 86400000).toISOString(); // 30 días

          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
            `&singleEvents=true&orderBy=startTime&maxResults=50`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.status === 401) {
            // Token expirado
            set({ connected: false, accessToken: null, error: "Sesión expirada. Reconectá Google Calendar." });
            return;
          }

          const data = await res.json();
          const events: GCalEvent[] = (data.items ?? []).map((e: any) => {
            const start = parseEventDate(e.start);
            const end   = parseEventDate(e.end);
            return {
              id:          e.id,
              summary:     e.summary ?? "(Sin título)",
              description: e.description ?? null,
              start:       start.iso,
              end:         end.iso,
              allDay:      start.allDay,
              color:       colorFromEvent(e),
              htmlLink:    e.htmlLink ?? "",
            };
          });

          set({ events, loading: false });
        } catch {
          set({ error: "Error al cargar eventos de Google Calendar", loading: false });
        }
      },
    }),
    {
      name: "studymap-gcal",
      partialize: s => ({ connected: s.connected, accessToken: s.accessToken }),
    }
  )
);