import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  getAccounts,
  getUserProfile,
  syncAccount as apiSyncAccount,
  disconnectAccount as apiDisconnectAccount,
} from '../api/accounts';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const AccountsContext = createContext(null);

export function AccountsProvider({ children }) {
  const { user: authUser } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccountsAndUser = useCallback(async () => {
    if (!authUser) {
      setAccounts([]);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [fetchedAccounts, fetchedUser] = await Promise.all([
        getAccounts(),
        getUserProfile(),
      ]);
      setAccounts(fetchedAccounts);
      setUser(fetchedUser);
    } catch (err) {
      console.error('[AccountsProvider] Failed to fetch accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchAccountsAndUser();
  }, [fetchAccountsAndUser]);

  const syncAccount = useCallback(async (id) => {
    try {
      const res = await apiSyncAccount(id);
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, lastSynced: 'Just now', status: 'active' } : acc
        )
      );
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const disconnectAccount = useCallback(async (id) => {
    try {
      await apiDisconnectAccount(id);
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      return { success: true, id };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const connectAccount = useCallback(async (providerId) => {
    if (providerId === 'google-drive' || providerId === 'google_drive') {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('You must be signed in to connect a Google Drive account.');
      }
      
      window.location.href = `${API_BASE_URL}/api/auth/google/connect?token=${encodeURIComponent(token)}`;
      return null;
    }

    throw new Error(`Provider "${providerId}" is not yet supported in this stage.`);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const rotateVaultKey = useCallback(() => {
    return `vault-key-${Math.random().toString(36).substring(2, 15)}`;
  }, []);

  const exportBackup = useCallback(() => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user,
      accountsCount: accounts.length,
      accounts: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        name: a.name,
        email: a.email,
        usedStorageGB: a.usedStorageGB,
        totalStorageGB: a.totalStorageGB,
      })),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dockmore-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, [accounts, user]);

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        user,
        isAuthenticated: Boolean(authUser),
        loading,
        error,
        syncAccount,
        disconnectAccount,
        connectAccount,
        updateUser,
        signOut: async () => {},
        signIn: async () => {},
        rotateVaultKey,
        exportBackup,
        refetch: fetchAccountsAndUser,
        refetchAccounts: fetchAccountsAndUser,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccountsContext() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccountsContext must be used within an AccountsProvider');
  }
  return context;
}
