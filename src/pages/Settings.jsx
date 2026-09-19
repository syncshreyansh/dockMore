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
  const { user, updateUser, rotateVaultKey, exportBackup } = useAccounts();
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
      showToast('Profile avatar updated successfully', 'success');
    }
  };

  const handleAvatarRemove = () => {
    updateUser({
      avatar: defaultAvatar,
    });
    showToast('Avatar reset to default', 'info');
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateUser({ name, email, jobTitle });
    setSavedSuccess(true);
    showToast('Profile settings saved successfully', 'success');
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
  };

  const handleRotateKey = () => {
    rotateVaultKey();
    showToast('End-to-End Vault key rotated successfully', 'success');
  };

  const handleExportBackup = () => {
    exportBackup();
    showToast('Vault backup exported successfully', 'success');
  };

  const navTabs = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'appearance', label: 'Storage Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Keys', icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-1.5 bg-sidebar/50 p-2 rounded-2xl select-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2.5 font-medium text-sm transition-colors duration-150 text-left ${
                  isActive ? 'text-white' : 'text-ink hover:bg-black/5 rounded-figma'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settingsTabIndicator"
                    className="absolute inset-0 bg-ink rounded-figma z-0"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
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

        
        <div className="md:col-span-8 lg:col-span-9 bg-surface rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
          
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-bold text-ink">Personal Profile</h3>
                <p className="text-xs text-muted mt-0.5">
                  Update your identity across all synced workspaces.
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
                  className="w-16 h-16 rounded-full object-cover border-2 border-track shadow-sm"
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <PillButton
                      variant="ghost"
                      size="xs"
                      icon={Upload}
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
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-track text-sm text-ink focus:outline-none focus:border-ink"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-track text-sm text-ink focus:outline-none focus:border-ink"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-track text-sm text-ink focus:outline-none focus:border-ink"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-track/60">
                {savedSuccess ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                    <Check className="w-4 h-4" />
                    <span>Settings saved successfully</span>
                  </div>
                ) : (
                  <span />
                )}
                <PillButton variant="solid" size="md" type="submit">
                  Save Changes
                </PillButton>
              </div>
            </form>
          )}

          
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-base font-bold text-ink">Storage Preferences</h3>
                <p className="text-xs text-muted mt-0.5">
                  Configure default file syncing behavior and aggregator policies.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-track">
                  <div>
                    <h4 className="text-sm font-bold text-ink">Automatic Background Sync</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Periodically poll connected cloud accounts for new and modified files.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSync(!autoSync);
                      showToast(`Background sync ${!autoSync ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      autoSync ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-150 ${
                        autoSync ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-track">
                  <div>
                    <h4 className="text-sm font-bold text-ink">Transfer Deduplication</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Check cryptographic file hashes before transferring to avoid duplicates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyLowStorage(!notifyLowStorage);
                      showToast(`Transfer deduplication ${!notifyLowStorage ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      notifyLowStorage ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-150 ${
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
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-track text-sm text-ink focus:outline-none focus:border-ink cursor-pointer"
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
                <h3 className="text-base font-bold text-ink">Notification Alerts</h3>
                <p className="text-xs text-muted mt-0.5">
                  Control which events trigger in-app and email notifications.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-track">
                  <div>
                    <h4 className="text-sm font-bold text-ink">Transfer Completions</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Notify me when large cloud migrations or copy jobs finish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyTransfers(!notifyTransfers);
                      showToast(`Transfer notifications ${!notifyTransfers ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      notifyTransfers ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-150 ${
                        notifyTransfers ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-track">
                  <div>
                    <h4 className="text-sm font-bold text-ink">Quota Limit Warnings</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Alert when any connected cloud exceeds 90% capacity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyLowStorage(!notifyLowStorage);
                      showToast(`Quota warnings ${!notifyLowStorage ? 'enabled' : 'disabled'}`, 'info');
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-150 ${
                      notifyLowStorage ? 'bg-ink' : 'bg-track'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-150 ${
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
                <h3 className="text-base font-bold text-ink">Security & Encryption</h3>
                <p className="text-xs text-muted mt-0.5">
                  OAuth tokens, encryption keys, and active sessions.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-2xl bg-white border border-track flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Key className="w-4 h-4 text-ink" />
                      <span className="text-sm font-bold text-ink">
                        End-to-End Vault Key
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-figma bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Your local client encryption key is stored securely in your browser session.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <PillButton
                      variant="ghost"
                      size="xs"
                      onClick={handleRotateKey}
                    >
                      Rotate Key
                    </PillButton>
                    <PillButton
                      variant="ghost"
                      size="xs"
                      onClick={handleExportBackup}
                    >
                      Export Backup
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





