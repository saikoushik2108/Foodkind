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
export function useApi(fetcher, deps = [], { immediate = true } = {}) {
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

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current) setError(err);
      return null;
    } finally {
      if (mounted.current) setLoading(false);
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
