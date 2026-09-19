import React from 'react';
import { X, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import ProviderIcon from './ProviderIcon';

const PROVIDERS = [
  { name: 'Google Drive', id: 'google-drive', desc: 'Personal & Google Workspace' },
  { name: 'Microsoft OneDrive', id: 'onedrive', desc: 'Personal & Microsoft 365' },
  { name: 'Dropbox', id: 'dropbox', desc: 'Dropbox Personal & Business' },
  { name: 'MEGA', id: 'mega', desc: 'Encrypted Cloud Storage' },
];

export default function ConnectAccountModal({
  isOpen,
  onClose,
  connectingProviderId,
  onProviderSelect,
}) {
  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-2xl"
      closeOnBackdrop={!connectingProviderId}
    >
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">Connect Cloud Account</h3>
          <p className="text-xs text-muted mt-0.5">
            Select a provider to authenticate with OAuth 2.0.
          </p>
        </div>
        <button
          type="button"
          disabled={Boolean(connectingProviderId)}
          onClick={onClose}
          className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </button>
      </div>

      
      <div className="flex flex-col gap-2.5">
        {PROVIDERS.map((prov) => {
          const isConnecting = connectingProviderId === prov.id;
          return (
            <button
              key={prov.id}
              type="button"
              disabled={Boolean(connectingProviderId)}
              onClick={() => onProviderSelect(prov)}
              className={`flex items-center justify-between p-3.5 rounded-xl text-left transition-colors duration-150 ${
                isConnecting
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-white hover:bg-black/5 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <ProviderIcon provider={prov.id} size="md" />
                <div>
                  <p className={`text-sm font-bold ${isConnecting ? 'text-white' : 'text-ink'}`}>
                    {prov.name}
                  </p>
                  <p className={`text-xs ${isConnecting ? 'text-white/80' : 'text-muted'}`}>
                    {isConnecting ? 'Authenticating via OAuth 2.0...' : prov.desc}
                  </p>
                </div>
              </div>
              {isConnecting ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 text-muted" />
              )}
            </button>
          );
        })}
      </div>

      
      <div className="flex items-center gap-2 text-[11px] text-muted bg-track/30 p-3 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-ink shrink-0" />
        <span>
          dockMore operates in read/write proxy mode. Your credentials never touch our servers directly.
        </span>
      </div>
    </SlideUpModal>
  );
}
