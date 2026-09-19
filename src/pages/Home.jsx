import React, { useState } from 'react';
import {
  ArrowRight,
  Cloud,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import FolderCard from '../components/ui/FolderCard';
import FileRow from '../components/ui/FileRow';
import FileGridCard from '../components/ui/FileGridCard';
import PillButton from '../components/ui/PillButton';
import ProviderIcon from '../components/ui/ProviderIcon';
import FilePreviewModal from '../components/ui/FilePreviewModal';
import ShareModal from '../components/ui/ShareModal';
import RenameModal from '../components/ui/RenameModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useFiles } from '../hooks/useFiles';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../context/ToastContext';

function StorageTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isFreeSpace = data.provider === 'free' || data.name === 'Free Space';

  return (
    <div className="bg-white/95 backdrop-blur-md border border-track/60 shadow-[0_4px_24px_rgba(0,0,0,0.14)] rounded-2xl p-3 min-w-[210px] text-ink select-none pointer-events-none transition-all duration-150 z-50">
      
      <div className="flex items-center justify-between gap-2 border-b border-track/40 pb-2 mb-2">
        <div className="flex items-center gap-2">
          {!isFreeSpace && data.provider ? (
            <ProviderIcon provider={data.provider} size="xs" />
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
          )}
          <span className="font-bold text-xs text-ink leading-none">
            {data.name}
          </span>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white leading-none"
          style={{ backgroundColor: isFreeSpace ? '#8A8785' : data.color }}
        >
          {data.used} GB
        </span>
      </div>

      
      {data.accounts && data.accounts.length > 0 ? (
        <div className="flex flex-col gap-1.5 mt-1">
          {data.accounts.map((acc, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[11px] text-muted font-medium"
            >
              <span className="truncate max-w-[130px]">{acc.name}</span>
              <span className="font-semibold text-ink">{acc.used}</span>
            </div>
          ))}
        </div>
      ) : isFreeSpace ? (
        <p className="text-[11px] text-muted mt-1">
          10 GB unallocated capacity across all clouds.
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { files, folders, stats, loading, downloadFile, deleteFile, renameFile, starFile } = useFiles();
  const { showToast } = useToast();

  const [filterType] = useState('All Folders');
  const [fileViewMode, setFileViewMode] = useState('grid'); 
  const [activePreviewFile, setActivePreviewFile] = useState(null);
  const [activeShareFile, setActiveShareFile] = useState(null);
  const [activeRenameFile, setActiveRenameFile] = useState(null);
  const [activeDeleteFile, setActiveDeleteFile] = useState(null);

  const handleFileAction = (action, file) => {
    switch (action) {
      case 'preview':
        setActivePreviewFile(file);
        break;
      case 'share':
        setActiveShareFile(file);
        break;
      case 'rename':
        setActiveRenameFile(file);
        break;
      case 'star':
        starFile(file.id);
        showToast(file.starred ? 'Removed from starred' : 'Added to starred', 'info');
        break;
      case 'delete':
        setActiveDeleteFile(file);
        break;
      case 'download':
        downloadFile(file);
        showToast(`Downloading ${file.name}...`, 'success');
        break;
      default:
        break;
    }
  };

  const handleConfirmDelete = () => {
    if (activeDeleteFile) {
      deleteFile(activeDeleteFile.id);
      showToast(`Deleted ${activeDeleteFile.name}`, 'info');
      setActiveDeleteFile(null);
    }
  };

  
  const chartData = stats?.storageByProvider && stats.storageByProvider.length > 0
    ? stats.storageByProvider
    : [];

  return (
    <div className="flex flex-col gap-8">
      
      {!accountsLoading && accounts.length === 0 && (
        <div className="bg-surface rounded-2xl p-6 border border-track/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-ink shrink-0">
              <Cloud className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Connect your first cloud account</h4>
              <p className="text-xs text-muted mt-0.5">
                Aggregate Google Drive into your unified workspace to access real-time storage metrics and files.
              </p>
            </div>
          </div>
          <PillButton to="/accounts" variant="solid" size="sm" className="shrink-0">
            Connect Cloud Account
          </PillButton>
        </div>
      )}

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-7">
        <div className="md:col-span-2 lg:col-span-6 bg-sidebar rounded-figma p-6 flex flex-col justify-between min-h-[190px] shadow-[0_0_4px_rgba(0,0,0,0.25)]">
          <div>
            <h4 className="text-[30px] md:text-[37px] leading-none font-semibold tracking-[-0.048em] text-ink font-sans">
              Total Storage
            </h4>
            <p className="text-sm md:text-[19px] text-muted font-normal mt-1">
              {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'} Connected
            </p>
          </div>

          <div className="flex items-end justify-between gap-4 mt-6">
            <div>
              <div className="font-sans font-semibold text-[30px] md:text-[37px] leading-none text-ink tracking-[-0.048em]">
                {stats?.totalUsedGB || 0} GB
              </div>
              <p className="text-xs text-ink font-semibold mt-1">
                of {stats?.totalCapacityGB || 0} GB used.
              </p>
            </div>

            <div className="w-24 h-24 shrink-0 relative flex items-center justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={<StorageTooltip />}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ outline: 'none', zIndex: 100 }}
                    />
                    <Pie
                      data={chartData}
                      innerRadius={26}
                      outerRadius={38}
                      paddingAngle={2}
                      dataKey="used"
                      stroke="none"
                      cursor="pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition-opacity duration-150 hover:opacity-85 focus:outline-none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-track flex items-center justify-center text-[10px] text-muted text-center font-medium">
                  0%
                </div>
              )}
            </div>
          </div>
        </div>

        <StatCard
          variant="sidebar"
          className="md:col-span-1 lg:col-span-3 min-h-[190px]"
          value={`${stats?.totalFilesCount || 1987} files`}
          valueSubtitle="across all your clouds."
          icon={Cloud}
          action={
            <PillButton
              to="/files"
              variant="solid"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              className="w-full sm:w-auto font-medium"
            >
              View all files
            </PillButton>
          }
        />

        <StatCard
          variant="sidebar"
          className="md:col-span-1 lg:col-span-3 min-h-[190px]"
          value={`${stats?.totalTransfersCount || 5} Transfers`}
          valueBadge={
            <div className="flex items-center gap-1 bg-ink text-white text-xs font-semibold px-2.5 py-0.5 rounded-figma">
              <span>1M</span>
              <ChevronDown className="w-3 h-3 text-white/70" />
            </div>
          }
          valueSubtitle="Active Direct Pipelines"
          icon={ArrowRight}
          action={
            <PillButton
              to="/transfers"
              variant="solid"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              className="w-full sm:w-auto font-medium"
            >
              View all transfers
            </PillButton>
          }
        />
      </div>

      
      <section className="bg-sidebar rounded-figma p-7 flex flex-col gap-6 min-h-[300px]">
        
        <div className="flex flex-col gap-1">
          <h2 className="font-sans font-semibold text-[30px] leading-none text-ink tracking-[-0.048em]">Recent</h2>
          <div className="inline-flex">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors duration-150"
            >
              <span>{filterType}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full py-8 text-center text-sm text-muted">
              Loading recent folders...
            </div>
          ) : (
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={() => navigate(`/files?folder=${folder.id}`)}
              />
            ))
          )}
        </div>

        
        <div className="flex flex-col gap-3 pt-6 border-t border-track/40">
          
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-4">
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors duration-150"
              >
                <span>All Files</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="flex items-center bg-white border border-track/60 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setFileViewMode('grid')}
                  className={`p-1 rounded-lg transition-colors ${
                    fileViewMode === 'grid' ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFileViewMode('list')}
                  className={`p-1 rounded-lg transition-colors ${
                    fileViewMode === 'list' ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                  }`}
                  title="List view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/files')}
              className="text-xs font-semibold text-ink hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          
          <div className="flex flex-col gap-2">
            {loading ? (
              <div className="py-6 text-center text-xs text-muted">
                Loading recent files...
              </div>
            ) : files.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                No recent files
              </div>
            ) : fileViewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-1">
                {files.slice(0, 5).map((file) => (
                  <FileGridCard
                    key={file.id}
                    file={file}
                    onAction={handleFileAction}
                    onSelect={() => handleFileAction('preview', file)}
                  />
                ))}
              </div>
            ) : (
              files.slice(0, 5).map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  onAction={handleFileAction}
                  onSelect={() => handleFileAction('preview', file)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      
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

      <ConfirmModal
        isOpen={Boolean(activeDeleteFile)}
        title="Delete File"
        message={`Are you sure you want to delete "${activeDeleteFile?.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setActiveDeleteFile(null)}
      />
    </div>
  );
}

