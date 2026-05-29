'use client';

import { AppStep } from './constants';

interface NavbarProps {
  step: AppStep;
  setStep: (step: AppStep) => void;
}

export default function Navbar({ step, setStep }: NavbarProps) {
  return (
    <nav className="w-full bg-white border-b-4 sm:border-b-8 border-black flex flex-col sm:flex-row justify-between items-center p-4 sm:px-8 shadow-[0px_4px_0px_#000] z-20 gap-4 sm:gap-0">
      <div 
        onClick={() => setStep('home')}
        className="font-black text-2xl sm:text-3xl tracking-tighter uppercase cursor-pointer hover:scale-105 transition-transform"
      >
        BLUEBOOTH<span className="text-blue-600">.</span>
      </div>
      <div className="flex gap-4 sm:gap-8 font-bold text-xs sm:text-sm uppercase items-center flex-wrap justify-center">
        <button onClick={() => setStep('home')} className={`hover:text-blue-600 hover:underline ${step === 'home' ? 'text-blue-600 underline' : ''}`}>Home</button>
        <button onClick={() => setStep('about')} className={`hover:text-blue-600 hover:underline ${step === 'about' ? 'text-blue-600 underline' : ''}`}>About</button>
        <button onClick={() => setStep('spotlight')} className={`hover:text-blue-600 hover:underline ${step === 'spotlight' ? 'text-blue-600 underline' : ''}`}>Spotlight</button>
        <button onClick={() => setStep('contact')} className={`hover:text-blue-600 hover:underline ${step === 'contact' ? 'text-blue-600 underline' : ''}`}>Contact</button>
        <button 
          onClick={() => setStep('setup')} 
          className="bg-yellow-400 px-4 py-2 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-yellow-500"
        >
          Choose Layout
        </button>
      </div>
    </nav>
  );
}