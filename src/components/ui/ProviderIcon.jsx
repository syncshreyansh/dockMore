import React from 'react';
import googleDriveSvg from '../../assets/icons/google-drive.svg';
import onedriveSvg from '../../assets/icons/onedrive.svg';
import dropboxSvg from '../../assets/icons/dropbox.svg';
import megaSvg from '../../assets/icons/mega.svg';

const providerMap = {
  'google-drive': {
    src: googleDriveSvg,
    name: 'Google Drive',
  },
  googledrive: {
    src: googleDriveSvg,
    name: 'Google Drive',
  },
  onedrive: {
    src: onedriveSvg,
    name: 'OneDrive',
  },
  dropbox: {
    src: dropboxSvg,
    name: 'Dropbox',
  },
  mega: {
    src: megaSvg,
    name: 'MEGA',
  },
};


export default function ProviderIcon({
  provider = 'google-drive',
  size = 'md',
  className = '',
  withBackground = false,
}) {
  const normalizedKey = provider.toLowerCase().replace(/\s+/g, '-');
  const iconData = providerMap[normalizedKey] || providerMap['google-drive'];

  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
  };

  const containerSizes = {
    xs: 'w-6 h-6 p-1',
    sm: 'w-7 h-7 p-1.5',
    md: 'w-9 h-9 p-2',
    lg: 'w-11 h-11 p-2.5',
    xl: 'w-13 h-13 p-3',
    '2xl': 'w-14 h-14 p-3',
  };

  if (withBackground) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-white border border-black/5 shrink-0 ${
          containerSizes[size] || containerSizes.md
        } ${className}`}
      >
        <img
          src={iconData.src}
          alt={iconData.name}
          className="w-full h-full object-contain select-none"
        />
      </div>
    );
  }

  return (
    <img
      src={iconData.src}
      alt={iconData.name}
      className={`inline-block object-contain select-none shrink-0 ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    />
  );
}


