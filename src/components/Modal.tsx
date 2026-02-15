import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string; // e.g. "max-w-md", "max-w-lg"
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose} // click outside to close
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal panel */}
      <div
        className={`
          relative bg-black border border-white/10  rounded-xl shadow-2xl
          w-full ${maxWidth} max-h-min overflow-y-auto
          transform transition-all duration-300
          scale-100 opacity-100
        `}
        onClick={(e) => e.stopPropagation()} // prevent close on content click
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;