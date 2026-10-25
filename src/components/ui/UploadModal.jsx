import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, File, CheckCircle2, Cloud, Folder } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import CustomSelect from './CustomSelect';
import PillButton from './PillButton';
import ProgressBar from './ProgressBar';
import ProviderIcon from './ProviderIcon';
import { useFiles } from '../../hooks/useFiles';
import { useAccounts } from '../../hooks/useAccounts';
import { useToast } from '../../context/ToastContext';

export default function UploadModal({
  isOpen,
  defaultFolderId = null,
  onClose,
}) {
  const { addFile, folders } = useFiles();
  const { accounts } = useAccounts();
  const driveAccounts = accounts.filter((account) => ['google_drive', 'google-drive'].includes(account.provider));
  const { showToast } = useToast();

  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(
    defaultFolderId?.split('::')[0] || accounts[0]?.id || ''
  );
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId || 'root');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (isOpen && defaultFolderId) {
      setSelectedFolderId(defaultFolderId);
      setSelectedAccountId(defaultFolderId.split('::')[0]);
    }
  }, [isOpen, defaultFolderId]);

  const currentAccount =
    driveAccounts.find((a) => a.id === selectedAccountId) || driveAccounts[0];

  const formatFileSize = (bytes) => {
    if (!bytes) return '1.2 MB';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleStartUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    if (!currentAccount) {
      showToast('Connect a Google Drive account before uploading.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const folderAccountId = selectedFolderId === 'root' ? null : selectedFolderId.split('::')[0];
    if (folderAccountId && folderAccountId !== currentAccount.id) {
      setIsUploading(false);
      showToast('Choose the account that owns this destination folder.', 'error');
      return;
    }

    try {
      for (const file of selectedFiles) {
        await addFile({
          file,
          accountId: currentAccount.id,
          parentId: selectedFolderId === 'root' ? undefined : folders.find((folder) => folder.id === selectedFolderId)?.targetId || selectedFolderId.split('::').slice(1).join('::'),
          folderId: selectedFolderId === 'root' ? null : selectedFolderId,
          provider: currentAccount.provider,
          accountEmail: currentAccount.email,
        });
        setUploadProgress(Math.round(((selectedFiles.indexOf(file) + 1) / selectedFiles.length) * 100));
      }
      setIsUploading(false);
      onClose();
      showToast(`Uploaded ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'} to ${currentAccount.providerName}`, 'success');
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      showToast(err.message || 'Upload failed', 'error');
    }
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-lg w-full flex flex-col gap-5 relative shadow-menu max-h-[90vh] overflow-y-auto"
      closeOnBackdrop={!isUploading}
    >
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Upload Files</h3>
          <p className="text-xs text-muted mt-0.5">
            Choose files and a Google Drive account.
          </p>
        </div>
        <button
          type="button"
          disabled={isUploading}
          onClick={onClose}
          className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </button>
      </div>

      <form onSubmit={handleStartUpload} className="flex flex-col gap-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Destination Cloud
            </label>
            <CustomSelect
              value={selectedAccountId}
              onChange={(val) => setSelectedAccountId(val)}
            options={driveAccounts.map((acc) => ({
                value: acc.id,
                label: `${acc.providerName} (${acc.name})`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Target Folder
            </label>
            <CustomSelect
              value={selectedFolderId}
              onChange={(val) => setSelectedFolderId(val)}
              options={[
                { value: 'root', label: 'My Drive' },
                ...folders.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          </div>
        </div>

        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-figma p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-colors duration-150 ${
            isDragging
              ? 'border-ink bg-ink/5'
              : 'border-track hover:border-ink/40 bg-white/70 hover:bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-figma bg-track/40 flex items-center justify-center text-ink">
            <Upload className="w-6 h-6 stroke-[1.75]" />
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">
              Choose files or drag & drop here
            </p>
            <p className="text-xs text-muted mt-1">
              Documents, images, videos, and archives. Up to 100 MB per file.
            </p>
          </div>
        </div>

        
        {selectedFiles.length > 0 && (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            <span className="text-xs font-semibold text-ink">
              Selected Files ({selectedFiles.length})
            </span>
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-figma bg-white shadow-sm text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <File className="w-4 h-4 text-muted shrink-0" />
                  <span className="font-medium text-ink truncate max-w-[240px]">
                    {file.name}
                  </span>
                </div>
                <span className="text-muted shrink-0">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ))}
          </div>
        )}

        
        {isUploading && (
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-ink">Uploading to {currentAccount?.providerName}...</span>
              <span className="text-muted">{uploadProgress}%</span>
            </div>
            <ProgressBar value={uploadProgress} max={100} height="h-2" />
          </div>
        )}

        
        <div className="flex items-center justify-end gap-2.5 pt-3">
          <PillButton
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={onClose}
          >
            Cancel
          </PillButton>
          <PillButton
            variant="solid"
            size="sm"
            type="submit"
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
