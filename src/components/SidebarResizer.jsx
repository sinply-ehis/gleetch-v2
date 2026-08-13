import { useRef, useState, useCallback, useEffect } from 'react';

const MIN_WIDTH = 220;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 280;
const STORAGE_KEY = 'gleetch-sidebar-width';

// localStorage is a deliberate, documented exception here (see DATA.md) —
// but some browser configurations (private browsing, strict privacy
// settings) throw on getItem/setItem rather than just no-op. Persistence
// failing shouldn't take the resize feature itself down with it.
function safeGetStoredWidth() {
  try {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return Number.isNaN(saved) ? null : saved;
  } catch {
    return null;
  }
}
function safeStoreWidth(px) {
  try {
    localStorage.setItem(STORAGE_KEY, String(px));
  } catch {
    // fails safe: resize still works for the rest of this session, it
    // just won't be remembered on the next visit
  }
}

// Every tab (Visual/Text/Audio/Video/Web) renders its own <aside
// className="sidebar">, but all five read the same --sidebar-width CSS
// variable for their width. So a single resizer, rendered once here in
// the app shell rather than duplicated into all five tab files, is
// enough to make every tab resizable and keep the chosen width when
// switching between them. Desktop/row-layout only — on the mobile
// breakpoint .sidebar switches to width:100% (stacked above .main), so
// there's no horizontal split left to drag; the handle hides itself
// there via CSS rather than JS, see .sidebar-resizer's media query.
export default function SidebarResizer() {
  const draggingRef = useRef(false);
  // Width also lives in React state, separate from the CSS variable —
  // the variable drives the actual layout on every drag tick (bypassing
  // React for performance), this drives the ARIA value, updated only at
  // the end of a gesture rather than continuously, which is both plenty
  // for a screen reader and avoids adding re-renders to the drag path.
  // Lazy initializer (not a mount-time setState-in-effect) so the
  // restored width is correct from the very first render.
  const [width, setWidthState] = useState(() => {
    const saved = safeGetStoredWidth();
    return saved !== null ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, saved)) : DEFAULT_WIDTH;
  });

  const setWidth = useCallback((px) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, px));
    document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
    return clamped;
  }, []);

  useEffect(() => {
    const saved = safeGetStoredWidth();
    setWidth(saved !== null ? saved : DEFAULT_WIDTH);
  }, [setWidth]);

  const onMove = useCallback((clientX) => {
    if (!draggingRef.current) return;
    setWidth(clientX);
  }, [setWidth]);

  const stopDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const px = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'), 10);
    if (!Number.isNaN(px)) {
      setWidthState(px);
      safeStoreWidth(px);
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => onMove(e.clientX);
    const onTouchMove = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [onMove, stopDrag]);

  const startDrag = useCallback(() => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return (
    <div
      className="sidebar-resizer"
      onMouseDown={startDrag}
      onTouchStart={startDrag}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize effects sidebar"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuetext={`${width} pixels`}
      tabIndex={0}
      onKeyDown={(e) => {
        const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'), 10) || DEFAULT_WIDTH;
        let next;
        if (e.key === 'ArrowLeft') next = current - 16;
        else if (e.key === 'ArrowRight') next = current + 16;
        else return;
        e.preventDefault();
        const clamped = setWidth(next);
        setWidthState(clamped);
        safeStoreWidth(clamped);
      }}
    />
  );
}
