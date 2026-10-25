import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Palette,
  Bell,
  Shield,
  Upload,
  Check,
  Key,
} from 'lucide-react';
import PillButton from '../components/ui/PillButton';
import defaultAvatar from '../assets/icons/avatar.svg';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user, updateUser, exportBackup } = useAccounts();
  const { showToast } = useToast();
  const avatarInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); 

  
  const [name, setName] = useState(user?.name || 'Shreyansh Singh');
  const [email, setEmail] = useState(user?.email || 'mailshreyanshhere@gmail.com');
  const [jobTitle, setJobTitle] = useState('Product Engineer & Designer');
  const [savedSuccess, setSavedSuccess] = useState(false);

  
  const [autoSync, setAutoSync] = useState(true);
  const [notifyTransfers, setNotifyTransfers] = useState(true);
  const [notifyLowStorage, setNotifyLowStorage] = useState(true);
  const [compressionLevel, setCompressionLevel] = useState('balanced');

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      updateUser({ avatar: objectUrl });
      showToast('Profile photo updated', 'success');
    }
  };

  const handleAvatarRemove = () => {
    updateUser({
      avatar: defaultAvatar,
    });
    showToast('Profile photo reset', 'info');
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateUser({ name, email, jobTitle });
    setSavedSuccess(true);
    showToast('Profile updated for this session', 'success');
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
  };

  const handleExportBackup = () => {
    exportBackup();
    showToast('Account details exported', 'success');
  };

  const navTabs = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'appearance', label: 'Storage Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Account Security', icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-1.5 bg-sidebar/50 p-2 rounded-figma select-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2.5 rounded-figma font-medium text-sm transition-colors duration-150 text-left ${
                  isActive ? 'text-white' : 'text-ink hover:bg-black/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settingsTabIndicator"
                    className="absolute inset-0 bg-ink rounded-figma z-0"
                    transition={{ type: 'spring', bounce: 0.08, duration: 0.38 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-ink'
                    }`}
                  />
                  <span className="truncate">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        
        <div className="md:col-span-8 lg:col-span-9 bg-surface rounded-figma p-6 sm:p-8 flex flex-col gap-6">
          
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Personal Profile</h3>
                <p className="text-xs text-muted mt-0.5">
                  Your name, email, and profile photo.
                </p>
              </div>

              
              <div className="flex items-center gap-5 pt-2">
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <img
                  src={user?.avatar || defaultAvatar}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover shadow-sm"
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <PillButton
                      variant="ghost"
                      size="xs"
                      icon={Upload}
                      className="!border-0 bg-sidebar hover:bg-track/80"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      Change Avatar
                    </PillButton>
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="text-xs text-muted hover:text-ink font-medium px-2 py-1"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">
                    Recommended PNG or JPG, max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-figma bg-white border-0 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-figma bg-white border-0 text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Role / Bio
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-figma bg-white border-0 text-sm text-ink"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                {savedSuccess ? (
                  <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
                    <Check className="w-4 h-4" />
                    <span>Changes saved</span>
                  </div>
                ) : (
                  <span />
                )}
                <PillButton variant="solid" size="sm" type="submit">
                  Save Changes
                </PillButton>
              </div>
            </form>
          )}

          
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Storage Preferences</h3>
                <p className="text-xs text-muted mt-0.5">
                  Preferences in this panel are kept for this session.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-figma bg-white">
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Automatic Background Sync</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Periodically poll connected cloud accounts for new and modified files.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSync}
                    aria-label="Automatic Background Sync"
                    onClick={() => {
                      setAutoSync(!autoSync);
                      showToast(`Background sync ${!autoSync ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      autoSync ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-panel transform transition-transform duration-150 ${
                        autoSync ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-figma bg-white">
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Transfer Deduplication</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Check cryptographic file hashes before transferring to avoid duplicates.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifyLowStorage}
                    aria-label="Transfer Deduplication"
                    onClick={() => {
                      setNotifyLowStorage(!notifyLowStorage);
                      showToast(`Transfer deduplication ${!notifyLowStorage ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      notifyLowStorage ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-panel transform transition-transform duration-150 ${
                        notifyLowStorage ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Cloud-to-Cloud Compression
                  </label>
                  <select
                    value={compressionLevel}
                    onChange={(e) => {
                      setCompressionLevel(e.target.value);
                      showToast('Compression level updated', 'info');
                    }}
                    className="w-full px-4 py-2.5 rounded-figma bg-white border-0 text-sm text-ink cursor-pointer"
                  >
                    <option value="none">No compression (Direct binary stream)</option>
                    <option value="balanced">Balanced (Zstandard - recommended)</option>
                    <option value="maximum">Maximum compression (For slow connections)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Notification Alerts</h3>
                <p className="text-xs text-muted mt-0.5">
                  Notification preferences for this session.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-figma bg-white">
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Transfer Completions</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Notify me when a transfer finishes.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifyTransfers}
                    aria-label="Transfer Completions"
                    onClick={() => {
                      setNotifyTransfers(!notifyTransfers);
                      showToast(`Transfer notifications ${!notifyTransfers ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      notifyTransfers ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-panel transform transition-transform duration-150 ${
                        notifyTransfers ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-figma bg-white">
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Quota Limit Warnings</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Alert when any connected cloud exceeds 90% capacity.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifyLowStorage}
                    aria-label="Quota Limit Warnings"
                    onClick={() => {
                      setNotifyLowStorage(!notifyLowStorage);
                      showToast(`Quota warnings ${!notifyLowStorage ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      notifyLowStorage ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-panel transform transition-transform duration-150 ${
                        notifyLowStorage ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          
          {activeTab === 'security' && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-ink">Account Security</h3>
                <p className="text-xs text-muted mt-0.5">
                  Manage access to your connected accounts.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-figma bg-white flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Key className="w-4 h-4 text-ink" />
                      <span className="text-sm font-semibold text-ink">
                        Connected Account Access
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-figma bg-track/60 text-ink">
                      Google Sign-in
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Connected account tokens are stored encrypted on the server. Reconnect an account from Cloud Accounts if its access expires.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <PillButton
                      variant="ghost"
                      size="xs"
                      to="/accounts"
                      className="!border-0 bg-sidebar hover:bg-track/80"
                    >
                      Manage Accounts
                    </PillButton>
                    <PillButton
                      variant="ghost"
                      size="xs"
                      className="!border-0 bg-sidebar hover:bg-track/80"
                      onClick={handleExportBackup}
                    >
                      Export Account Details
                    </PillButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





