import React, { useState, useEffect } from 'react';
import { X, Check, Cloud } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';
import ProviderIcon from './ProviderIcon';
import { useAccounts } from '../../hooks/useAccounts';
import { useToast } from '../../context/ToastContext';

export default function ChangeBackupAccountModal({
  isOpen,
  onClose,
  project,
  onUpdateAccount,
}) {
  const { accounts } = useAccounts();
  const { showToast } = useToast();

  const [selectedAccountId, setSelectedAccountId] = useState('');

  
  useEffect(() => {
    if (project && accounts.length > 0) {
      const match =
        accounts.find((a) => a.id === project.accountId || a.email === project.accountEmail) ||
        accounts[0];
      setSelectedAccountId(match ? match.id : accounts[0].id);
    }
  }, [project, accounts, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selected = accounts.find((a) => a.id === selectedAccountId);
    if (!selected) {
      showToast('Please select a valid cloud account.', 'error');
      return;
    }

    onUpdateAccount?.(project, {
      accountId: selected.id,
      provider: selected.provider,
      accountEmail: selected.email,
    });

    showToast(
      `Backup account for "${project.name}" changed to ${selected.email}`,
      'success'
    );
    onClose();
  };

  if (!project) return null;

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col gap-5 relative shadow-2xl"
    >
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5 text-ink" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Change Backup Account</h3>
            <p className="text-xs text-muted mt-0.5">
              Select which connected cloud account stores snapshots for{' '}
              <span className="font-semibold text-ink">{project.name}</span>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </button>
      </div>

      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {accounts.map((acc) => {
            const isSelected = acc.id === selectedAccountId;
            const isCurrent =
              acc.id === project.accountId || acc.email === project.accountEmail;

            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccountId(acc.id)}
                className={`w-full p-3.5 rounded-2xl text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-white shadow-md ring-2 ring-ink'
                    : 'bg-white/60 hover:bg-white shadow-xs border border-transparent hover:border-black/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
                    <ProviderIcon provider={acc.provider} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink truncate">
                        {acc.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-black/5 text-muted">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {acc.email}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-ink text-white'
                        : 'border border-black/20 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/5">
          <PillButton
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            Cancel
          </PillButton>
          <PillButton
            type="submit"
            variant="solid"
            size="md"
          >
            Save Changes
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
