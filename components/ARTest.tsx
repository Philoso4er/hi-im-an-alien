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

      {/* @ts-ignore */}
      <model-viewer
        src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
        ar
        ar-modes="scene-viewer webxr quick-look"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
      >
        <button
          slot="ar-button"
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(to right, #06b6d4, #a855f7)',
            color: 'white',
            fontWeight: 'bold',
            padding: '16px 32px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '16px',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)',
            cursor: 'pointer'
          }}
        >
          👽 View in Your Space
        </button>

        {/* @ts-ignore */}
      </model-viewer>

      <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-gray-400 text-xs">
          Drag to rotate • Tap button to place in real world
        </p>
      </div>
    </div>
  );
};

export default ARTest;
