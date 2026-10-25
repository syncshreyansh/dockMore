import React, { useEffect, useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import CustomSelect from './CustomSelect';
import PillButton from './PillButton';
import { useFiles } from '../../hooks/useFiles';
import { useAccounts } from '../../hooks/useAccounts';
import { useToast } from '../../context/ToastContext';

export default function CreateFolderModal({ isOpen, onClose }) {
  const { createFolder, currentFolderKey } = useFiles();
  const { accounts } = useAccounts();
  const driveAccounts = accounts.filter((account) => ['google_drive', 'google-drive'].includes(account.provider));
  const { showToast } = useToast();

  const [folderName, setFolderName] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id || '1'
  );
  useEffect(() => {
    if (isOpen && currentFolderKey) setSelectedAccountId(currentFolderKey.split('::')[0]);
  }, [isOpen, currentFolderKey]);

  const currentAccount =
    driveAccounts.find((a) => a.id === selectedAccountId) || driveAccounts[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      showToast('Enter a folder name', 'error');
      return;
    }

    try {
      if (currentFolderKey && !currentFolderKey.startsWith(`${currentAccount?.id}::`)) throw new Error('Choose the account that owns this folder');
      await createFolder({ name: folderName.trim(), parentId: currentFolderKey, accountId: currentAccount?.id, provider: currentAccount?.provider, providerName: currentAccount?.providerName, accountEmail: currentAccount?.email });
      showToast(`Created folder "${folderName.trim()}"`, 'success');
      setFolderName('');
      onClose();
    } catch (err) { showToast(err.message || 'Folder creation failed', 'error'); }
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-menu"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-figma bg-track/30 flex items-center justify-center text-ink shrink-0">
            <FolderPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">New Folder</h3>
            <p className="text-xs text-muted mt-0.5">Create a folder on your cloud storage</p>
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Folder Name
          </label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Marketing assets"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-figma bg-white shadow-sm text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Cloud Storage Account
          </label>
          <CustomSelect
            value={selectedAccountId}
            onChange={(val) => setSelectedAccountId(val)}
            options={driveAccounts.map((acc) => ({
              value: acc.id,
              label: `${acc.providerName} (${acc.name} - ${acc.email})`,
            }))}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="solid" size="sm" type="submit">
            Create Folder
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
