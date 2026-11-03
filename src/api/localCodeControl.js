import { apiClient } from '../lib/apiClient';

const BRIDGE_BASE = 'http://127.0.0.1:45771';

export async function runLocalCodeAction(projectId, action, body = {}) {
  try {
    return await apiClient.post(`${BRIDGE_BASE}/projects/${projectId}/${action}`, body);
  } catch (err) {
    // A bridge that was started before an action was added returns a real HTTP
    // 404 instead of a network error. Give the API's local-CLI fallback a chance
    // to handle that action so users do not have to retry after a fresh load.
    const staleBridgeRoute = action === 'interval' && err.status === 404;
    if (err.status && !staleBridgeRoute) throw err;
    try {
      return await apiClient.post(`/api/code-projects/${projectId}/local/${action}`, body);
    } catch (fallbackError) {
      if (action === 'interval' && fallbackError.status === 404) {
        throw new Error('The sync interval endpoint is unavailable. Restart the Dockmore API server and CLI bridge, then try again.');
      }
      if (fallbackError.status === 409) {
        throw new Error(`${fallbackError.message} Start dockmore bridge on the project computer if this website runs on another server.`);
      }
      throw fallbackError;
    }
  }
}
