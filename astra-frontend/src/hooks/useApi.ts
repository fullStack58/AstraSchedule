// src/hooks/useApi.ts
import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi<T>(
  fetcher: () => Promise<{ data: T; count?: number }>,
  deps: unknown[] = []
) {
  const [data,    setData]    = useState<T | null>(null);
  const [count,   setCount]   = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (mounted.current) {
        setData(res.data);
        setCount(res.count);
      }
    } catch (e: unknown) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      if (mounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, count, loading, error, reload: load };
}
