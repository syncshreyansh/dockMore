import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import ProviderIcon from '../components/ui/ProviderIcon';
import ProgressBar from '../components/ui/ProgressBar';
import PillButton from '../components/ui/PillButton';
import SyncButton from '../components/ui/SyncButton';
import ConfirmModal from '../components/ui/ConfirmModal';
import ConnectAccountModal from '../components/ui/ConnectAccountModal';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../context/ToastContext';

export default function Accounts() {
  const { accounts, loading, error, syncAccount, disconnectAccount, connectAccount, refetchAccounts } = useAccounts();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [syncingId, setSyncingId] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectingProviderId, setConnectingProviderId] = useState(null);
  const [disconnectModalState, setDisconnectModalState] = useState({
    isOpen: false,
    id: null,
    name: '',
  });

  
  useEffect(() => {
    const connectedId = searchParams.get('connected');
    const errorParam = searchParams.get('error');

    if (connectedId) {
      showToast('Google Drive connected', 'success');
      if (typeof refetchAccounts === 'function') {
        refetchAccounts();
      }
      setSearchParams({}, { replace: true });
    } else if (errorParam) {
      showToast(`Connection failed: ${errorParam}`, 'error');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, refetchAccounts]);

  const handleSync = async (id, name) => {
    setSyncingId(id);
    try {
      await syncAccount(id);
      showToast(`Synced ${name} successfully`, 'success');
    } catch (err) {
      showToast(`Failed to sync ${name}: ${err.message}`, 'error');
      throw err;
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenDisconnect = (id, name) => {
    setDisconnectModalState({
      isOpen: true,
      id,
      name,
    });
  };

  const handleConfirmDisconnect = async () => {
    if (disconnectModalState.id) {
      try {
        await disconnectAccount(disconnectModalState.id);
        showToast(`Disconnected ${disconnectModalState.name}`, 'info');
      } catch (err) {
        showToast(`Failed to disconnect: ${err.message}`, 'error');
      }
    }
    setDisconnectModalState({ isOpen: false, id: null, name: '' });
  };

  const handleProviderSelect = async (prov) => {
    setConnectingProviderId(prov.id);
    try {
      await connectAccount(prov.id);
      
    } catch (err) {
      setConnectingProviderId(null);
      showToast(err.message || 'Failed to initiate connection', 'error');
    }
  };

  const handleReconnect = async (account) => {
    setConnectingProviderId(account.id);
    try {
      await connectAccount(account.provider);
    } catch (err) {
      setConnectingProviderId(null);
      showToast(`Could not reconnect ${account.name}: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {error && <div role="alert" className="dm-notice">Could not load cloud accounts: {error} <button className="ml-2 underline" onClick={() => refetchAccounts().catch(() => {})}>Retry</button></div>}
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted font-medium">
          {accounts.length} connected storage accounts
        </span>

        <PillButton
          variant="solid"
          size="sm"
          icon={Plus}
          onClick={() => setShowConnectModal(true)}
        >
          Connect Account
        </PillButton>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-muted">
            Loading cloud accounts...
          </div>
        ) : (
          accounts.map((account) => {
            const isExpired = account.status === 'expired';
            const isSyncing = syncingId === account.id;
            const usedPercent = Math.round(
              Number.isFinite(account.usedStorageGB) && Number.isFinite(account.totalStorageGB)
                ? (account.usedStorageGB / (account.totalStorageGB || 1)) * 100
                : 0
            );

            return (
              <div
                key={account.id}
                className="bg-surface rounded-figma p-6 flex flex-col justify-between relative shadow-sm"
              >
                <div>
                  
                  <div className="flex items-start justify-between gap-3">
                    <ProviderIcon
                      provider={account.provider}
                      size="lg"
                      withBackground
                    />

                    
                    <span role="status" className={`shrink-0 text-right text-xs ${isExpired ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>
                      {isExpired ? 'Reconnect required' : 'Connected'}
                    </span>
                  </div>

                  
                  <div className="mt-4">
                    <h3 className="text-base font-semibold text-ink truncate leading-tight">
                      {account.name}
                    </h3>
                    <p className="text-xs text-muted truncate mt-0.5 font-medium">
                      {account.email}
                    </p>
                  </div>

                  
                  <div className="mt-5">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                      <span className="text-ink">
                        {Number.isFinite(account.usedStorageGB) ? `${account.usedStorageGB} GB` : 'Unavailable'} of {Number.isFinite(account.totalStorageGB) ? `${account.totalStorageGB} GB` : 'Unknown'}
                      </span>
                      <span className="text-muted">{usedPercent}%</span>
                    </div>

                    <ProgressBar
                      value={account.usedStorageGB || 0}
                      max={account.totalStorageGB || 1}
                      height="h-2"
                    />

                    <div className="flex items-center justify-between text-[11px] text-muted mt-2">
                      <span>{account.fileCount} indexed files</span>
                      <span>Synced {account.lastSynced}</span>
                    </div>
                  </div>
                </div>

                
                <div className="mt-6 pt-4 border-t border-track/50 flex items-center justify-between gap-2">
                  {isExpired ? (
                    <PillButton
                      variant="solid"
                      size="xs"
                      icon={RefreshCw}
                      onClick={() => handleReconnect(account)}
                      disabled={connectingProviderId === account.id}
                    >
                      {connectingProviderId === account.id ? 'Reconnecting…' : 'Reconnect'}
                    </PillButton>
                  ) : (
                    <SyncButton
                      onSync={() => handleSync(account.id, account.name)}
                      isSyncingProp={isSyncing}
                    />
                  )}

                  <PillButton
                    variant="danger"
                    size="xs"
                    icon={Trash2}
                    onClick={() => handleOpenDisconnect(account.id, account.name)}
                  >
                    Disconnect
                  </PillButton>
                </div>
              </div>
            );
          })
        )}

        
        <button
          type="button"
          data-dark-hover-exempt
          onClick={() => setShowConnectModal(true)}
          className="rounded-figma bg-sidebar p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[260px] shadow-sm cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-ink">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">Connect New Account</h4>
            <p className="text-xs text-muted max-w-[200px] mt-1">
              Connect another Google Drive account.
            </p>
          </div>
        </button>
      </div>

      
      <ConnectAccountModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        connectingProviderId={connectingProviderId}
        onProviderSelect={handleProviderSelect}
      />

      
      <ConfirmModal
        isOpen={disconnectModalState.isOpen}
        title="Disconnect Account"
        message={`Are you sure you want to delete/disconnect ${disconnectModalState.name}? Its files will be unindexed from your unified dashboard.`}
        confirmLabel="Disconnect"
        variant="danger"
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setDisconnectModalState({ isOpen: false, id: null, name: '' })}
      />
    </div>
  );
}
