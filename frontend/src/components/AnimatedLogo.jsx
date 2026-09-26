import React from 'react';

const AnimatedLogo = ({ className = "w-16 h-16", anchorColor = "#0369a1", swooshColor = "#0ea5e9" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Main A Shape and Cross (Anchor - Fades in/Scales in) */}
        <g 
          className="animate-logo-anchor" 
          style={{ transformOrigin: '50% 50%', transformBox: 'fill-box' }}
        >
          {/* A Shape */}
          <path
            d="M50 15 L20 85 h18 L50 45 l12 35 h18 Z"
            fill={anchorColor}
          />
          {/* Medical Cross */}
          <path
            d="M46 50 h-6 v6 h6 v6 h6 v-6 h6 v-6 h-6 v-6 h-6 v6 z"
            fill={anchorColor}
          />
        </g>
        
        {/* Swoosh (Animates in separately with delay) */}
        <g 
          className="animate-logo-swoosh"
          style={{ transformOrigin: '50% 50%', transformBox: 'fill-box', animationDelay: '200ms' }}
        >
          <path
            d="M 15 70 C 40 100, 95 80, 90 40 C 70 85, 25 80, 15 70 Z"
            fill={swooshColor}
          />
        </g>
      </svg>
    </div>
  );
};

export default AnimatedLogo;
