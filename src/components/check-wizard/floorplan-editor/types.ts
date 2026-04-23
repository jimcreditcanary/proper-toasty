// Public API for the FloorplanEditor component.
//
// The editor is a "controlled" component — it owns no analysis state itself,
// just emits onChange when the user does anything. The parent (Step 4) holds
// the canonical analysis and persists it through the wizard.

import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";

export type EditorMode = "radiator" | "dimension" | "extension" | "move-hp";

export interface FloorplanEditorProps {
  analysis: FloorplanAnalysis;
  onChange: (next: FloorplanAnalysis) => void;
  // Optional — when provided, the outdoor-space confirmation block renders
  // above the editor so the user can answer Yes/No.
  outdoorAsk?: boolean;
  onOutdoorConfirm?: (answer: "yes" | "no") => void;
}
