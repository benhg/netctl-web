import { useEffect, useState } from 'react';

/** Matches Tailwind's md breakpoint, so CSS and JS agree on where mobile ends. */
const MOBILE_QUERY = '(max-width: 767px)';

/**
 * True on phone-width viewports. Also fires on resize, so dragging a desktop
 * window narrow swaps to the mobile layout rather than leaving a broken middle
 * state.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', handleChange);
    setIsMobile(query.matches);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}
