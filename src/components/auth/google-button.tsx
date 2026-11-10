import { useState } from "react";
import { toast } from "sonner";

import { signInWithGoogle } from "@/lib/account";
import { DARK_THEMES } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-store";

/* Colors here follow Google's sign-in branding rules, not the app theme. */
const LIGHT = "border border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F8F8F8]";
const DARK = "border border-[#8E918F] bg-[#131314] text-[#E3E3E3] hover:bg-[#1c1c1e]";

export function GoogleButton({ label = "Continue with Google", onDone }: { label?: string; onDone?: () => void }) {
  const theme = useApp((s) => s.settings.theme);
  const [busy, setBusy] = useState(false);
  const dark = DARK_THEMES.includes(theme);

  const go = async () => {
    setBusy(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in didn't finish", { description: result.error.message });
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    onDone?.();
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-[10px] rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-60",
        dark ? DARK : LIGHT,
      )}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.090 3.56-5.17 3.56-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.780-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
      </svg>
      <span>{busy ? "Opening Google…" : label}</span>
    </button>
  );
}
