import { useEffect, useState } from 'react';

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    setMatches(media.matches);
    if (media.addEventListener) media.addEventListener('change', listener);
    else media.addListener(listener);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', listener);
      else media.removeListener(listener);
    };
  }, [query]);

  return matches;
}
