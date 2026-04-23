// Public API for the FloorplanEditor component.
//
// The editor is a "controlled" component — it owns no analysis state itself,
// just emits onChange when the user does anything. The parent (Step 4) holds
// the canonical analysis and persists it through the wizard.

import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";

export type EditorMode =
  | "walls"
  | "doors"
  | "outdoor"
  | "stairs"
  | "radiators"
  | "adjust";

export interface FloorplanEditorProps {
  analysis: FloorplanAnalysis;
  onChange: (next: FloorplanAnalysis) => void;
  // URL (client-fetchable proxy) of the uploaded floorplan image — drawn as
  // the background of the canvas.
  imageUrl: string | null;
  // Optional — when provided, the outdoor-space confirmation block renders
  // above the editor so the user can answer Yes/No.
  outdoorAsk?: boolean;
  onOutdoorConfirm?: (answer: "yes" | "no") => void;
  // Callback when user presses "Find heat pump & cylinder". Parent owns the
  // AI call; editor just reports intent. `running` is passed back so the
  // button can show a loading state.
  onRequestPlacements?: () => void;
  placementsRunning?: boolean;
  placementsError?: string | null;
}
