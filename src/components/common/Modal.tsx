import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Auto-focus first input or modal container
      requestAnimationFrame(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'input:not([type="hidden"]), select, textarea, button:not([aria-label="Close"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      });
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-dialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-white dark:bg-gotham-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-gotham-750/90 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp relative focus:outline-none`}
      >
        {/* Subtle gold accent line on top in dark mode */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-bat-gold/60 to-transparent dark:block hidden" />

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-gotham-750/80 bg-slate-50/50 dark:bg-gotham-900/60">
          <h3
            id="modal-dialog-title"
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-gotham-400 dark:hover:text-bat-accent rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
