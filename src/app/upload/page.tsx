// Legacy redirect — /upload was the standalone v2 upload-only flow
// before the integration into /check Step 4. Bookmarks and any old
// marketing links land here and bounce to the main wizard.
//
// The /api/upload/floorplan + /api/upload/floorplan/[id] endpoints
// stay — Step4Upload in the wizard is the only caller now.

import { permanentRedirect } from "next/navigation";

export default function LegacyUploadRedirect(): never {
  permanentRedirect("/check");
}
