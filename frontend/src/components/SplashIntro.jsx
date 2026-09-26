import React, { useEffect, useState } from 'react';
import AnimatedLogo from './AnimatedLogo';

const SplashIntro = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      handleComplete();
      return;
    }

    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2800); // Start fading out before 3.2s

    const completeTimer = setTimeout(() => {
      handleComplete();
    }, 3200);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const handleComplete = () => {
    if (!isSkipped) {
      setIsSkipped(true);
      onComplete();
    }
  };

  if (isSkipped) return null;

  return (
    <div
      onClick={handleComplete}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 cursor-pointer transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center w-full max-w-sm">
        
        {/* Logo and Rings Container */}
        <div className="relative w-64 h-64 mx-auto">
          {/* Pulsing Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none">
            <div className="w-full h-full bg-sky-400/20 rounded-full blur-3xl animate-pulse-glow"></div>
          </div>

          {/* Orbit Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-40 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-cw">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="10 5" />
              <circle cx="50" cy="2" r="2" fill="#0ea5e9" />
            </svg>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 opacity-30 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-ccw">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#0369a1" strokeWidth="0.5" strokeDasharray="15 10" />
              <circle cx="50" cy="98" r="1.5" fill="#0369a1" />
            </svg>
          </div>

          {/* Central Logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
            <div className="animate-splash-bounce-in bg-white rounded-2xl p-3 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/20">
              <img src="/assets/apex-logo.jpg" alt="Apex Hospital" className="w-24 h-auto object-contain" />
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-8 text-center opacity-0 animate-[fade-in_1s_ease-out_1s_forwards]">
          <p className="text-sm font-semibold tracking-widest text-sky-700 uppercase">CARE THAT LEADS</p>
        </div>
      </div>

      {/* Loading Bar at bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-sky-500 animate-loading-bar rounded-full"></div>
      </div>
      
      {/* Skip Hint */}
      <div className="absolute bottom-4 text-[10px] text-slate-400 tracking-wider uppercase">
        Tap anywhere to skip
      </div>
    </div>
  );
};

export default SplashIntro;
