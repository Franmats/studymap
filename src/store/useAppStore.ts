import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createNavigationSlice } from "./slices/navigationSlice";
import { createUploadSlice }     from "./slices/uploadSlice";
import { createRoadmapSlice }    from "./slices/roadmapSlice";
import { createExportSlice }     from "./slices/exportSlice";
import { createExamenSlice }     from "./slices/examenSlice";

import type { NavigationSlice }  from "./slices/navigationSlice";
import type { UploadSlice }      from "./slices/uploadSlice";
import type { RoadmapSlice }     from "./slices/roadmapSlice";
import type { ExportSlice }      from "./slices/exportSlice";
import type { ExamenSlice }      from "./slices/examenSlice";
import type { MateriaRow }       from "../types";

export type AppStore = NavigationSlice & UploadSlice & RoadmapSlice & ExportSlice & ExamenSlice;

export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      ...createNavigationSlice(set, get),
      ...createUploadSlice(set, get),
      ...createRoadmapSlice(set, get),
      ...createExportSlice(set, get),
      ...createExamenSlice(set, get),

      // ── Acciones compuestas ───────────────────────────────────────────────
      loadMateria: (materia: MateriaRow) => set((state) => {
        state.activeMateriaId = materia.id;
        state.syllabus        = materia.syllabus_json;
        state.units           = materia.units_json;
        state.view            = "roadmap";
      }),

      goToList: () => set((state) => {
        state.view        = "list";
        state.uploading   = false;
        state.fileName    = null;
        state.uploadError = null;
        state.duplicate   = null;
      }),
    })),
    {
      name: "studymap-ui-v2", // bumped version — nuevo estado
      partialize: (state) => ({
        view:            state.view,
        activeMateriaId: state.activeMateriaId,
        syllabus:        state.syllabus,
        units:           state.units,
      }),
      version: 2,
    }
  )
);