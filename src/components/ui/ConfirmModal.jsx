import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onCancel}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-md w-full flex flex-col gap-5 relative shadow-menu"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {variant === 'danger' && (
            <div className="w-10 h-10 rounded-full bg-track/60 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-ink leading-tight">{title}</h3>
            <p className="text-xs text-muted mt-1 font-medium">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-4">
        <PillButton variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </PillButton>
        <PillButton
          variant={variant === 'danger' ? 'danger' : 'solid'}
          size="sm"
          onClick={onConfirm}
        >
          {confirmLabel}
        </PillButton>
      </div>
    </SlideUpModal>
  );
}
