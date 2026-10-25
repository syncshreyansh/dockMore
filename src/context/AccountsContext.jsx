import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  getAccounts,
  getUserProfile,
  syncAccount as apiSyncAccount,
  disconnectAccount as apiDisconnectAccount,
} from '../api/accounts';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './AuthContext';

const AccountsContext = createContext(null);

export function AccountsProvider({ children }) {
  const { user: authUser, signOut: authSignOut } = useAuth();
  const authUserId = authUser?.id || null;

  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const activeUserId = useRef(authUserId);
  activeUserId.current = authUserId;
  const loadedUserId = useRef(null);
  const inFlight = useRef(null);

  const fetchAccountsAndUser = useCallback(async (options = {}) => {
    if (!authUserId) {
      loadedUserId.current = null;
      setAccounts([]);
      setUser(null);
      setLoading(false);
      return;
    }
    if (inFlight.current?.userId === authUserId) return inFlight.current.promise;
    const firstLoad = loadedUserId.current !== authUserId;
    if (firstLoad) {
      setAccounts([]);
      setUser(null);
      setLoading(true);
    }
    if (firstLoad || !options.silent) setError(null);
    const promise = Promise.all([getAccounts(), getUserProfile()]).then(([fetchedAccounts, fetchedUser]) => {
      if (activeUserId.current !== authUserId) return;
      setAccounts(fetchedAccounts);
      setUser(fetchedUser);
      loadedUserId.current = authUserId;
      setError(null);
    }).catch((err) => {
      if (activeUserId.current !== authUserId) return;
      console.error('[AccountsProvider] Failed to fetch accounts:', err);
      setError(err.message);
    }).finally(() => {
      if (activeUserId.current === authUserId) setLoading(false);
      if (inFlight.current?.userId === authUserId) inFlight.current = null;
    });
    inFlight.current = { userId: authUserId, promise };
    return promise;
  }, [authUserId]);

  useEffect(() => {
    fetchAccountsAndUser();
  }, [fetchAccountsAndUser]);

  useEffect(() => {
    if (!authUserId) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchAccountsAndUser({ silent: true });
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [authUserId, fetchAccountsAndUser]);

  const syncAccount = useCallback(async (id) => {
    try {
      const res = await apiSyncAccount(id);
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, lastSynced: 'Just now', lastSyncedAt: res.syncedAt, status: 'active', fileCount: res.fileCount ?? acc.fileCount } : acc
        )
      );
      return res;
    } catch (err) {
      setError(err.message);
      if (/revoked|expired|reconnect/i.test(err.message)) await fetchAccountsAndUser({ silent: true });
      throw err;
    }
  }, [fetchAccountsAndUser]);

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
      const result = await apiClient.post('/api/auth/google/url');
      if (!result?.url) throw new Error('The server did not return a Google authorization URL.');
      window.location.href = result.url;
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

  const accountsReady = Boolean(authUserId && loadedUserId.current === authUserId);

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        authUserId,
        accountsReady,
        user,
        isAuthenticated: Boolean(authUser),
        loading: loading || Boolean(authUserId && !accountsReady && !error),
        error,
        syncAccount,
        disconnectAccount,
        connectAccount,
        updateUser,
        signOut: authSignOut,
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
