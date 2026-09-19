import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, Lock, Upload, Folder, FileText, ArrowRight } from 'lucide-react';
import Sidebar from './Sidebar';
import Logo from '../ui/Logo';
import PillButton from '../ui/PillButton';
import SearchInput from '../ui/SearchInput';
import ProviderIcon from '../ui/ProviderIcon';
import UploadModal from '../ui/UploadModal';
import FilePreviewModal from '../ui/FilePreviewModal';
import TextType from '../ui/TextType';
import { useIntro } from '../../context/IntroContext';
import { shouldSkipIntro as checkReducedMotion } from '../ui/IntroLoader';
import { useAccounts } from '../../hooks/useAccounts';
import { useFiles } from '../../hooks/useFiles';


let hasAnimatedGreetingThisLoad = false;

export default function AppLayout({ introComplete: propIntroComplete }) {
  const { introComplete: ctxIntroComplete } = useIntro();
  const introComplete = propIntroComplete ?? ctxIntroComplete ?? true;
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const { isAuthenticated, signIn, user } = useAccounts();
  const { files, folders } = useFiles();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  
  const [hasAnimatedGreeting, setHasAnimatedGreeting] = useState(
    () => hasAnimatedGreetingThisLoad || checkReducedMotion()
  );

  
  useEffect(() => {
    try {
      sessionStorage.removeItem('dockmore_greeting_animated');
    } catch {}
  }, []);

  
  
  useEffect(() => {
    if (introComplete && !isHome) {
      hasAnimatedGreetingThisLoad = true;
      setHasAnimatedGreeting(true);
    }
  }, [introComplete, isHome]);

  const handleGreetingComplete = () => {
    hasAnimatedGreetingThisLoad = true;
    setHasAnimatedGreeting(true);
  };

  
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.removeItem('dockmore-theme');
    } catch {}
  }, []);

  
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return { files: [], folders: [] };
    const q = searchQuery.toLowerCase().trim();

    const matchedFiles = files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.accountEmail.toLowerCase().includes(q)
    );

    const matchedFolders = folders.filter((f) =>
      f.name.toLowerCase().includes(q)
    );

    return { files: matchedFiles, folders: matchedFolders };
  }, [searchQuery, files, folders]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setSearchDropdownOpen(true);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setSearchDropdownOpen(false);
      navigate(`/files?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  
  const getGreeting = () => {
    const hours = new Date().getHours();
    
    
    
    if (hours < 12) {
      return 'Good morning';
    } else if (hours < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return `${getGreeting()}, ${user?.name?.split(' ')[0] || 'Shreyansh'}`;
      case '/files':
        return 'All Files';
      case '/transfers':
        return 'Transfers';
      case '/accounts':
        return 'Cloud Accounts';
      case '/settings':
        return 'Settings';
      case '/code':
        return 'Code';
      default:
        return 'Dashboard';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/':
        return "Here's what's happening with your clouds today.";
      case '/code':
        return 'Automatic snapshots and clean commits for your projects.';
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen bg-sidebar flex items-center justify-center p-6 antialiased">
        <div className="bg-surface rounded-3xl p-8 sm:p-10 max-w-md w-full flex flex-col items-center text-center gap-6 shadow-2xl border border-track/40">
          <Logo />
          <div className="w-16 h-16 rounded-2xl bg-track/40 flex items-center justify-center text-ink">
            <Lock className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-2xl text-ink">
              Signed Out
            </h2>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              Your session has ended. Click below to sign back in and restore your unified multi-cloud dashboard.
            </p>
          </div>
          <PillButton
            variant="solid"
            size="md"
            icon={LogIn}
            onClick={() => signIn()}
            className="w-full"
          >
            Sign Back In
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen md:w-screen md:overflow-hidden bg-sidebar text-ink flex flex-col md:flex-row antialiased p-0">
      
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-track/60 sticky top-0 z-40">
        <Logo />
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-full hover:bg-black/5 text-ink transition-colors duration-150"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      
      <div className="hidden md:block h-screen shrink-0">
        <Sidebar />
      </div>

      
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 transition-opacity duration-150"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-[280px] h-full bg-sidebar shadow-2xl">
            <Sidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      
      <div className="flex-1 min-w-0 flex flex-col h-full md:h-screen bg-sidebar overflow-hidden">
        
        <header className="shrink-0 px-4 md:px-8 pt-4 pb-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-30 select-none h-auto lg:h-[92px]">
          
          <div className="min-w-0 flex-1 flex flex-col justify-center overflow-visible py-1">
            <h1 className="font-serif italic text-[32px] sm:text-[38px] md:text-[44px] leading-[1.2] text-ink font-bold tracking-[-0.038em] overflow-visible pb-0.5">
              {isHome ? (
                <>
                  <span>{`${getGreeting()}, `}</span>
                  {introComplete ? (
                    <TextType
                      as="span"
                      text={user?.name?.split(' ')[0] || 'Shreyansh'}
                      typingSpeed={60}
                      initialDelay={hasAnimatedGreetingThisLoad ? 0 : 200}
                      loop={false}
                      skipAnimation={hasAnimatedGreetingThisLoad}
                      showCursor={true}
                      cursorCharacter="|"
                      cursorClassName="ml-0.5 font-sans not-italic font-normal select-none opacity-80"
                      onSentenceComplete={handleGreetingComplete}
                    />
                  ) : (
                    <span className="inline-block opacity-80 ml-0.5 font-sans not-italic font-normal select-none">
                      |
                    </span>
                  )}
                </>
              ) : (
                getPageTitle()
              )}
            </h1>
            {getPageSubtitle() && (
              <p className="font-sans text-xs md:text-sm text-muted mt-0.5 font-medium leading-tight">
                {getPageSubtitle()}
              </p>
            )}
          </div>

          
          <div className="flex items-center gap-3 w-full lg:w-[657px] shrink-0 h-[48px]">
            <PillButton
              variant="solid"
              size="md"
              
              icon={Upload}
              onClick={() => setShowUploadModal(true)}
              className="shrink-0 h-[48px] w-[135px] lg:w-[135px] px-6 rounded-figma font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.18)] hover:shadow active:scale-[0.98] transition-all"
            >
              Upload
            </PillButton>

            <div className="flex-1 min-w-0 relative h-[48px]" ref={searchRef}>
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setSearchDropdownOpen(true)}
                onClear={() => setSearchQuery('')}
                placeholder="Search across all your clouds..."
                className="w-full h-[48px]"
                inputClassName="h-[48px] bg-white text-ink text-[15px] border border-track/60 hover:border-track focus:border-ink/20 shadow-sm"
              />

              
              {searchDropdownOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-track/60 p-3 z-50 max-h-80 overflow-y-auto flex flex-col gap-2.5 text-ink">
                  {searchResults.folders.length === 0 && searchResults.files.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted">
                      No results found for "{searchQuery}". Press Enter to search All Files.
                    </div>
                  ) : (
                    <>
                      
                      {searchResults.folders.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">
                            Folders
                          </span>
                          {searchResults.folders.map((folder) => (
                            <div
                              key={folder.id}
                              onClick={() => {
                                setSearchDropdownOpen(false);
                                navigate(`/files?folder=${folder.id}`);
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <Folder className="w-4 h-4 text-ink" />
                                <span className="text-xs font-semibold uppercase">{folder.name}</span>
                              </div>
                              <ProviderIcon provider={folder.provider} size="xs" />
                            </div>
                          ))}
                        </div>
                      )}

                      
                      {searchResults.files.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">
                            Files
                          </span>
                          {searchResults.files.map((file) => (
                            <div
                              key={file.id}
                              onClick={() => {
                                setSearchDropdownOpen(false);
                                setPreviewFile(file);
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <FileText className="w-4 h-4 text-muted shrink-0" />
                                <span className="text-xs font-medium text-ink truncate">{file.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted">{file.size}</span>
                                <ProviderIcon provider={file.provider} size="xs" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-t border-track/60 pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchDropdownOpen(false);
                            navigate(`/files?search=${encodeURIComponent(searchQuery.trim())}`);
                          }}
                          className="text-xs font-semibold text-ink hover:underline flex items-center gap-1"
                        >
                          <span>View all results</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        
        <main className="flex-1 min-w-0 w-full bg-white md:rounded-tl-[24px] md:rounded-tr-[24px] overflow-y-auto shadow-sm">
          {isHome ? (
            <div className="px-4 py-6 md:px-8 md:py-8">
              <Outlet />
            </div>
          ) : (
            <div className="p-6 md:p-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}


