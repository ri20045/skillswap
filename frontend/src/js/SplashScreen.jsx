import React, { useState, useEffect } from "react";

const SplashScreen = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 1. Wait 3.5 seconds, then trigger the CSS slide-up
    const slideTimer = setTimeout(() => setIsExiting(true), 3500);

    // 2. Wait for the 1000ms CSS transition to finish before calling onFinish
    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, 4600); 

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <>
      {/* STAY-BEHIND LAYER: 
          This ensures that as the splash moves up, the user sees black 
          instead of the white browser background.
      */}
      <div className="fixed inset-0 z-[90] bg-black" />

      {/* ANIMATED LAYER:
          This contains your grid, rings, and logo. It slides up.
      */}
      <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-transform duration-1000 ease-in-out ${
          isExiting ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        
        {/* Dynamic Background Grid */}
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(#2563eb 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }}>
        </div>

        <div className="relative flex items-center justify-center">
          
          {/* Outer Tech Ring */}
          <div className="absolute w-[480px] h-[480px] rounded-full border-[1px] border-blue-500/20 animate-[spin_20s_linear_infinite]" />
          
          {/* Dashed Orbit */}
          <div className="absolute w-[400px] h-[400px] rounded-full border-2 border-dashed border-blue-400/40 animate-[spin_10s_linear_infinite_reverse]" />

          {/* Glowing Scanning Ring */}
          <div className="absolute w-[340px] h-[340px] rounded-full border-t-4 border-b-4 border-l-2 border-r-2 border-transparent border-t-blue-500 border-b-cyan-400 animate-spin shadow-[0_0_50px_rgba(6,182,212,0.3)]" 
               style={{ animationDuration: '2s' }} />

          {/* Orbiting Icons */}
          <div className="absolute w-full h-full animate-[spin_15s_linear_infinite]">
            {["◈", "⏀", "⌗", "⌬", "⎈", "⏦"].map((icon, i) => (
              <div
                key={i}
                className="absolute w-12 h-12 bg-black border-2 border-cyan-500/50 rounded-lg flex justify-center items-center text-cyan-400 text-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 60}deg) translateY(-210px) rotate(${-i * 15}deg)`,
                }}
              >
                <span className="animate-pulse">{icon}</span>
              </div>
            ))}
          </div>

          {/* Central Core */}
          <div className="relative w-[150px] h-[150px] flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-2xl animate-pulse" />
              
              <div className="z-10 w-full h-full rounded-full bg-black border-2 border-blue-400 flex flex-col justify-center items-center shadow-[0_0_30px_rgba(59,130,246,0.6)_inset]">
                <span className="text-white font-black tracking-[0.2em] text-lg">SKILL</span>
                <span className="text-cyan-400 font-black tracking-[0.2em] text-lg">SWAP</span>
                
                <div className="w-12 h-[2px] bg-blue-900 mt-2 overflow-hidden">
                  <div className="w-full h-full bg-cyan-400 animate-[loading_1.5s_ease-in-out_infinite]" />
                </div>
              </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </>
  );
};

export default SplashScreen;