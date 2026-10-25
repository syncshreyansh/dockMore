import { useCallback, useEffect, useState } from 'react';
import { apiClient, API_BASE_URL } from '../lib/apiClient';

export default function useMediaSource(file, kind = 'content', enabled = true) {
  const [state, setState] = useState({ url: null, error: null, loading: false });
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion((value) => value + 1), []);
  const accountId = file?.accountId;
  const fileId = file?.targetId || file?.providerFileId;
  useEffect(() => {
    let active = true;
    setState({ url: null, error: null, loading: Boolean(enabled && accountId && fileId) });
    if (!enabled || !accountId || !fileId) return undefined;
    apiClient.post('/api/media/source', { accountId, fileId, kind }).then((result) => {
      if (active) setState({ url: `${API_BASE_URL}${result.url}`, error: null, loading: false });
    }).catch((error) => { if (active) setState({ url: null, error: error.message, loading: false }); });
    return () => { active = false; };
  }, [accountId, fileId, kind, enabled, version]);
  return { ...state, retry };
}
