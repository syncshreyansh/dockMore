import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderPlus,
  ChevronRight,
  Check,
  X,
  Trash2,
  FolderInput,
  Download,
  Share2,
  Edit3,
  LayoutGrid,
  List,
  Cloud,
} from 'lucide-react';
import FileRow from '../components/ui/FileRow';
import FileGridCard from '../components/ui/FileGridCard';
import PillButton from '../components/ui/PillButton';
import ProviderIcon from '../components/ui/ProviderIcon';
import FilePreviewModal from '../components/ui/FilePreviewModal';
import ShareModal from '../components/ui/ShareModal';
import RenameModal from '../components/ui/RenameModal';
import MoveModal from '../components/ui/MoveModal';
import CreateFolderModal from '../components/ui/CreateFolderModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import CustomSelect from '../components/ui/CustomSelect';
import { useFiles } from '../hooks/useFiles';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../context/ToastContext';

const PROVIDER_FILTERS = [
  { id: 'all', label: 'All Files' },
  { id: 'google-drive', label: 'Google Drive', icon: 'google-drive' },
  { id: 'onedrive', label: 'OneDrive', icon: 'onedrive' },
  { id: 'dropbox', label: 'Dropbox', icon: 'dropbox' },
  { id: 'mega', label: 'MEGA', icon: 'mega' },
];

export default function AllFiles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folder');
  const searchParam = searchParams.get('search');

  const {
    files,
    folders,
    loading,
    deleteFile,
    deleteFiles,
    renameFile,
    moveFile,
    moveFiles,
    toggleStar,
  } = useFiles();
  const { accounts } = useAccounts();
  const { showToast } = useToast();

  const [selectedProvider, setSelectedProvider] = useState('all');
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [sortBy, setSortBy] = useState('modified'); 
  const [viewMode, setViewMode] = useState('grid'); 
  const [selectedIds, setSelectedIds] = useState([]);

  
  const [activePreviewFile, setActivePreviewFile] = useState(null);
  const [activeShareFile, setActiveShareFile] = useState(null);
  const [activeRenameFile, setActiveRenameFile] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingFileIds, setMovingFileIds] = useState([]);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [deleteConfirmState, setDeleteConfirmState] = useState({
    isOpen: false,
    ids: [],
    title: '',
    message: '',
  });

  useEffect(() => {
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParam]);

  const currentFolder = useMemo(() => {
    if (!folderParam) return null;
    return folders.find((f) => f.id === folderParam) || null;
  }, [folderParam, folders]);

  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchesFolder = folderParam ? file.folderId === folderParam : true;
        const matchesProvider =
          selectedProvider === 'all' || file.provider === selectedProvider;
        const matchesSearch =
          !searchQuery ||
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.accountEmail.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFolder && matchesProvider && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        return 0; 
      });
  }, [files, folderParam, selectedProvider, searchQuery, sortBy]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleFileAction = (action, file) => {
    if (action === 'download') {
      showToast(`Downloading ${file.name}...`, 'success');
    } else if (action === 'share') {
      setActiveShareFile(file);
    } else if (action === 'preview') {
      setActivePreviewFile(file);
    } else if (action === 'star') {
      toggleStar(file.id);
      showToast(file.starred ? 'Removed from Starred' : 'Added to Starred', 'info');
    } else if (action === 'rename') {
      setActiveRenameFile(file);
    } else if (action === 'move') {
      setMovingFileIds([file.id]);
      setShowMoveModal(true);
    } else if (action === 'delete') {
      setDeleteConfirmState({
        isOpen: true,
        ids: [file.id],
        title: 'Delete File',
        message: `Are you sure you want to delete "${file.name}"?`,
      });
    }
  };

  const handleBulkDownload = () => {
    showToast(`Downloading ${selectedIds.length} files...`, 'success');
  };

  const handleBulkMove = () => {
    setMovingFileIds([...selectedIds]);
    setShowMoveModal(true);
  };

  const handleBulkDelete = () => {
    setDeleteConfirmState({
      isOpen: true,
      ids: [...selectedIds],
      title: 'Delete Files',
      message: `Are you sure you want to delete ${selectedIds.length} selected files?`,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmState.ids.length === 1) {
      deleteFile(deleteConfirmState.ids[0]);
      showToast('File deleted successfully', 'info');
    } else if (deleteConfirmState.ids.length > 1) {
      deleteFiles(deleteConfirmState.ids);
      showToast(`Deleted ${deleteConfirmState.ids.length} files`, 'info');
    }
    setSelectedIds((prev) =>
      prev.filter((id) => !deleteConfirmState.ids.includes(id))
    );
    setDeleteConfirmState({ isOpen: false, ids: [], title: '', message: '' });
  };

  const handleExecuteMove = (targetFolderId, newPath) => {
    if (movingFileIds.length === 1) {
      moveFile(movingFileIds[0], targetFolderId, newPath);
      showToast('Moved file successfully', 'success');
    } else if (movingFileIds.length > 1) {
      moveFiles(movingFileIds, targetFolderId, newPath);
      showToast(`Moved ${movingFileIds.length} files to ${newPath}`, 'success');
    }
    setMovingFileIds([]);
    setShowMoveModal(false);
  };

  const clearFolderFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('folder');
    setSearchParams(newParams);
  };

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-1.5 text-xs text-muted font-medium flex-wrap">
          <button
            type="button"
            onClick={clearFolderFilter}
            className="hover:text-ink transition-colors"
          >
            Root
          </button>
          <ChevronRight className="w-3 h-3" />
          <button
            type="button"
            onClick={clearFolderFilter}
            className={`hover:text-ink transition-colors ${!currentFolder ? 'text-ink font-semibold' : ''}`}
          >
            Multi-Cloud Storage
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-ink font-bold uppercase flex items-center gap-1 bg-track/40 px-2 py-0.5 rounded-figma">
                {currentFolder.name}
                <button
                  type="button"
                  onClick={clearFolderFilter}
                  className="hover:text-ink ml-0.5"
                  title="Clear folder filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </>
          )}
          {selectedProvider !== 'all' && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="capitalize">{selectedProvider.replace('-', ' ')}</span>
            </>
          )}
        </div>

        <PillButton
          variant="solid"
          size="md"
          icon={FolderPlus}
          onClick={() => setShowCreateFolderModal(true)}
          className="font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
        >
          New Folder
        </PillButton>
      </div>

      
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        {PROVIDER_FILTERS.map((filter) => {
          const isActive = selectedProvider === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedProvider(filter.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold shrink-0 transition-colors duration-150 ${
                isActive ? 'text-white' : 'text-ink hover:bg-white rounded-xl'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="filesTabIndicator"
                  className="absolute inset-0 bg-ink rounded-xl z-0"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {filter.icon && (
                  <ProviderIcon provider={filter.icon} size="sm" />
                )}
                {filter.label}
              </span>
            </button>
          );
        })}
      </div>

      
      {selectedIds.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-ink text-white p-3 px-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div
              onClick={handleSelectAll}
              className="w-5 h-5 rounded-md border border-white/60 bg-white text-ink flex items-center justify-center cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-white">
              {selectedIds.length} {selectedIds.length === 1 ? 'file' : 'files'} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PillButton
              variant="solid"
              size="xs"
              icon={Download}
              onClick={handleBulkDownload}
              className="bg-white/20 hover:bg-white/30 text-white border-none"
            >
              Download
            </PillButton>

            <PillButton
              variant="solid"
              size="xs"
              icon={FolderInput}
              onClick={handleBulkMove}
              className="bg-white/20 hover:bg-white/30 text-white border-none"
            >
              Move
            </PillButton>

            <PillButton
              variant="solid"
              size="xs"
              icon={Trash2}
              onClick={handleBulkDelete}
              className="bg-red-500/80 hover:bg-red-500 text-white border-none"
            >
              Delete
            </PillButton>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-white/70 hover:text-white px-2 py-1 font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
      ) : (
        
        <div className="flex items-center justify-between bg-[#e9e9e9] px-4 py-2.5 rounded-2xl">
          <span className="text-xs text-muted font-medium">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-track/60 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="w-[160px]">
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                options={[
                  { value: 'modified', label: 'Sort by Recent' },
                  { value: 'name', label: 'Sort by Name' },
                  { value: 'size', label: 'Sort by Size' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      
      <div className="flex flex-col gap-2">
        
        {viewMode === 'list' && (
          <div className="flex items-center justify-between px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-muted select-none">
            <div className="flex items-center gap-3 flex-1">
              <div
                onClick={handleSelectAll}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  selectedIds.length > 0 && selectedIds.length === filteredFiles.length
                    ? 'bg-ink border-ink text-white'
                    : 'border-track hover:border-ink/50 bg-white'
                }`}
                title="Select all"
              >
                {selectedIds.length > 0 && selectedIds.length === filteredFiles.length && (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </div>
              <span>Name & Location</span>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <span className="hidden sm:inline-block w-28">Cloud</span>
              <span className="w-20 text-right">Size</span>
              <span className="hidden md:inline-block w-32 text-right">Modified</span>
              <span className="w-20 text-right">Actions</span>
            </div>
          </div>
        )}

        
        {loading ? (
          <div className="bg-surface rounded-2xl py-12 text-center text-sm text-muted">
            Loading cloud files...
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-surface rounded-2xl py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-ink mb-1">
              <Cloud className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-ink">Connect your first cloud account</h3>
            <p className="text-xs text-muted max-w-sm">
              Link your Google Drive account to browse, search, and aggregate your cloud files in one unified workspace.
            </p>
            <PillButton
              variant="solid"
              size="md"
              to="/accounts"
              className="mt-2"
            >
              Connect Cloud Account
            </PillButton>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-surface rounded-2xl py-12 text-center flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-semibold text-ink">No files found</p>
            <p className="text-xs text-muted">
              {currentFolder
                ? `No files in folder "${currentFolder.name}". Try uploading files.`
                : 'Try adjusting your search query or provider filter.'}
            </p>
            {currentFolder && (
              <PillButton
                variant="ghost"
                size="sm"
                onClick={clearFolderFilter}
                className="mt-2"
              >
                View All Files
              </PillButton>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-2">
            {filteredFiles.map((file) => (
              <FileGridCard
                key={file.id}
                file={file}
                isSelected={selectedIds.includes(file.id)}
                onToggleSelect={handleToggleSelect}
                onAction={handleFileAction}
                onSelect={() => handleFileAction('preview', file)}
              />
            ))}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              isSelected={selectedIds.includes(file.id)}
              onToggleSelect={handleToggleSelect}
              onAction={handleFileAction}
              onSelect={() => handleFileAction('preview', file)}
            />
          ))
        )}
      </div>

      
      
      <FilePreviewModal
        isOpen={Boolean(activePreviewFile)}
        file={activePreviewFile}
        onClose={() => setActivePreviewFile(null)}
      />

      <ShareModal
        isOpen={Boolean(activeShareFile)}
        file={activeShareFile}
        onClose={() => setActiveShareFile(null)}
      />

      <RenameModal
        isOpen={Boolean(activeRenameFile)}
        initialName={activeRenameFile?.name || ''}
        title="Rename File"
        onRename={(newName) => {
          if (activeRenameFile) {
            renameFile(activeRenameFile.id, newName);
            showToast(`Renamed file to "${newName}"`, 'success');
          }
          setActiveRenameFile(null);
        }}
        onClose={() => setActiveRenameFile(null)}
      />

      <MoveModal
        isOpen={showMoveModal}
        fileCount={movingFileIds.length}
        onMove={handleExecuteMove}
        onClose={() => {
          setShowMoveModal(false);
          setMovingFileIds([]);
        }}
      />

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
      />

      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title={deleteConfirmState.title}
        message={deleteConfirmState.message}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteConfirmState({ isOpen: false, ids: [], title: '', message: '' })
        }
      />
    </div>
  );
}






