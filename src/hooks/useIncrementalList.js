import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useIncrementalList(items, pageSize, resetKey) {
  const [page, setPage] = useState({ key: resetKey, limit: pageSize });
  const sentinelRef = useRef(null);
  const limit = page.key === resetKey ? page.limit : pageSize;
  useEffect(() => {
    if (page.key !== resetKey) setPage({ key: resetKey, limit: pageSize });
  }, [page.key, pageSize, resetKey]);

  const loadMore = useCallback(() => {
    setPage((current) => ({ key: resetKey, limit: Math.min((current.key === resetKey ? current.limit : pageSize) + pageSize, items.length) }));
  }, [items.length, pageSize, resetKey]);
  const hasMore = limit < items.length;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, limit]);

  const visibleItems = useMemo(() => items.slice(0, limit), [items, limit]);
  return { visibleItems, hasMore, sentinelRef, loadMore };
}
