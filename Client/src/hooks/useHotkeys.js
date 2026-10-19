import { useEffect } from 'react';

/**
 * useHotkeys('mod+k', handler)
 * 'mod' maps to ⌘ on macOS and Ctrl elsewhere.
 */
export default function useHotkeys(combo, handler) {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+');
    const key = parts.find((part) => !['mod', 'ctrl', 'shift', 'alt'].includes(part));
    function onKeyDown(event) {
      const mod = parts.includes('mod');
      const ctrl = parts.includes('ctrl');
      const shift = parts.includes('shift');
      const alt = parts.includes('alt');
      const modPressed = event.metaKey || event.ctrlKey;
      if (mod && !modPressed) return;
      if (ctrl && !event.ctrlKey) return;
      if (shift && !event.shiftKey) return;
      if (alt && !event.altKey) return;
      if (event.key.toLowerCase() !== key) return;
      handler(event);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo, handler]);
}
