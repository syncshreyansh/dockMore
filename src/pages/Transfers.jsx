import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Clock,
  Zap,
  Trash2,
  X,
} from 'lucide-react';
import ProviderIcon from '../components/ui/ProviderIcon';
import ProgressBar from '../components/ui/ProgressBar';
import PillButton from '../components/ui/PillButton';
import SlideUpModal from '../components/ui/SlideUpModal';
import CustomSelect from '../components/ui/CustomSelect';
import { useIncrementalList } from '../hooks/useIncrementalList';
import { useTransfers } from '../hooks/useTransfers';
import { useAccounts } from '../hooks/useAccounts';
import { useFiles } from '../hooks/useFiles';
import { useToast } from '../context/ToastContext';

export default function Transfers() {
  const [filterTab, setFilterTab] = useState('all'); 
  const [showModal, setShowModal] = useState(false);
  const { transfers, loading, error, refetch, addTransfer, cancelTransfer } = useTransfers(filterTab);
  const { visibleItems: visibleTransfers, hasMore, sentinelRef, loadMore } = useIncrementalList(transfers, 40, filterTab);
  const { accounts } = useAccounts();
  const { files } = useFiles();
  const { showToast } = useToast();
  const supportedAccounts = accounts.filter((account) => ['google_drive', 'google-drive'].includes(account.provider));
  const availableFiles = files.filter((file) => !file.isFolder && ['google_drive', 'google-drive'].includes(file.provider));

  
  const [sourceFileKey, setSourceFileKey] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    const sourceFile = availableFiles.find((file) => file.id === sourceFileKey);
    if (!sourceFile || !destinationAccountId) {
      showToast('Choose a source file and destination account.', 'error');
      return;
    }
    if (sourceFile.accountId === destinationAccountId) { showToast('Choose a different destination account.', 'error'); return; }
    try {
      await addTransfer({ sourceAccountId: sourceFile.accountId, sourceFileId: sourceFile.providerFileId, destinationAccountId, filename: sourceFile.name });
      showToast(`Transferred "${sourceFile.name}" successfully.`, 'success');
      setShowModal(false);
      setSourceFileKey('');
    } catch (err) { showToast(err.message || 'Transfer failed', 'error'); }
  };

  const handleCancelTransfer = async (id, filename) => {
    try { await cancelTransfer(id); showToast(`Removed transfer record for "${filename}"`, 'info'); }
    catch (err) { showToast(err.message || 'Could not remove transfer record', 'error'); }
  };

  return (
    <div className="flex flex-col gap-6">

      {error && <div role="alert" className="dm-notice">Transfers could not be loaded: {error} <button className="ml-2 underline" onClick={() => refetch().catch(() => {})}>Retry</button></div>}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-1.5 p-1 bg-track/40 rounded-figma select-none">
          {[
            { id: 'all', label: 'All Transfers' },
            { id: 'in_progress', label: 'Active Jobs' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`relative px-4 py-2 rounded-figma text-xs font-semibold transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-ink hover:bg-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="transfersTabIndicator"
                    className="absolute inset-0 bg-ink rounded-figma z-0"
                  transition={{ type: 'spring', bounce: 0.08, duration: 0.38 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <PillButton
          variant="solid"
          size="sm"
          icon={Plus}
          onClick={() => setShowModal(true)}
        >
          New Transfer
        </PillButton>
      </div>

      
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="bg-surface rounded-figma py-12 text-center text-sm text-muted">
            Loading transfers...
          </div>
        ) : transfers.length === 0 ? (
          <div className="bg-surface rounded-figma py-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-track/40 flex items-center justify-center text-ink">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">No transfers found</p>
              <p className="text-xs text-muted mt-0.5">
                Copy a file between your connected Google Drive accounts.
              </p>
            </div>
            <PillButton
              variant="solid"
              size="sm"
              icon={Plus}
              onClick={() => setShowModal(true)}
              className="mt-2"
            >
              New Transfer
            </PillButton>
          </div>
        ) : (
          visibleTransfers.map((item) => {
            const isCompleted = item.status === 'completed';
            const isActive = item.status === 'in_progress';

            return (
              <div
                key={item.id}
                className="bg-surface rounded-figma p-5 flex flex-col gap-3 hover:bg-white transition-colors duration-150 relative group"
              >
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    
                    <div className="flex items-center gap-2 bg-track/40 px-3 py-1.5 rounded-figma shrink-0">
                      <ProviderIcon provider={item.sourceProvider} size="xs" />
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                      <ProviderIcon provider={item.destinationProvider} size="xs" />
                    </div>

                    
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-ink truncate leading-tight">
                        {item.filename}
                      </h4>
                      <p className="text-xs text-muted truncate mt-0.5 font-medium">
                        {item.sourceAccount} → {item.destinationAccount}
                      </p>
                    </div>
                  </div>

                  
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <span className="text-xs font-semibold text-ink">{item.size}</span>

                    {isCompleted ? (
                      <div className="flex items-center gap-1.5 bg-ink text-white text-xs font-semibold px-3 py-1 rounded-figma">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </div>
                    ) : item.status === 'failed' ? (
                      <div className="text-xs font-semibold text-red-600 px-3 py-1">Failed</div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-track text-ink text-xs font-semibold px-3 py-1 rounded-figma">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{item.speed || 'Transferring'}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCancelTransfer(item.id, item.filename)}
                      disabled={isActive}
                      className="p-1.5 rounded-full text-muted hover:text-red-600 hover:bg-black/5 transition-colors"
                      title={isActive ? 'Running transfer cannot be cancelled' : 'Remove transfer record'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                
                {isActive && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Transferring {item.filename} on the server</span>
                      <span className="font-semibold text-ink">{Number.isFinite(item.progress) ? `${item.progress}%` : 'Progress unavailable'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ETA: unavailable
                      </span>
                      <span>Cloud transfer</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {hasMore && !loading && <div ref={sentinelRef} className="flex justify-center py-4"><PillButton size="sm" variant="ghost" onClick={loadMore}>Show more transfers</PillButton></div>}
      </div>

      
      <SlideUpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-lg w-full flex flex-col gap-5 relative shadow-menu"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">New Transfer</h3>
            <p className="text-xs text-muted mt-0.5">
              Transfer a file between two connected Google Drive accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>

        <form onSubmit={handleCreateTransfer} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Google Drive file</label>
            <CustomSelect value={sourceFileKey} onChange={setSourceFileKey} options={availableFiles.map((file) => ({ value: file.id, label: `${file.name} (${file.accountEmail})` }))} placeholder="Select a connected Drive file" />
            {availableFiles.length === 0 && <p className="mt-1 text-xs text-muted">No files are available. Connect Google Drive and load files first.</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Source Account
              </label>
              <p className="px-4 py-2.5 rounded-figma bg-white text-sm text-ink">{availableFiles.find((file) => file.id === sourceFileKey)?.accountEmail || 'Selected file account'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Destination Google Drive Account
              </label>
              <CustomSelect
                value={destinationAccountId}
                onChange={setDestinationAccountId}
                options={supportedAccounts.map((account) => ({ value: account.id, label: account.email }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4">
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </PillButton>
            <PillButton variant="solid" size="sm" type="submit">
              Start Transfer
            </PillButton>
          </div>
        </form>
      </SlideUpModal>
    </div>
  );
}
