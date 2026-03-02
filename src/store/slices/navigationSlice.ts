export type View = "list" | "upload" | "roadmap" | "calendar" | "sprint" | "schedule";

export interface NavigationSlice {
  view: View;
  setView: (view: View) => void;
  goToList: () => void;
}

export const createNavigationSlice = <S extends NavigationSlice>(
  set: (fn: (state: S) => void) => void,
  _get: () => S
): NavigationSlice => ({
  view: "list",

  setView: (view) => set((state) => { state.view = view; }),

  goToList: () => set((state) => { state.view = "list"; }),
});