import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { mockTransfers } from '../api/mockData';

const TransfersContext = createContext(null);

export function TransfersProvider({ children }) {
  const [transfers, setTransfers] = useState(() => {
    return [...mockTransfers];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    const interval = setInterval(() => {
      setTransfers((prev) => {
        const hasActive = prev.some((t) => t.status === 'in_progress');
        if (!hasActive) return prev;

        return prev.map((item) => {
          if (item.status !== 'in_progress') return item;

          const currentProgress = item.progress || 0;
          const increment = Math.floor(Math.random() * 14) + 8; 
          const newProgress = Math.min(100, currentProgress + increment);

          if (newProgress >= 100) {
            return {
              ...item,
              progress: 100,
              status: 'completed',
              speed: null,
              eta: null,
              timestamp: 'Just now',
            };
          }

          
          const remainingPct = 100 - newProgress;
          const secondsLeft = Math.max(1, Math.round((remainingPct / 20) * 2));
          const etaString = `${secondsLeft}s remaining`;

          return {
            ...item,
            progress: newProgress,
            eta: etaString,
          };
        });
      });
    }, 850);

    return () => clearInterval(interval);
  }, []);

  const addTransfer = useCallback(async (transferData) => {
    const newTransfer = {
      id: `tr-${Date.now()}`,
      status: 'in_progress',
      progress: 0,
      speed: `${(Math.random() * 15 + 10).toFixed(1)} MB/s`,
      eta: '8s remaining',
      timestamp: 'Just now',
      ...transferData,
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    return newTransfer;
  }, []);

  const cancelTransfer = useCallback((id) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TransfersContext.Provider
      value={{
        transfers,
        loading,
        error,
        addTransfer,
        cancelTransfer,
        refetch: async () => {},
      }}
    >
      {children}
    </TransfersContext.Provider>
  );
}

export function useTransfersContext() {
  const context = useContext(TransfersContext);
  if (!context) {
    throw new Error('useTransfersContext must be used within a TransfersProvider');
  }
  return context;
}


