import { useEffect, useRef, useState } from 'react';

/**
 * Returns `value` at most once per `intervalMs`. The first change shows straight away; changes
 * within the interval collapse into one trailing update with the latest value.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (intervalMs <= 0) return;
    const wait = Math.max(0, lastUpdate.current + intervalMs - Date.now());
    const id = setTimeout(() => {
      lastUpdate.current = Date.now();
      setThrottled(value);
    }, wait);
    return () => clearTimeout(id);
  }, [value, intervalMs]);

  return intervalMs <= 0 ? value : throttled;
}
