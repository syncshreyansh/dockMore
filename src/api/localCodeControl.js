import { apiClient } from '../lib/apiClient';

const BRIDGE_BASE = 'http://127.0.0.1:45771';

export async function runLocalCodeAction(projectId, action, body = {}) {
  try {
    return await apiClient.post(`${BRIDGE_BASE}/projects/${projectId}/${action}`, body);
  } catch (err) {
    if (err.status) throw err;
    try {
      return await apiClient.post(`/api/code-projects/${projectId}/local/${action}`, body);
    } catch (fallbackError) {
      if (fallbackError.status === 409) {
        throw new Error(`${fallbackError.message} Start dockmore bridge on the project computer if this website runs on another server.`);
      }
      throw fallbackError;
    }
  }
}
