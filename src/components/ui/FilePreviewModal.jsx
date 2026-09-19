import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Edit3,
  FolderInput,
  Trash2,
  Star,
  FileText,
  FileCode,
  FileArchive,
  Film,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Music,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import ProviderIcon from './ProviderIcon';
import PillButton from './PillButton';
import ShareModal from './ShareModal';
import RenameModal from './RenameModal';
import MoveModal from './MoveModal';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { useFiles } from '../../hooks/useFiles';

const getFileIcon = (extension) => {
  const ext = (extension || '').toLowerCase().replace('.', '');
  switch (ext) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return FileText;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'zip':
    case 'tar':
    case 'tar.gz':
    case 'rar':
    case '7z':
      return FileArchive;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
      return Film;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
    case 'm4a':
      return Music;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
    case 'webp':
      return ImageIcon;
    case 'fig':
    case 'sketch':
    case 'ai':
    case 'psd':
      return FileCode;
    default:
      return File;
  }
};

export default function FilePreviewModal({ isOpen, file, onClose }) {
  const { showToast } = useToast();
  const { deleteFile, renameFile, moveFile, toggleStar } = useFiles();

  const [showShare, setShowShare] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const lastFileRef = useRef(file);
  if (file) {
    lastFileRef.current = file;
  }
  const currentFile = file || lastFileRef.current;

  
  useEffect(() => {
    setImageLoaded(false);
  }, [currentFile?.id]);

  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        }
      }
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  if (!currentFile) return null;

  const FileTypeIcon = getFileIcon(currentFile.extension);
  const cleanExt = (currentFile.extension || '').toLowerCase().replace('.', '');
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(cleanExt);
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(cleanExt);
  const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(cleanExt);
  const isPdf = cleanExt === 'pdf';

  
  const mediaUrl =
    currentFile.previewUrl ||
    (isImage ? `https://picsum.photos/seed/${currentFile.id || currentFile.name}/1200/800` : null);

  const handleDownload = () => {
    if (mediaUrl) {
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.download = currentFile.name;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    showToast(`Downloading ${currentFile.name}...`, 'success');
  };

  const handleToggleStar = () => {
    toggleStar(currentFile.id);
    showToast(currentFile.starred ? 'Removed from Starred' : 'Added to Starred', 'info');
  };

  const handleRename = (newName) => {
    renameFile(currentFile.id, newName);
    showToast(`Renamed file to "${newName}"`, 'success');
  };

  const handleMove = (newFolderId, newPath) => {
    moveFile(currentFile.id, newFolderId, newPath);
    showToast(`Moved ${currentFile.name} to ${newPath}`, 'success');
  };

  const handleDelete = () => {
    deleteFile(currentFile.id);
    setShowDeleteConfirm(false);
    onClose();
    showToast(`Deleted ${currentFile.name}`, 'info');
  };

  return (
    <>
      <SlideUpModal
        isOpen={isOpen}
        onClose={onClose}
        panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-2xl w-full flex flex-col gap-5 relative shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-muted font-sans">
              File Preview
            </span>
            <button
              type="button"
              onClick={handleToggleStar}
              className="p-1 rounded-full text-muted hover:text-amber-500 transition-colors"
              title={currentFile.starred ? 'Unstar' : 'Star'}
            >
              <Star
                className={`w-4 h-4 ${
                  currentFile.starred ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
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

        
        <div className="bg-white rounded-2xl border border-track/40 shadow-sm overflow-hidden flex flex-col items-center justify-center min-h-[260px] max-h-[420px] w-full relative group/preview">
          
          {isImage && mediaUrl && (
            <div
              className="w-full h-full min-h-[260px] max-h-[400px] flex items-center justify-center relative cursor-zoom-in overflow-hidden bg-[#F5F4F2]"
              onClick={() => setIsLightboxOpen(true)}
              title="Click to view fullscreen"
            >
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-track/20 via-surface to-track/20 animate-pulse flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted/40 animate-pulse" />
                </div>
              )}
              <img
                src={mediaUrl}
                alt={currentFile.name}
                onLoad={() => setImageLoaded(true)}
                className={`w-full max-h-[400px] object-contain transition-all duration-300 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              />

              
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1.5 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
                <Maximize2 className="w-3 h-3" />
                Click to expand
              </div>
            </div>
          )}

          
          {isVideo && mediaUrl && (
            <div className="w-full bg-[#1a1a1a] rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                src={mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[400px] object-contain rounded-2xl"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          )}

          
          {isAudio && mediaUrl && (
            <div className="w-full p-8 flex flex-col items-center justify-center bg-gradient-to-b from-surface/70 via-white to-white rounded-2xl gap-5">
              
              <div className="w-20 h-20 rounded-3xl bg-track/40 flex items-center justify-center text-ink shadow-xs">
                <Music className="w-10 h-10 stroke-[1.8]" />
              </div>

              
              <div className="text-center max-w-md">
                <h4 className="text-base font-bold text-ink truncate px-4">{currentFile.name}</h4>
                <p className="text-xs text-muted mt-1">{currentFile.size} • High Fidelity Audio</p>
              </div>

              
              <div className="flex items-center justify-center gap-1.5 h-10 w-full max-w-xs py-1">
                {[45, 75, 30, 90, 60, 100, 40, 85, 95, 35, 70, 50, 80, 65, 90, 40, 75, 55].map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-ink/70 rounded-full animate-audio-wave"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${(i * 0.08).toFixed(2)}s`,
                      animationDuration: '1.2s',
                    }}
                  />
                ))}
              </div>

              
              <audio
                src={mediaUrl}
                controls
                className="w-full max-w-md h-10 rounded-xl"
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          
          {isPdf && mediaUrl && (
            <div className="w-full h-[380px] rounded-2xl overflow-hidden">
              <iframe
                src={mediaUrl}
                title={currentFile.name}
                className="w-full h-full border-none rounded-2xl"
              />
            </div>
          )}

          
          {(!mediaUrl || (!isImage && !isVideo && !isAudio && !isPdf)) && (
            <div className="w-full p-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-20 h-20 rounded-3xl bg-track/40 flex items-center justify-center text-ink/70 shadow-xs mb-1">
                <FileTypeIcon className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h4 className="text-base font-bold text-ink truncate max-w-sm px-2">
                {currentFile.name}
              </h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                Preview not available for this file type ({(cleanExt || 'file').toUpperCase()}).
                Download the file to view it locally on your device.
              </p>
              <div className="mt-2">
                <PillButton
                  variant="solid"
                  size="sm"
                  icon={Download}
                  onClick={handleDownload}
                >
                  Download File
                </PillButton>
              </div>
            </div>
          )}
        </div>

        
        <div className="bg-white rounded-2xl px-4 py-3 border border-track/40 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-bold text-ink truncate max-w-[200px] sm:max-w-[280px]">
              {currentFile.name}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-track/50 text-[10px] font-extrabold uppercase text-ink/80 tracking-wider">
              {cleanExt || 'FILE'}
            </span>
          </div>

          
          <div className="flex items-center gap-3 shrink-0 text-muted font-medium">
            <span>{currentFile.size}</span>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-ink">
              <ProviderIcon provider={currentFile.provider} size="xs" />
              <span className="capitalize">{currentFile.provider.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <PillButton
            variant="solid"
            size="sm"
            icon={Download}
            onClick={handleDownload}
            className="w-full"
          >
            Download
          </PillButton>

          <PillButton
            variant="ghost"
            size="sm"
            icon={Share2}
            onClick={() => setShowShare(true)}
            className="w-full"
          >
            Share
          </PillButton>

          <PillButton
            variant="ghost"
            size="sm"
            icon={Edit3}
            onClick={() => setShowRename(true)}
            className="w-full"
          >
            Rename
          </PillButton>

          <PillButton
            variant="ghost"
            size="sm"
            icon={FolderInput}
            onClick={() => setShowMove(true)}
            className="w-full"
          >
            Move
          </PillButton>
        </div>

        
        <div className="pt-1 flex justify-end">
          <PillButton
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete File
          </PillButton>
        </div>
      </SlideUpModal>

      
      {isLightboxOpen && isImage && mediaUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fadeIn select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white/90 text-sm font-medium truncate max-w-md drop-shadow">
              {currentFile.name}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-150"
                title="Download original image"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-150"
                aria-label="Close fullscreen view"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          
          <img
            src={mediaUrl}
            alt={currentFile.name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      
      <ShareModal
        isOpen={showShare}
        file={currentFile}
        onClose={() => setShowShare(false)}
      />

      <RenameModal
        isOpen={showRename}
        initialName={currentFile.name}
        title="Rename File"
        onRename={handleRename}
        onClose={() => setShowRename(false)}
      />

      <MoveModal
        isOpen={showMove}
        fileCount={1}
        currentFolderId={currentFile.folderId}
        onMove={handleMove}
        onClose={() => setShowMove(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete File"
        message={`Are you sure you want to delete "${currentFile.name}" from ${currentFile.provider.replace('-', ' ')}?`}
        confirmLabel="Delete File"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
