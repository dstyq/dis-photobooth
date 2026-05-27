'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// --- CONFIG KUSTOMISASI ---
const FRAME_COLORS = [
  { name: 'Electric Blue', hex: '#2563eb', tw: 'bg-blue-600', text: '#ffffff' },
  { name: 'Mamba Black', hex: '#0f172a', tw: 'bg-slate-900', text: '#ffffff' },
  { name: 'Earth Cream', hex: '#fef3c7', tw: 'bg-amber-100', text: '#92400e' },
  { name: 'Clean White', hex: '#ffffff', tw: 'bg-white', text: '#0f172a' },
];

const PHOTO_FILTERS = [
  { name: 'Normal', css: 'none', ctxFilter: 'none' },
  { name: 'iPhone HD', css: 'brightness(1.05) contrast(1.15) saturate(1.2)', ctxFilter: 'brightness(1.05) contrast(1.15) saturate(1.2)' },
  { name: 'Skena Vintage', css: 'sepia(0.3) contrast(1.1) brightness(0.9) hue-rotate(-10deg)', ctxFilter: 'sepia(0.3) contrast(1.1) brightness(0.9) hue-rotate(-10deg)' },
  { name: 'Classic B&W', css: 'grayscale(1) contrast(1.3)', ctxFilter: 'grayscale(1) contrast(1.3)' },
];

const STICKER_PACKS = [
  { name: 'Polos', emojis: [] },
  { name: 'Coquette 🎀', emojis: ['🎀', '🍒', '💌'] },
  { name: 'Y2K Sparkle ✨', emojis: ['✨', '🦋', '⭐'] },
  { name: 'Dark Skena 🎱', emojis: ['🎧', '🎱', '🕷️'] },
];

type AppStep = 'home' | 'setup' | 'camera' | 'result';
type CameraFacing = 'user' | 'environment';

export default function Photobooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<AppStep>('home');
  const [hasStream, setHasStream] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  
  const [layoutCount, setLayoutCount] = useState<3 | 4>(3);
  const [activeColor, setActiveColor] = useState(FRAME_COLORS[0]);
  const [activeFilter, setActiveFilter] = useState(PHOTO_FILTERS[0]);
  const [activeSticker, setActiveSticker] = useState(STICKER_PACKS[0]);
  const [customTitle, setCustomTitle] = useState('BLUEBOOTH');
  const [facingMode, setFacingMode] = useState<CameraFacing>('user'); 
  const [isSharing, setIsSharing] = useState(false);

  const playShutterSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio not supported");
    }
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setHasStream(false);
    }
  };

  const startCamera = async (facing: CameraFacing) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: facing },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasStream(true);
      }
    } catch (err) {
      alert("Akses kamera ditolak. Pastikan izin kamera nyala ya!");
      setStep('setup');
    }
  };

  useEffect(() => {
    if (step === 'camera') startCamera(facingMode);
    else stopCamera();
    return () => stopCamera();
  }, [step, facingMode]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.filter = activeFilter.ctxFilter; 
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPhotos(prev => [...prev, canvas.toDataURL('image/png', 1.0)]);
      }
    }
  };

  const startPhotoshoot = async () => {
    setIsShooting(true);
    setPhotos([]); 
    for (let i = 0; i < layoutCount; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(null);
      playShutterSound();
      setIsFlashing(true);
      takePhoto();
      setTimeout(() => setIsFlashing(false), 150);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setIsShooting(false);
    setStep('result');
  };

  const drawFinalCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgWidth = 1280; 
    const imgHeight = 720;
    const padding = 60;
    const bottomSpace = 300; 

    canvas.width = imgWidth + (padding * 2);
    canvas.height = (imgHeight * photos.length) + (padding * (photos.length + 1)) + bottomSpace;

    ctx.fillStyle = activeColor.hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadImg = (src: string) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
      });
    };

    const loadedImages = await Promise.all(photos.map(loadImg));

    loadedImages.forEach((img, index) => {
      const yPos = padding + (index * (imgHeight + padding));
      ctx.drawImage(img, padding, yPos, imgWidth, imgHeight);
      
      ctx.strokeStyle = activeColor.text;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 4;
      ctx.strokeRect(padding, yPos, imgWidth, imgHeight);
      ctx.globalAlpha = 1.0;

      if (activeSticker.emojis.length > 0) {
        ctx.font = '80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(activeSticker.emojis[index % activeSticker.emojis.length], padding / 2, yPos + 100);
        ctx.fillText(activeSticker.emojis[(index + 1) % activeSticker.emojis.length], canvas.width - (padding / 2), yPos + imgHeight - 100);
      }
    });

    ctx.fillStyle = activeColor.text;
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(customTitle.toUpperCase() || 'BLUEBOOTH', canvas.width / 2, canvas.height - 150);

    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 40px "Inter", sans-serif';
    ctx.fillText('2026', canvas.width / 2, canvas.height - 80);
    ctx.globalAlpha = 1.0;

    return canvas;
  };

  const downloadPhotostrip = async () => {
    const canvas = await drawFinalCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${customTitle || 'photostrip'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const sharePhotostrip = async () => {
    setIsSharing(true);
    try {
      const canvas = await drawFinalCanvas();
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `bluebooth-${Date.now()}.png`, { type: 'image/png' });
        
        if (navigator.share) {
          await navigator.share({
            title: 'My Photostrip',
            text: 'Hasil BlueBooth! ✨',
            files: [file],
          });
        } else {
          alert('Device kamu belum support fitur Share langsung. Download aja ya!');
        }
        setIsSharing(false);
      }, 'image/png');
    } catch (error) {
      console.error("Gagal share:", error);
      setIsSharing(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-900 transition-colors duration-500 overflow-x-hidden relative selection:bg-blue-600 selection:text-white">
      
      {/* Background Ornamen Tetap Responsif */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-blue-600 rounded-full filter blur-[80px] md:blur-[120px] opacity-20 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-indigo-600 rounded-full filter blur-[80px] md:blur-[120px] opacity-20 pointer-events-none" />

      {/* Header Mobile - Menyesuaikan margin */}
      {step !== 'home' && (
        <div className="absolute top-4 sm:top-6 w-full text-center z-10">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">BLUEBOOTH<span className="text-blue-600">.</span></h1>
        </div>
      )}

      {/* Kontainer Utama - Responsive margin-top */}
      <div className="w-full max-w-6xl flex justify-center items-center mt-12 sm:mt-16 z-10">
        
        {/* --- STEP 1: HOME --- */}
        {step === 'home' && (
          <div className="text-center flex flex-col items-center animate-fade-in-up backdrop-blur-md p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-white/50 shadow-2xl bg-white/40 w-full max-w-3xl">
            <div className="inline-block px-4 py-1.5 sm:px-5 sm:py-2 mb-4 sm:mb-6 rounded-full bg-blue-600 text-white font-black text-[10px] sm:text-xs tracking-[0.2em] shadow-lg shadow-blue-600/30">
              @hadistyyy || on insta
            </div>
            {/* Teks Judul Disesuaikan: text-5xl di HP, membesar di Desktop */}
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black mb-4 sm:mb-6 tracking-tighter text-slate-900 drop-shadow-sm">
              BlueBooth<span className="text-blue-600">.</span>
            </h1>
            <p className="mb-8 sm:mb-12 text-sm sm:text-xl md:text-2xl text-slate-600 font-medium max-w-xl px-2">
              cekrak cekrek mana ur imup kamu
            </p>
            <button 
              onClick={() => setStep('setup')}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg bg-blue-600 text-white rounded-full font-black hover:bg-blue-700 hover:scale-105 transition-all shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-3"
            >
              Start Session 📸
            </button>
          </div>
        )}

        {/* --- STEP 2: SETUP --- */}
        {step === 'setup' && (
          <div className="bg-white/90 backdrop-blur-2xl p-6 sm:p-8 md:p-12 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-blue-100 w-full max-w-2xl animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8 text-slate-900 tracking-tight text-center sm:text-left">Customize Session</h2>
            
            <div className="mb-6 sm:mb-8">
              <span className="block text-[10px] sm:text-xs font-black text-blue-600 mb-3 sm:mb-4 uppercase tracking-[0.15em] text-center sm:text-left">1. Pilih Layout</span>
              {/* Layout Button dibuat tumpuk di HP super kecil, jejer di tablet */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {[3, 4].map((num) => (
                  <button 
                    key={num}
                    onClick={() => setLayoutCount(num as 3 | 4)}
                    className={`flex-1 py-4 sm:py-6 rounded-2xl sm:rounded-3xl border-[3px] transition-all flex flex-col items-center gap-3 ${layoutCount === num ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner' : 'border-slate-100 hover:border-blue-200 bg-white'}`}
                  >
                    <span className="text-xl sm:text-2xl font-black">{num} GRID</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8 sm:mb-10">
              <span className="block text-[10px] sm:text-xs font-black text-blue-600 mb-3 sm:mb-4 uppercase tracking-[0.15em] text-center sm:text-left">2. Pilih Filter Lensa</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {PHOTO_FILTERS.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter)}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-[3px] text-xs sm:text-sm font-bold transition-all ${activeFilter.name === filter.name ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200'}`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-6 sm:pt-8 border-t border-slate-100 gap-4">
              <button onClick={() => setStep('home')} className="text-slate-400 font-bold hover:text-slate-800 transition w-full sm:w-auto py-3">
                Batal
              </button>
              <button 
                onClick={() => setStep('camera')}
                className="w-full sm:w-auto px-8 py-3 sm:py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-black transition shadow-xl"
              >
                Buka Kamera ➡️
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: CAMERA --- */}
        {step === 'camera' && (
          <div className="bg-white/90 backdrop-blur-2xl p-3 sm:p-4 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-blue-50 w-full max-w-4xl flex flex-col items-center animate-fade-in-up">
            <div className="w-full flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
              <button 
                onClick={() => setStep('setup')}
                disabled={isShooting}
                className="text-slate-400 font-bold hover:text-slate-800 disabled:opacity-50 transition text-sm sm:text-base"
              >
                ⬅ Back
              </button>
              <div className="flex items-center gap-2 sm:gap-4">
                {!isShooting && (
                  <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition text-base sm:text-lg"
                    title="Balik Kamera"
                  >
                    🔄
                  </button>
                )}
                <span className="hidden sm:inline-block text-[10px] sm:text-xs font-black text-blue-600 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-100 uppercase tracking-widest shadow-inner">
                  {activeFilter.name}
                </span>
                <span className="font-black text-slate-800 bg-slate-100 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm">
                  {photos.length} / {layoutCount}
                </span>
              </div>
            </div>

            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-xl sm:rounded-[1.5rem] overflow-hidden shadow-2xl flex items-center justify-center border-4 sm:border-[6px] border-black">
              {!hasStream && <span className="animate-pulse text-white/50 font-medium text-xs sm:text-base">MEMUAT LENSA...</span>}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: activeFilter.css }}
                className={`w-full h-full object-cover transition-opacity duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasStream ? 'opacity-100' : 'opacity-0'}`}
              />
              {isFlashing && <div className="absolute inset-0 bg-white z-20 animate-pulse" />}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-blue-900/30 backdrop-blur-[2px]">
                  <span className="text-8xl sm:text-[12rem] font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-bounce">{countdown}</span>
                </div>
              )}
            </div>

            <button 
              onClick={startPhotoshoot}
              disabled={!hasStream || isShooting}
              className="mt-6 sm:mt-8 mb-2 sm:mb-4 w-20 h-20 sm:w-24 sm:h-24 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:scale-100 rounded-full border-4 sm:border-8 border-slate-100 shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group relative"
            >
              <div className="absolute inset-0 rounded-full border-2 sm:border-4 border-transparent group-hover:border-blue-400/50 transition-all scale-110" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 sm:border-4 border-white/90 group-hover:border-white transition-colors" />
            </button>
          </div>
        )}

        {/* --- STEP 4: RESULT & EDITOR (ULTIMATE) --- */}
        {step === 'result' && (
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 w-full justify-center items-center lg:items-start animate-fade-in-up">
            
            {/* Control Panel Kiri - Menyesuaikan Full Width di HP */}
            <div className="bg-white/90 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-blue-50 flex flex-col gap-5 sm:gap-6 w-full max-w-md lg:max-w-[400px] order-2 lg:order-1">
              
              <div>
                <h3 className="font-black text-[10px] sm:text-xs text-blue-600 uppercase tracking-[0.15em] mb-2 sm:mb-3">Custom Title</h3>
                <input 
                  type="text" 
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={15}
                  placeholder="Ketik namamu..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all uppercase"
                />
              </div>

              <div>
                <h3 className="font-black text-[10px] sm:text-xs text-blue-600 uppercase tracking-[0.15em] mb-2 sm:mb-3">Frame Color</h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {FRAME_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setActiveColor(color)}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 transition-all hover:scale-110 ${color.tw} ${activeColor.name === color.name ? 'border-slate-900 shadow-xl scale-110' : 'border-slate-200 shadow-sm'}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-black text-[10px] sm:text-xs text-blue-600 uppercase tracking-[0.15em] mb-2 sm:mb-3">Sticker Pack</h3>
                <div className="grid grid-cols-2 gap-2">
                  {STICKER_PACKS.map((pack) => (
                    <button
                      key={pack.name}
                      onClick={() => setActiveSticker(pack)}
                      className={`py-2 sm:py-3 px-2 rounded-xl border-2 text-[10px] sm:text-xs font-bold transition-all ${activeSticker.name === pack.name ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200'}`}
                    >
                      {pack.name}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100 my-1 sm:my-2" />

              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button 
                    onClick={downloadPhotostrip}
                    className="w-full py-3 sm:py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-black transition shadow-lg flex justify-center items-center gap-2"
                  >
                    ⬇️ Simpan
                  </button>
                  <button 
                    onClick={sharePhotostrip}
                    disabled={isSharing}
                    className="w-full py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 disabled:opacity-70"
                  >
                    {isSharing ? '⏳ Loading...' : '📤 Share'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button 
                    onClick={() => { setPhotos([]); setStep('camera'); }}
                    className="py-3 sm:py-4 bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
                  >
                    🔄 Retake
                  </button>
                  <button 
                    onClick={() => { setPhotos([]); setStep('home'); }}
                    className="py-3 sm:py-4 bg-white border-[3px] border-slate-100 text-slate-600 rounded-xl sm:rounded-2xl font-bold hover:border-slate-300 transition text-xs sm:text-sm"
                  >
                    🏠 Home
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview Kanan - Dibuat Fluid supaya muat di HP kecil */}
            <div className="flex flex-col items-center p-4 sm:p-8 bg-white/60 rounded-[2rem] sm:rounded-[2.5rem] border border-white backdrop-blur-xl shadow-2xl relative w-full max-w-md lg:max-w-none lg:w-auto order-1 lg:order-2">
              <div 
                className={`p-3 sm:p-4 pb-10 sm:pb-14 rounded shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-[260px] sm:max-w-[300px] flex flex-col gap-2 sm:gap-3 transition-colors duration-700 ease-in-out relative`}
                style={{ backgroundColor: activeColor.hex }}
              >
                {photos.map((src, index) => (
                  <div key={index} className="w-full aspect-video overflow-hidden rounded relative border border-black/10">
                    <img src={src} alt={`shot-${index}`} className="w-full h-full object-cover" />
                    {activeSticker.emojis.length > 0 && (
                      <>
                        <span className="absolute -left-1 sm:-left-2 top-1 sm:top-2 text-lg sm:text-2xl drop-shadow-md">{activeSticker.emojis[index % activeSticker.emojis.length]}</span>
                        <span className="absolute -right-1 sm:-right-2 bottom-1 sm:bottom-2 text-lg sm:text-2xl drop-shadow-md">{activeSticker.emojis[(index + 1) % activeSticker.emojis.length]}</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                    <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] pointer-events-none" />
                  </div>
                ))}
                <div className="mt-3 sm:mt-5 text-center transition-colors duration-700" style={{ color: activeColor.text }}>
                  <p className="font-black tracking-[0.15em] sm:tracking-[0.2em] text-lg sm:text-xl truncate px-1 sm:px-2">
                    {customTitle.toUpperCase() || 'BLUEBOOTH'}
                  </p>
                  <p className="text-[8px] sm:text-[10px] opacity-70 mt-1 font-bold tracking-widest">{activeFilter.name.toUpperCase()} • 2026</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}