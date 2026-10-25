import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Folder,
  ArrowLeftRight,
  Code,
  Images,
  Settings,
  HelpCircle,
  Plus,
  Cloud,
  MoreHorizontal,
  User,
  Sliders,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo';
import NavItem from '../ui/NavItem';
import AccountRow from '../ui/AccountRow';
import HelpSupportModal from '../ui/HelpSupportModal';
import defaultAvatar from '../../assets/icons/avatar.svg';
import { useAccounts } from '../../hooks/useAccounts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Sidebar({ onCloseMobile }) {
  const { accounts, user: accountUser, loading: accountsLoading } = useAccounts();
  const { user: authUser, signOut: authSignOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const profileRef = useRef(null);

  
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await authSignOut();
      showToast('Signed out', 'info');
      navigate('/signin');
    } catch (err) {
      showToast(err.message || 'Failed to sign out', 'error');
    }
  };

  return (
    <>
      <aside className="sidebar-scroll w-[240px] xl:w-[260px] h-full bg-sidebar flex flex-col justify-between py-5 px-4 xl:px-5 shrink-0 overflow-y-auto select-none">
        
        <div className="flex flex-col gap-5">
          
          <div className="px-1 pt-2 pb-3">
            <Logo />
          </div>

          
          <nav className="flex flex-col gap-1">
            <NavItem
              to="/"
              end
              icon={Home}
              label="Home"
              onClick={onCloseMobile}
            />
            <NavItem
              to="/files"
              icon={Folder}
              label="All Files"
              onClick={onCloseMobile}
            />
            <NavItem
              to="/media"
              icon={Images}
              label="Media"
              onClick={onCloseMobile}
            />
            <NavItem
              to="/transfers"
              icon={ArrowLeftRight}
              label="Transfers"
              onClick={onCloseMobile}
            />
            <NavItem
              to="/code"
              icon={Code}
              label="Code"
              onClick={onCloseMobile}
            />
          </nav>

          
          <div className="border-t border-track my-0.5" />

          
          <div>
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2 text-muted">
                <Cloud className="w-[15px] h-[15px] stroke-[2]" />
                <span className="text-[11px] font-semibold tracking-wider uppercase font-sans">
                  CLOUD ACCOUNTS
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigate('/accounts');
                  onCloseMobile && onCloseMobile();
                }}
                className="inline-flex items-center gap-1 bg-ink hover:bg-ink/90 text-white text-[11px] font-medium px-2.5 py-1 rounded-figma transition-colors duration-150"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>ADD</span>
              </button>
            </div>

            
            <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1 sidebar-scroll">
              {accountsLoading ? (
                <div className="px-2 py-2 text-xs text-muted">
                  Loading accounts...
                </div>
              ) : accounts.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted">
                  No accounts connected
                </div>
              ) : (
                accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onClick={() => {
                      navigate('/accounts');
                      onCloseMobile && onCloseMobile();
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        
        <div className="flex flex-col gap-3 mt-auto pt-8">
          
          <div className="border-t border-track mb-1" />

          
          <div className="flex flex-col gap-1">
            <NavItem
              to="/settings"
              icon={Settings}
              label="Settings"
              onClick={onCloseMobile}
            />

            <button
              type="button"
              onClick={() => {
                setShowHelpModal(true);
                onCloseMobile && onCloseMobile();
              }}
              className="group flex items-center justify-start gap-3 px-4 py-3 rounded-figma font-semibold text-[15px] text-ink hover:bg-black/5 transition-colors duration-150 text-left select-none mx-1 w-[calc(100%-0.5rem)]"
            >
              <HelpCircle className="w-[18px] h-[18px] stroke-[2] shrink-0 text-ink" />
              <span className="truncate">Help & Support</span>
            </button>
          </div>

          
          <div className="relative mt-1" ref={profileRef}>
            
            {menuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-sidebar border border-track rounded-figma shadow-sm z-50 flex flex-col gap-1 transition-all duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                    onCloseMobile && onCloseMobile();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-figma text-xs font-semibold text-ink hover:bg-black/5 transition-colors duration-150 text-left"
                >
                  <User className="w-3.5 h-3.5 text-muted" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                    onCloseMobile && onCloseMobile();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-figma text-xs font-semibold text-ink hover:bg-black/5 transition-colors duration-150 text-left"
                >
                  <Sliders className="w-3.5 h-3.5 text-muted" />
                  <span>Preferences</span>
                </button>

                <div className="border-t border-track/60 my-0.5" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-figma text-xs font-semibold text-red-600 hover:bg-sidebar transition-colors duration-150 text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            
            <div
              onClick={() => setMenuOpen(!menuOpen)}
              className="hover:bg-black/5 rounded-figma px-4 py-3 flex items-center justify-between transition-colors duration-150 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={authUser?.user_metadata?.avatar_url || defaultAvatar}
                  alt={authUser?.user_metadata?.full_name || 'User'}
                  className="w-8 h-8 rounded-figma object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-semibold text-ink truncate leading-tight">
                    {authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || accountUser?.name || 'dockMore User'}
                  </h5>
                  <p className="text-[11px] text-muted leading-tight mt-0.5">
                    {authUser?.email || accountUser?.email || ''}
                  </p>
                </div>
              </div>

              <MoreHorizontal className="w-4 h-4 text-muted/60 shrink-0 ml-1" />
            </div>
          </div>
        </div>
      </aside>

      <HelpSupportModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </>
  );
}
