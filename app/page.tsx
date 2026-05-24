'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// --- CONFIG KUSTOMISASI ---
const FRAME_COLORS = [
  { name: 'Electric Blue', hex: '#2563eb', tw: 'bg-blue-600', text: '#ffffff' }, // Biru pekat baru!
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
  
  // State Baru
  const [layoutCount, setLayoutCount] = useState<3 | 4>(3);
  const [activeColor, setActiveColor] = useState(FRAME_COLORS[0]);
  const [activeFilter, setActiveFilter] = useState(PHOTO_FILTERS[0]);
  const [facingMode, setFacingMode] = useState<CameraFacing>('user'); // Kamera depan/belakang

  // Suara Shutter Digital (Web Audio API)
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
      console.log("Audio not supported or blocked");
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
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: facing 
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasStream(true);
      }
    } catch (err) {
      console.error("Gagal akses kamera:", err);
      alert("Pastikan izin kamera sudah diberikan ya!");
      setStep('setup');
    }
  };

  // Re-run kamera kalau pindah ke halaman kamera ATAU kalau kamera di-flip
  useEffect(() => {
    if (step === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, facingMode]);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Cuma di-mirror kalau pakai kamera depan!
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.filter = activeFilter.ctxFilter; 
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        setPhotos(prev => [...prev, dataUrl]);
      }
    }
  };

  const startPhotoshoot = async () => {
    setIsShooting(true);
    setPhotos([]); 

    for (let i = 0; i < layoutCount; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        // Play tick sound opsional kalau mau, tapi kita biarin shutter aja
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setCountdown(null);
      
      // Flash & Sound!
      playShutterSound();
      setIsFlashing(true);
      takePhoto();
      
      setTimeout(() => setIsFlashing(false), 150);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsShooting(false);
    setStep('result');
  };

  const downloadPhotostrip = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    });

    ctx.fillStyle = activeColor.text;
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLUEBOOTH', canvas.width / 2, canvas.height - 150);

    ctx.globalAlpha = 0.6;
    ctx.font = 'bold 40px "Inter", sans-serif';
    ctx.fillText('EST. 2026', canvas.width / 2, canvas.height - 80);
    ctx.globalAlpha = 1.0;

    const link = document.createElement('a');
    link.download = `bluebooth-${activeFilter.name.replace(' ', '')}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans text-slate-900 transition-colors duration-500 overflow-hidden relative selection:bg-blue-600 selection:text-white">
      
      {/* Background Ornamen (Vibrant Blue Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600 rounded-full filter blur-[120px] opacity-20 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none" />

      {step !== 'home' && (
        <div className="absolute top-6 w-full text-center z-10">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">BLUEBOOTH<span className="text-blue-600">.</span></h1>
        </div>
      )}

      <div className="w-full max-w-5xl flex justify-center items-center mt-12 z-10">
        
        {/* --- STEP 1: HOME PAGE --- */}
        {step === 'home' && (
          <div className="text-center flex flex-col items-center animate-fade-in-up backdrop-blur-md p-10 rounded-[3rem] border border-white/50 shadow-2xl bg-white/40">
            <div className="inline-block px-5 py-2 mb-6 rounded-full bg-blue-600 text-white font-black text-xs tracking-[0.2em] shadow-lg shadow-blue-600/30">
              V3.0 ELECTRIC EDITION
            </div>
            <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter text-slate-900 drop-shadow-sm">
              BlueBooth<span className="text-blue-600">.</span>
            </h1>
            <p className="mb-12 text-xl md:text-2xl text-slate-600 font-medium max-w-xl">
              Photostrip abal abal
            </p>
            <button 
              onClick={() => setStep('setup')}
              className="px-10 py-5 text-lg bg-blue-600 text-white rounded-full font-black hover:bg-blue-700 hover:scale-105 transition-all shadow-2xl shadow-blue-600/40 flex items-center gap-3"
            >
              Start Session 📸
            </button>
          </div>
        )}

        {/* --- STEP 2: SETUP MENU --- */}
        {step === 'setup' && (
          <div className="bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-blue-100 w-full max-w-2xl animate-fade-in-up">
            <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">Customize Session</h2>
            
            <div className="mb-8">
              <span className="block text-xs font-black text-blue-600 mb-4 uppercase tracking-[0.15em]">1. Pilih Layout</span>
              <div className="flex gap-4">
                {[3, 4].map((num) => (
                  <button 
                    key={num}
                    onClick={() => setLayoutCount(num as 3 | 4)}
                    className={`flex-1 py-6 rounded-3xl border-[3px] transition-all flex flex-col items-center gap-3 ${layoutCount === num ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner' : 'border-slate-100 hover:border-blue-200 bg-white'}`}
                  >
                    <span className="text-2xl font-black">{num} GRID</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <span className="block text-xs font-black text-blue-600 mb-4 uppercase tracking-[0.15em]">2. Pilih Filter Lensa</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PHOTO_FILTERS.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter)}
                    className={`p-4 rounded-2xl border-[3px] text-sm font-bold transition-all ${activeFilter.name === filter.name ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200'}`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-slate-100">
              <button onClick={() => setStep('home')} className="text-slate-400 font-bold hover:text-slate-800 transition">
                Batal
              </button>
              <button 
                onClick={() => setStep('camera')}
                className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-black transition shadow-xl"
              >
                Buka Kamera ➡️
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: CAMERA --- */}
        {step === 'camera' && (
          <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-[2.5rem] shadow-2xl border border-blue-50 w-full max-w-4xl flex flex-col items-center animate-fade-in-up">
            
            <div className="w-full flex justify-between items-center px-6 py-4">
              <button 
                onClick={() => setStep('setup')}
                disabled={isShooting}
                className="text-slate-400 font-bold hover:text-slate-800 disabled:opacity-50 transition"
              >
                ⬅ Back
              </button>
              
              <div className="flex items-center gap-4">
                {/* TOMBOL FLIP KAMERA (Muncul kalau lagi ga ngefoto) */}
                {!isShooting && (
                  <button 
                    onClick={flipCamera}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition text-lg"
                    title="Balik Kamera"
                  >
                    🔄
                  </button>
                )}
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest shadow-inner">
                  {activeFilter.name}
                </span>
                <span className="font-black text-slate-800 bg-slate-100 px-4 py-1.5 rounded-full text-sm">
                  {photos.length} / {layoutCount}
                </span>
              </div>
            </div>

            <div className="relative w-full aspect-video bg-black rounded-[1.5rem] overflow-hidden shadow-2xl flex items-center justify-center border-[6px] border-black">
              {!hasStream && (
                <span className="animate-pulse text-white/50 font-medium tracking-widest">
                  MEMUAT LENSA...
                </span>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: activeFilter.css }}
                // Scale-x-[-1] cuma dipakai kalau kamera depan (user)
                className={`w-full h-full object-cover transition-opacity duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasStream ? 'opacity-100' : 'opacity-0'}`}
              />

              {isFlashing && (
                <div className="absolute inset-0 bg-white z-20 animate-pulse" />
              )}

              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-blue-900/30 backdrop-blur-[2px]">
                  <span className="text-[12rem] font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-bounce">
                    {countdown}
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={startPhotoshoot}
              disabled={!hasStream || isShooting}
              className="mt-8 mb-4 w-24 h-24 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:scale-100 rounded-full border-8 border-slate-100 shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group relative"
            >
              <div className="absolute inset-0 rounded-full border-4 border-transparent group-hover:border-blue-400/50 transition-all scale-110" />
              <div className="w-14 h-14 rounded-full border-4 border-white/90 group-hover:border-white transition-colors" />
            </button>
          </div>
        )}

        {/* --- STEP 4: RESULT & EDITOR --- */}
        {step === 'result' && (
          <div className="flex flex-col lg:flex-row gap-8 w-full justify-center items-start animate-fade-in-up">
            
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-blue-50 flex flex-col gap-8 w-full lg:w-96">
              <div>
                <h3 className="font-black text-xs text-blue-600 uppercase tracking-[0.15em] mb-4">Frame Color</h3>
                <div className="flex flex-wrap gap-4">
                  {FRAME_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setActiveColor(color)}
                      className={`w-14 h-14 rounded-full border-4 transition-all hover:scale-110 ${color.tw} ${
                        activeColor.name === color.name ? 'border-slate-900 shadow-xl scale-110' : 'border-slate-200 shadow-sm'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="flex flex-col gap-3">
                <button 
                  onClick={downloadPhotostrip}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-600/30 flex justify-center items-center gap-2"
                >
                  ⬇️ Download Hasil
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setPhotos([]);
                      setStep('camera');
                    }}
                    className="py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition text-sm"
                  >
                    🔄 Retake
                  </button>
                  <button 
                    onClick={() => {
                      setPhotos([]);
                      setStep('home');
                    }}
                    className="py-4 bg-white border-[3px] border-slate-100 text-slate-600 rounded-2xl font-bold hover:border-slate-300 transition text-sm"
                  >
                    🏠 Home
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center p-8 bg-white/60 rounded-[2.5rem] border border-white backdrop-blur-xl shadow-2xl">
              <div 
                className={`p-4 pb-14 rounded shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-[300px] flex flex-col gap-3 transition-colors duration-700 ease-in-out`}
                style={{ backgroundColor: activeColor.hex }}
              >
                {photos.map((src, index) => (
                  <div key={index} className="w-full aspect-video overflow-hidden rounded relative border border-black/10">
                    <img src={src} alt={`shot-${index}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                    <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] pointer-events-none" />
                  </div>
                ))}
                <div className="mt-5 text-center transition-colors duration-700" style={{ color: activeColor.text }}>
                  <p className="font-black tracking-[0.25em] text-xl">BLUEBOOTH</p>
                  <p className="text-[10px] opacity-70 mt-1 font-bold tracking-widest">{activeFilter.name.toUpperCase()} • 2026</p>
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