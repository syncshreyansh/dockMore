import React from 'react';
import { MoreVertical } from 'lucide-react';
import ProviderIcon from './ProviderIcon';
import ProgressBar from './ProgressBar';


export default function AccountRow({ account, className = '', onClick }) {
  if (!account) return null;

  const {
    provider,
    providerName,
    email,
    name,
    usedStorageGB = 0,
    totalStorageGB = 15,
  } = account;

  const formattedProviderName =
    providerName === 'MEGA' || provider === 'mega'
      ? 'Mega'
      : providerName || name || 'Cloud Account';

  return (
    <div
      onClick={onClick}
      className={`group py-2 px-1.5 rounded-xl hover:bg-black/5 transition-colors duration-150 cursor-pointer ${className}`}
    >
      
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="pt-0.5 shrink-0">
            <ProviderIcon provider={provider} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="font-bold text-sm text-ink leading-tight">
              {formattedProviderName}
            </h5>
            <p className="text-[11px] text-muted leading-tight mt-0.5 font-normal">
              {email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="p-1 text-muted hover:text-ink rounded-full hover:bg-black/10 transition-colors duration-150 shrink-0"
          aria-label="Account options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      
      <div className="flex items-center gap-1.5 mt-2">
        <ProgressBar
          value={usedStorageGB}
          max={totalStorageGB}
          height="h-1"
          className="flex-1"
        />
        <span className="text-[11px] text-muted shrink-0 font-medium leading-none">
          {usedStorageGB}/{totalStorageGB} GB
        </span>
      </div>
    </div>
  );
}


