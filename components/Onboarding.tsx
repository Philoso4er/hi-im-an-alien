import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, ChevronLeft, Eye, Hand, MessageCircle } from 'lucide-react';

interface OnboardingProps {
  /** Finished: whether the player wants to use the camera. */
  onDone: (useCamera: boolean) => void;
  onBack: () => void;
}

const STEPS = [
  {
    icon: Eye,
    title: 'Watch the edges',
    body: 'Something shows up at the side of the screen. It leans out from behind a doorway, a wall, the edge of the world.'
  },
  {
    icon: Hand,
    title: 'Say hi in 5 seconds',
    body: 'Tap Say Hi before it loses its nerve. Miss it and it slips away. It will come back. Probably.'
  },
  {
    icon: MessageCircle,
    title: 'Talk for 90 seconds',
    body: 'Type or speak. It answers in riddles and remembers you, sort of. Every meeting is kept in your Sightings log.'
  }
];

/** First-run: how to play in 3 steps, then why we ask for the camera. */
const Onboarding: React.FC<OnboardingProps> = ({ onDone, onBack }) => {
  const [step, setStep] = useState(0);
  const isCameraStep = step === STEPS.length;

  return (
    <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex flex-col safe-inset" data-testid="onboarding">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (step === 0 ? onBack() : setStep(s => s - 1))}
          aria-label="Back"
          className="p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {[...STEPS, null].map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-cyan-300' : 'w-1.5 bg-white/25'}`}
            />
          ))}
        </div>
        {!isCameraStep ? (
          <button onClick={() => setStep(STEPS.length)} className="text-sm text-gray-400 px-2 py-1" data-testid="onboarding-skip">
            Skip
          </button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isCameraStep ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="max-w-sm w-full text-center"
            >
              <p className="font-signal text-xs text-cyan-300/80 mb-4">STEP {step + 1} / 3</p>
              {React.createElement(STEPS[step].icon, { className: 'w-14 h-14 mx-auto text-cyan-300 mb-5', strokeWidth: 1.4 })}
              <h2 className="text-2xl font-bold mb-3">{STEPS[step].title}</h2>
              <p className="text-gray-300 leading-relaxed">{STEPS[step].body}</p>
            </motion.div>
          ) : (
            <motion.div
              key="camera"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-sm w-full text-center"
              data-testid="onboarding-camera"
            >
              <Camera className="w-14 h-14 mx-auto text-cyan-300 mb-5" strokeWidth={1.4} />
              <h2 className="text-2xl font-bold mb-3">It visits through your camera</h2>
              <p className="text-gray-300 leading-relaxed">
                Your rear camera is the window it peeks through. The picture stays on your phone. Nothing is recorded
                or uploaded.
              </p>
              <p className="text-gray-500 text-sm mt-3">
                Rather not? It can visit you in a quiet star-room instead.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-sm w-full mx-auto flex flex-col gap-3">
        {!isCameraStep ? (
          <button
            onClick={() => setStep(s => s + 1)}
            data-testid="onboarding-next"
            className="w-full bg-white text-black py-4 rounded-2xl font-bold"
          >
            Next
          </button>
        ) : (
          <>
            <button
              onClick={() => onDone(true)}
              data-testid="onboarding-allow-camera"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> Use my camera
            </button>
            <button
              onClick={() => onDone(false)}
              data-testid="onboarding-no-camera"
              className="w-full bg-white/5 border border-white/10 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-gray-200"
            >
              <CameraOff className="w-4 h-4" /> Play without camera
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
