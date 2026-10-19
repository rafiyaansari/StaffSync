import { useEffect } from 'react';

/** Calls handler when a pointer goes down outside every supplied ref. */
export default function useClickOutside(refs, handler) {
  useEffect(() => {
    const refList = Array.isArray(refs) ? refs : [refs];
    function onPointerDown(event) {
      const inside = refList.some((ref) => ref.current && ref.current.contains(event.target));
      if (!inside) handler(event);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [refs, handler]);
}
