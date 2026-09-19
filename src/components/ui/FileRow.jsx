import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Code,
  MoreVertical,
  Star,
  Download,
  Share2,
  Trash2,
  FolderInput,
  Edit3,
  Check,
} from 'lucide-react';
import ProviderIcon from './ProviderIcon';


export function getFileIcon(extension = '') {
  const ext = extension.toLowerCase().replace('.', '');
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
    case 'webp':
      return Image;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return Film;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return Music;
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return Archive;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'py':
      return Code;
    default:
      return FileText;
  }
}

export default function FileRow({
  file,
  isSelected = false,
  onToggleSelect,
  onAction,
  onSelect,
  className = '',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (!file) return null;

  const {
    name,
    extension,
    size,
    provider,
    accountEmail,
    modified,
    path,
    starred = false,
  } = file;

  const FileTypeIcon = getFileIcon(extension);

  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(true);
      }}
      className={`group flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer select-none transition-all duration-150 ease-out ${
        isSelected
          ? 'bg-white hover:bg-[#303030] ring-2 ring-ink shadow-sm'
          : 'bg-white hover:bg-[#303030] shadow-sm'
      } ${className}`}
    >
      
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
        
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect && onToggleSelect(file.id);
          }}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 ${
            isSelected
              ? 'bg-ink border-ink text-white group-hover:bg-white group-hover:border-white group-hover:text-[#303030]'
              : 'border-track bg-white group-hover:border-white/50 group-hover:bg-white/10 group-hover:text-white'
          }`}
          aria-label={isSelected ? 'Deselect file' : 'Select file'}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </div>

        <div className="w-9 h-9 rounded-lg bg-track/40 group-hover:bg-white/15 flex items-center justify-center text-ink group-hover:text-white shrink-0 transition-colors duration-150">
          <FileTypeIcon className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-semibold text-ink group-hover:text-white truncate leading-tight transition-colors duration-150">
              {name}
            </h5>
            {starred && (
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted group-hover:text-white/70 truncate transition-colors duration-150">
              {accountEmail}
            </span>
          </div>
        </div>
      </div>

      
      <div className="flex items-center gap-6 shrink-0">
        
        <div className="hidden sm:flex items-center gap-1.5 w-28">
          <ProviderIcon provider={provider} size="xs" />
          <span className="text-xs text-ink/80 group-hover:text-white/90 font-medium capitalize truncate transition-colors duration-150">
            {provider.replace('-', ' ')}
          </span>
        </div>

        
        <div className="w-20 text-right">
          <span className="text-xs font-medium text-ink group-hover:text-white transition-colors duration-150">{size}</span>
        </div>

        
        <div className="hidden md:block w-32 text-right">
          <span className="text-xs text-muted group-hover:text-white/70 transition-colors duration-150">{modified}</span>
        </div>

        
        <div className="flex items-center gap-1 relative" ref={menuRef}>
          <button
            type="button"
            className="p-1.5 rounded-full text-muted group-hover:text-white/80 hover:!text-white hover:!bg-white/15 transition-colors duration-150"
            title="Download file"
            onClick={(e) => {
              e.stopPropagation();
              onAction && onAction('download', file);
            }}
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-full text-muted group-hover:text-white/80 hover:!text-white hover:!bg-white/15 transition-colors duration-150"
            title="Share file"
            onClick={(e) => {
              e.stopPropagation();
              onAction && onAction('share', file);
            }}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-full text-muted group-hover:text-white/80 hover:!text-white hover:!bg-white/15 transition-colors duration-150"
            title="More actions"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 bg-white border border-track/60 shadow-[0_4px_24px_rgba(0,0,0,0.14)] rounded-2xl p-1.5 min-w-[150px] z-50 flex flex-col gap-1 text-ink"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('preview', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition-colors text-left"
              >
                <FileText className="w-3.5 h-3.5 text-muted" />
                <span>View Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('star', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition-colors text-left"
              >
                <Star className="w-3.5 h-3.5 text-muted" />
                <span>{starred ? 'Unstar' : 'Add to Starred'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('rename', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition-colors text-left"
              >
                <Edit3 className="w-3.5 h-3.5 text-muted" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('move', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 transition-colors text-left"
              >
                <FolderInput className="w-3.5 h-3.5 text-muted" />
                <span>Move to...</span>
              </button>

              <div className="border-t border-track/40 my-0.5" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction && onAction('delete', file);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
