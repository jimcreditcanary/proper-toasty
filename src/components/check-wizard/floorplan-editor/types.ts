// Public API for the FloorplanEditor component.
//
// The editor is a "controlled" component — it owns no analysis state itself,
// just emits onChange when the user does anything. The parent (Step 4) holds
// the canonical analysis and persists it through the wizard.

import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";

// V4: conversational stage flow. The editor walks the user through each
// annotation type one at a time, with a prominent Undo and a Save/Skip to
// advance. After all stages, AI places HP + cylinder, optionally asks
// follow-up questions, then shows a canonical view (uploaded image
// hidden; user's drawing IS the floorplan).
export type Stage =
  | "welcome"
  | "walls"
  | "outdoor"
  | "doors"
  | "stairs"
  | "radiators"
  | "placing"
  | "adjust"
  | "done";

export interface FloorplanEditorProps {
  analysis: FloorplanAnalysis;
  onChange: (next: FloorplanAnalysis) => void;
  imageUrl: string | null;
  outdoorAsk?: boolean;
  onOutdoorConfirm?: (answer: "yes" | "no") => void;
  onRequestPlacements?: () => void;
  placementsRunning?: boolean;
  placementsError?: string | null;
}
