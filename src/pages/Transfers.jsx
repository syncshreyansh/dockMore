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
import { useTransfers } from '../hooks/useTransfers';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../context/ToastContext';

const PROVIDER_OPTIONS = [
  { value: 'google-drive', label: 'Google Drive' },
  { value: 'onedrive', label: 'OneDrive' },
  { value: 'mega', label: 'MEGA' },
  { value: 'dropbox', label: 'Dropbox' },
];

export default function Transfers() {
  const [filterTab, setFilterTab] = useState('all'); 
  const [showModal, setShowModal] = useState(false);
  const { transfers, loading, addTransfer, cancelTransfer } = useTransfers(filterTab);
  const { accounts } = useAccounts();
  const { showToast } = useToast();

  
  const [formData, setFormData] = useState({
    filename: '',
    size: '120 MB',
    sourceProvider: 'google-drive',
    sourceAccount: 'mailshreyanshhere@gmail.com',
    destinationProvider: 'onedrive',
    destinationAccount: 'work@domain.com',
  });

  const handleCreateTransfer = (e) => {
    e.preventDefault();
    if (!formData.filename.trim()) {
      showToast('Please enter a file name.', 'error');
      return;
    }

    addTransfer({
      filename: formData.filename.trim(),
      size: formData.size || '50 MB',
      sourceProvider: formData.sourceProvider,
      sourceAccount: formData.sourceAccount,
      destinationProvider: formData.destinationProvider,
      destinationAccount: formData.destinationAccount,
    });

    showToast(`Started direct transfer for "${formData.filename}"`, 'success');
    setShowModal(false);
    setFormData({
      filename: '',
      size: '120 MB',
      sourceProvider: 'google-drive',
      sourceAccount: 'mailshreyanshhere@gmail.com',
      destinationProvider: 'onedrive',
      destinationAccount: 'work@domain.com',
    });
  };

  const handleCancelTransfer = (id, filename) => {
    cancelTransfer(id);
    showToast(`Cancelled transfer "${filename}"`, 'info');
  };

  return (
    <div className="flex flex-col gap-6">
      
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
                className={`relative px-4 py-2 text-xs font-semibold transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-ink hover:bg-white rounded-figma'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="transfersTabIndicator"
                    className="absolute inset-0 bg-ink rounded-figma z-0"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <PillButton
          variant="solid"
          size="md"
          icon={Plus}
          onClick={() => setShowModal(true)}
        >
          New Transfer
        </PillButton>
      </div>

      
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="bg-surface rounded-2xl py-12 text-center text-sm text-muted">
            Loading transfers...
          </div>
        ) : transfers.length === 0 ? (
          <div className="bg-surface rounded-2xl py-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-track/40 flex items-center justify-center text-ink">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">No transfers found</p>
              <p className="text-xs text-muted mt-0.5">
                Start a high-speed cloud-to-cloud transfer to move files between your accounts.
              </p>
            </div>
            <PillButton
              variant="solid"
              size="sm"
              icon={Plus}
              onClick={() => setShowModal(true)}
              className="mt-2"
            >
              Start First Transfer
            </PillButton>
          </div>
        ) : (
          transfers.map((item) => {
            const isCompleted = item.status === 'completed';

            return (
              <div
                key={item.id}
                className="bg-surface rounded-2xl p-5 flex flex-col gap-3 hover:bg-white transition-colors duration-150 relative group"
              >
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    
                    <div className="flex items-center gap-2 bg-track/40 px-3 py-1.5 rounded-figma shrink-0">
                      <ProviderIcon provider={item.sourceProvider} size="xs" />
                      <ArrowRight className="w-3.5 h-3.5 text-muted" />
                      <ProviderIcon provider={item.destinationProvider} size="xs" />
                    </div>

                    
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-ink truncate leading-tight">
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
                    ) : (
                      <div className="flex items-center gap-1.5 bg-track text-ink text-xs font-semibold px-3 py-1 rounded-figma">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{item.speed || 'Transferring'}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCancelTransfer(item.id, item.filename)}
                      className="p-1.5 rounded-full text-muted hover:text-red-600 hover:bg-black/5 transition-colors"
                      title={isCompleted ? 'Clear log' : 'Cancel transfer'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                
                {!isCompleted && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{item.transferred} of {item.size}</span>
                      <span className="font-semibold text-ink">{item.progress}%</span>
                    </div>
                    <ProgressBar
                      value={item.progress}
                      max={100}
                      height="h-2"
                      fillClassName="bg-ink"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ETA: {item.eta || 'Calculating...'}
                      </span>
                      <span>Encrypted direct pipeline</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      
      <SlideUpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col gap-5 relative shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">New Cloud Transfer</h3>
            <p className="text-xs text-muted mt-0.5">
              Transfer files between any connected cloud account directly.
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
            <label className="block text-xs font-semibold text-ink mb-1.5">
              File Name
            </label>
            <input
              type="text"
              placeholder="e.g. Design_System_Export_2026.zip"
              value={formData.filename}
              onChange={(e) =>
                setFormData({ ...formData, filename: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-white shadow-sm text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              File Size (Estimate)
            </label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) =>
                setFormData({ ...formData, size: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-white shadow-sm text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Source Cloud
              </label>
              <CustomSelect
                value={formData.sourceProvider}
                onChange={(val) => {
                  const acc = accounts.find((a) => a.provider === val);
                  setFormData({
                    ...formData,
                    sourceProvider: val,
                    sourceAccount: acc ? acc.email : formData.sourceAccount,
                  });
                }}
                options={PROVIDER_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Destination Cloud
              </label>
              <CustomSelect
                value={formData.destinationProvider}
                onChange={(val) => {
                  const acc = accounts.find((a) => a.provider === val);
                  setFormData({
                    ...formData,
                    destinationProvider: val,
                    destinationAccount: acc ? acc.email : formData.destinationAccount,
                  });
                }}
                options={PROVIDER_OPTIONS}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4">
            <PillButton
              variant="ghost"
              size="md"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </PillButton>
            <PillButton variant="solid" size="md" type="submit">
              Start Transfer
            </PillButton>
          </div>
        </form>
      </SlideUpModal>
    </div>
  );
}
