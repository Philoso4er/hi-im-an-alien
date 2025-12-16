import React, { useEffect, useRef, useState } from 'react';

const CameraFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera if available
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera access denied or unavailable. Please allow camera permissions to play.");
      }
    };

    startCamera();

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center p-8 z-0">
        <p className="text-red-400 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {/* Overlay to darken video slightly for UI pop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
    </div>
  );
};

export default CameraFeed;
