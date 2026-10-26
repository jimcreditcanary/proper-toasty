"use client";

// Toolbar button that opens the NewUserDialog. Lives next to the
// Export CSV link on /admin/users.

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { NewUserDialog } from "./new-user-dialog";

export function NewUserButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-coral hover:bg-coral-dark text-white text-xs font-semibold transition-colors"
      >
        <UserPlus className="w-3 h-3" />
        New user
      </button>
      {open && <NewUserDialog onClose={() => setOpen(false)} />}
    </>
  );
}
