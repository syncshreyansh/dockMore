import { apiClient } from '../lib/apiClient';
import { supabase } from '../lib/supabase';
import defaultAvatar from '../assets/icons/avatar.svg';

export async function getAccounts() {
  const data = await apiClient.get('/api/accounts');
  if (!Array.isArray(data)) throw new Error('Invalid accounts response from server');
  return data;
}

export async function getAccountById(id) {
  return await apiClient.get(`/api/accounts/${id}`);
}

export async function getUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        name: 'dockMore User',
        email: '',
        avatar: defaultAvatar,
        plan: 'Pro Aggregator',
        joined: 'September 2026',
      };
    }

    return {
      id: user.id,
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split('@')[0],
      email: user.email,
      avatar: user.user_metadata?.avatar_url || defaultAvatar,
      plan: 'Pro Aggregator',
      joined: user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : 'September 2026',
    };
  } catch (err) {
    console.error('[getUserProfile] Error getting Supabase user profile:', err);
    return {
      name: 'dockMore User',
      email: '',
      avatar: defaultAvatar,
      plan: 'Pro Aggregator',
      joined: 'September 2026',
    };
  }
}

export async function syncAccount(id) {
  return await apiClient.post(`/api/accounts/${id}/sync`);
}

export async function disconnectAccount(id) {
  return await apiClient.delete(`/api/accounts/${id}`);
}
