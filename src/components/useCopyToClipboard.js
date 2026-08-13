import { useState, useCallback, useRef, useEffect } from 'react';

// Every copy-to-clipboard button in the app previously gave zero visual
// confirmation that the copy succeeded — the button just did nothing
// visible. Found during a BUILD_CHECKLIST.md audit pass ("Success states
// implemented" is a real, explicit requirement). Returns [copy, justCopied]
// so a button can flip its own label briefly (e.g. "✓ COPIED") rather than
// introducing a separate toast/snackbar system — consistent with the
// existing pattern of state living in the control itself (see ScrambleText
// for the same philosophy applied to busy states).
export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), resetMs);
    }).catch(() => {});
  }, [resetMs]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return [copy, copied];
}
