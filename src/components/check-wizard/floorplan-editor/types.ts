// Public API for the FloorplanEditor component.
//
// The editor is a "controlled" component — it owns no analysis state itself,
// just emits onChange when the user does anything. The parent (Step 4) holds
// the canonical analysis and persists it through the wizard.

import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";

// V4.1 stages. Flow:
//   welcome → walls → outdoor → doors → stairs → radiators → review
//   → placing (AI) → adjust
//
// `review` shows the canonical drawing (image hidden) before the AI runs,
// so the user sees their annotated floorplan cleanly first. `adjust` is
// the final stage — clicking "Looks good" there fires onComplete which
// advances the wizard to Step 5.
export type Stage =
  | "welcome"
  | "walls"
  | "outdoor"
  | "doors"
  | "stairs"
  | "radiators"
  | "review"
  | "placing"
  | "adjust";

export interface FloorplanEditorProps {
  analysis: FloorplanAnalysis;
  onChange: (next: FloorplanAnalysis) => void;
  imageUrl: string | null;
  outdoorAsk?: boolean;
  onOutdoorConfirm?: (answer: "yes" | "no") => void;
  onRequestPlacements?: () => void;
  placementsRunning?: boolean;
  placementsError?: string | null;
  // Autorun = "Let AI do it for me" path on the welcome screen. Detects
  // walls/doors/zones AND places HP/cylinder in one pass — no drawing.
  // Same loading/error flags so the welcome screen can show the spinner
  // and surface failures inline.
  onRequestAutorun?: () => void;
  autorunRunning?: boolean;
  autorunError?: string | null;
  // Called when the user is finished — wizard should advance.
  onComplete?: () => void;
}
