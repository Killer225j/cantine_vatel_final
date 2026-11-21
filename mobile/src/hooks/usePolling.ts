import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  fn: () => Promise<void> | void;
  interval: number;
  enabled: boolean;
}

export const usePolling = ({ fn, interval, enabled }: UsePollingOptions) => {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const start = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      fnRef.current();
    }, interval);
  }, [interval]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fnRef.current();
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [enabled, start, stop]);

  return { start, stop };
};