import React from 'react';
import { X } from 'lucide-react';

interface ARTestProps {
  onClose: () => void;
}

const ARTest: React.FC<ARTestProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
        <p className="text-cyan-400 text-sm font-mono">🧪 AR Test Mode</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <img
          src="/aliens/standing.gif"
          alt="Alien standing sticker"
          style={{
            width: 'min(70vw, 280px)',
            height: 'auto',
            maxHeight: '60vh',
            objectFit: 'contain'
          }}
        />
        <p className="text-gray-300 text-sm text-center max-w-sm">
          Sticker preview — 3D AR placement retired for now. Gameplay uses the same GIF stickers by status.
        </p>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-gray-500 text-xs">Standing alien GIF · status stickers live in gameplay</p>
      </div>
    </div>
  );
};

export default ARTest;
