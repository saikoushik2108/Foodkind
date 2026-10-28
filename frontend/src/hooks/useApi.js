import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetch data for a page.
 *
 * Handles the three states every page needs (loading, error, data) without
 * swallowing failures: the error is always returned so the page can render it.
 *
 * @param {Function} fetcher async function returning the data
 * @param {Array} deps dependency list that should trigger a refetch
 * @param {{ immediate?: boolean }} options
 */
export function useApi(fetcher, deps = [], { immediate = true, autoSync = true, pollInterval = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async ({ isBackground = false } = {}) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetcherRef.current();
      if (mounted.current && result !== undefined) setData(result);
      return result;
    } catch (err) {
      if (mounted.current && !isBackground) setError(err);
      return null;
    } finally {
      if (mounted.current && !isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!immediate) {
      setLoading(false);
      return;
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Auto-sync simultaneously across tabs and on focus
  useEffect(() => {
    if (!autoSync && !pollInterval) return;

    let debounceTimer = null;
    function handleSync() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mounted.current) {
          run({ isBackground: true });
        }
      }, 150);
    }

    if (autoSync && typeof window !== 'undefined') {
      window.addEventListener('foodkind:datachange', handleSync);
      window.addEventListener('focus', handleSync);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') handleSync();
      });
    }

    let intervalTimer = null;
    if (pollInterval > 0) {
      intervalTimer = setInterval(() => {
        if (mounted.current && typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
          run({ isBackground: true });
        }
      }, pollInterval);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (intervalTimer) clearInterval(intervalTimer);
      if (autoSync && typeof window !== 'undefined') {
        window.removeEventListener('foodkind:datachange', handleSync);
        window.removeEventListener('focus', handleSync);
      }
    };
  }, [run, autoSync, pollInterval]);

  return { data, error, loading, reload: run, setData };
}

/** Readable message from any thrown value. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return '';
  return error.message || fallback;
}

/** `?page=2` style state for list pages. */
export function usePagination(initial = { page: 1, limit: 12 }) {
  const [pagination, setPagination] = useState(initial);
  const setPage = useCallback((page) => setPagination((p) => ({ ...p, page })), []);
  const reset = useCallback(() => setPagination((p) => ({ ...p, page: 1 })), []);
  return { pagination, setPagination, setPage, reset };
}
