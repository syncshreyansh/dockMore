import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTransfers, createTransfer as apiCreateTransfer, deleteTransfer as apiDeleteTransfer } from '../api/transfers';
import { useAuth } from './AuthContext';

const TransfersContext = createContext(null);

export function TransfersProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try { setTransfers(await getTransfers()); setError(null); }
    catch (err) { setError(err.message); throw err; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setTransfers([]); setLoading(false); return; }
    refetch().catch(() => {});
  }, [authLoading, user, refetch]);

  const addTransfer = useCallback(async (data) => {
    const temporaryId = `pending-${Date.now()}`;
    const pending = { ...data, id: temporaryId, status: 'in_progress', progress: null, speed: null, eta: null };
    setTransfers((prev) => [pending, ...prev]);
    try {
      const result = await apiCreateTransfer(data);
      setTransfers((prev) => [result, ...prev.filter((item) => item.id !== temporaryId)]);
      return result;
    } catch (err) {
      setTransfers((prev) => prev.map((item) => item.id === temporaryId ? { ...item, status: 'failed' } : item));
      throw err;
    }
  }, []);

  const cancelTransfer = useCallback(async (id) => {
    await apiDeleteTransfer(id);
    setTransfers((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <TransfersContext.Provider value={{ transfers, loading, error, addTransfer, cancelTransfer, refetch }}>
      {children}
    </TransfersContext.Provider>
  );
}

export function useTransfersContext() {
  const context = useContext(TransfersContext);
  if (!context) throw new Error('useTransfersContext must be used within a TransfersProvider');
  return context;
}
