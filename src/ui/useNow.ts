import { useEffect, useState } from 'react';

/** Current time, refreshed every animation frame while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      setNow(Date.now());
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    if (!active) {
      // One frame is enough to settle the picture, then stop.
      const stop = requestAnimationFrame(() => cancelAnimationFrame(id));
      return () => {
        cancelAnimationFrame(id);
        cancelAnimationFrame(stop);
      };
    }
    return () => cancelAnimationFrame(id);
  }, [active]);
  return now;
}
