import { useEffect } from 'react';

/** Locks page scroll while a modal/drawer is open. */
export default function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}
