'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from './Navbar';
import { 
  FRAME_STYLES, PHOTO_FILTERS, STICKER_PACKS, 
  LayoutOption, AppStep, CameraFacing, FrameStyle 
} from './constants';

export default function Photobooth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<AppStep>('home');
  const [hasStream, setHasStream] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  
  const [layoutType, setLayoutType] = useState<LayoutOption>('3');
  const [activeColor, setActiveColor] = useState<FrameStyle>(FRAME_STYLES[0]);
  const [activeFilter, setActiveFilter] = useState(PHOTO_FILTERS[0]);
  const [activeSticker, setActiveSticker] = useState(STICKER_PACKS[0]);
  const [customTitle, setCustomTitle] = useState('BLUEBOOTH');
  const [facingMode, setFacingMode] = useState<CameraFacing>('user'); 
  const [isSharing, setIsSharing] = useState(false);
  
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);

  // --- STATE HALAMAN KONTAK ---
  const [contactName, setContactName] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const getLayoutCount = () => layoutType === '2x2' ? 4 : parseInt(layoutType);

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
      console.log("Audio muted");
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
        video: { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, facingMode: facing },
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

  const captureFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.filter = activeFilter.ctxFilter; 
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore(); 
        return canvas.toDataURL('image/jpeg', 1.0); 
      }
    }
    return null;
  };

  const startPhotoshoot = async () => {
    setIsShooting(true);
    const totalShots = getLayoutCount();

    if (retakeIndex !== null) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(null);
      playShutterSound();
      setIsFlashing(true);
      
      const newFrame = captureFrame();
      if (newFrame) {
        setPhotos(prev => {
          const updated = [...prev];
          updated[retakeIndex] = newFrame;
          return updated;
        });
      }

      setTimeout(() => setIsFlashing(false), 150);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsShooting(false);
      setRetakeIndex(null); 
      setStep('result');
      return;
    }

    setPhotos([]); 
    for (let i = 0; i < totalShots; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(null);
      playShutterSound();
      setIsFlashing(true);
      
      const newFrame = captureFrame();
      if (newFrame) setPhotos(prev => [...prev, newFrame]);

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
    const padding = 80;
    const bottomSpace = 340; 

    if (layoutType === '2x2') {
      canvas.width = (imgWidth * 2) + (padding * 3);
      canvas.height = (imgHeight * 2) + (padding * 3) + bottomSpace;
    } else {
      canvas.width = imgWidth + (padding * 2);
      canvas.height = (imgHeight * photos.length) + (padding * (photos.length + 1)) + bottomSpace;
    }

    activeColor.renderCanvas(ctx, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 20; 
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    const loadImg = (src: string, isCors = false) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        if (isCors) img.crossOrigin = "anonymous"; 
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img); 
      });
    };

    const loadedImages = await Promise.all(photos.map(src => loadImg(src)));
    let loadedStickers: HTMLImageElement[] = [];
    if (activeSticker.images.length > 0) {
      loadedStickers = await Promise.all(activeSticker.images.map(url => loadImg(url, true)));
    }

    loadedImages.forEach((img, index) => {
      let xPos = padding;
      let yPos = padding;

      if (layoutType === '2x2') {
        const col = index % 2;
        const row = Math.floor(index / 2);
        xPos = padding + (col * (imgWidth + padding));
        yPos = padding + (row * (imgHeight + padding));
      } else {
        yPos = padding + (index * (imgHeight + padding));
      }

      ctx.drawImage(img, xPos, yPos, imgWidth, imgHeight);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 12;
      ctx.strokeRect(xPos, yPos, imgWidth, imgHeight);

      if (loadedStickers.length > 0) {
        const stickerSize = 160; 
        const s1 = loadedStickers[index % loadedStickers.length];
        const s2 = loadedStickers[(index + 1) % loadedStickers.length];
        if(s1 && s1.width) ctx.drawImage(s1, xPos + 60, yPos + imgHeight - stickerSize - 40, stickerSize, stickerSize);
        if(s2 && s2.width) ctx.drawImage(s2, xPos + imgWidth - stickerSize - 60, yPos + 40, stickerSize, stickerSize);
      }
    });

    if (activeColor.textBg) {
      ctx.fillStyle = activeColor.textBg;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 10;
      const boxHeight = 200;
      const boxY = canvas.height - bottomSpace + 60;
      ctx.beginPath();
      ctx.rect(padding, boxY, canvas.width - (padding * 2), boxHeight);
      ctx.fill();
      ctx.stroke(); 
    }

    ctx.fillStyle = activeColor.text;
    ctx.font = '900 100px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(customTitle.toUpperCase() || 'BLUEBOOTH', canvas.width / 2, canvas.height - 160);

    ctx.font = 'bold 45px "Inter", sans-serif';
    ctx.fillText('EST. 2026', canvas.width / 2, canvas.height - 90);

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
            text: 'Cekrak cekrek pake BlueBooth! 📸',
            files: [file],
          });
        } else {
          alert('Device lu blm support share langsung. Download manual aja ya!');
        }
        setIsSharing(false);
      }, 'image/png');
    } catch (error) {
      console.error("Gagal share:", error);
      setIsSharing(false);
    }
  };

  // --- LOGIKA KIRIM EMAIL (MAILTO) ---
  const sendEmail = () => {
    if (!contactName || !contactMsg) {
      alert('Isi dulu dong Nama sama Pesannya!');
      return;
    }
    
    const targetEmail = "hadistyqurratuain@gmail.com";
    const mailSubject = encodeURIComponent(`Iseng kirim pesan dari ${contactName}`);
    const mailBody = encodeURIComponent(`Halo! Gw ${contactName}.\n\n${contactMsg}`);
    
    window.open(`mailto:${targetEmail}?subject=${mailSubject}&body=${mailBody}`, '_blank');
    
    setContactName('');
    setContactMsg('');
  };

  return (
    <main 
      className="min-h-[100dvh] flex flex-col items-center justify-start sm:justify-center font-sans text-black overflow-x-hidden relative selection:bg-blue-600 selection:text-white"
      style={{ backgroundColor: '#bfdbfe', backgroundImage: 'radial-gradient(#1e3a8a 2px, transparent 2px)', backgroundSize: '30px 30px' }}
    >
      <Navbar step={step} setStep={setStep} />

      <div className="w-full max-w-6xl flex justify-center items-center flex-grow p-4 sm:p-6 mt-4 sm:mt-0 z-10">
        
        {/* --- STEP 1: HOME --- */}
        {step === 'home' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 w-full animate-fade-in-up bg-white p-6 sm:p-10 border-4 sm:border-8 border-black shadow-[8px_8px_0px_#000] sm:shadow-[15px_15px_0px_#000]">
            
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start w-full lg:w-1/2">
              <div className="inline-block px-4 py-2 mb-4 sm:mb-6 bg-yellow-400 text-black border-2 sm:border-4 border-black font-black text-[10px] sm:text-xs tracking-[0.2em] shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] lowercase">
                @hadistyyy || on insta
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-[6.5rem] font-black mb-4 sm:mb-6 tracking-tighter text-black drop-shadow-[3px_3px_0px_#3b82f6] sm:drop-shadow-[4px_4px_0px_#3b82f6] leading-none uppercase">
                BLUE<br/>BOOTH
              </h1>
              <p className="mb-8 sm:mb-10 text-sm sm:text-lg text-black font-bold max-w-xl lowercase leading-relaxed bg-blue-100 p-3 sm:p-4 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
                cekrak cekrek mana ur imup kamu
              </p>
              <button 
                onClick={() => setStep('setup')}
                className="w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-5 text-sm sm:text-lg bg-blue-600 text-white font-black uppercase border-2 sm:border-4 border-black shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all flex items-center justify-center gap-3 active:bg-blue-700"
              >
                Start Session 📸
              </button>
            </div>

            <div className="relative flex justify-center w-full lg:w-1/2 mt-6 lg:mt-0">
              <div className="relative group">
                <img 
                  src="/jaki.jpeg" 
                  alt="Hasil BlueBooth" 
                  className="w-[200px] sm:w-[280px] lg:w-[300px] object-cover bg-white p-3 border-4 sm:border-8 border-black shadow-[8px_8px_0px_#3b82f6] sm:shadow-[15px_15px_0px_#3b82f6] transform -rotate-3 hover:rotate-0 transition-transform duration-300"
                />
                <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 text-3xl sm:text-5xl drop-shadow-[2px_2px_0px_#000] sm:drop-shadow-[4px_4px_0px_#000]">✨</div>
                <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 text-3xl sm:text-5xl drop-shadow-[2px_2px_0px_#000] sm:drop-shadow-[4px_4px_0px_#000] rotate-12">🎀</div>
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE: ABOUT (SANTAI ALA ANAK KULIAHAN) --- */}
        {step === 'about' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full animate-fade-in-up bg-white p-6 sm:p-10 border-4 sm:border-8 border-black shadow-[8px_8px_0px_#000] sm:shadow-[15px_15px_0px_#000]">
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
              <h2 className="text-4xl sm:text-6xl font-black uppercase drop-shadow-[2px_2px_0px_#3b82f6]">About</h2>
              <div className="bg-pink-100 p-4 sm:p-6 border-4 border-black shadow-[4px_4px_0px_#000]">
                <p className="text-sm sm:text-lg font-bold mb-4 leading-relaxed">
                  hii, kenalin my gwhj aku saya hadisty/disy/disty/disya/quro dll bebas dah asal jgn manggil R....awr aja
                </p>
                <p className="text-sm sm:text-lg font-bold leading-relaxed">
                  Aslinya project <strong>BlueBooth</strong> ini fomo aja sih, themanya Neo-Brutalism/Comic gini biar kalcer dan ga ngebosenin(kaya kalian). Feel free buat cekrak-cekrek di sini tapi kalo ketemu aku palak!
                </p>
              </div>
            </div>
            <div className="w-full lg:w-1/2 flex justify-center mt-6 lg:mt-0">
              <img src="/.jpeg" alt="Creator" className="w-[200px] sm:w-[280px] object-cover bg-white p-3 border-4 sm:border-8 border-black shadow-[8px_8px_0px_#f472b6] transform rotate-2 hover:rotate-0 transition-transform" />
            </div>
          </div>
        )}

{/* --- PAGE: SPOTLIGHT --- */}
        {step === 'spotlight' && (
          <div className="flex flex-col items-center w-full animate-fade-in-up bg-white p-6 sm:p-10 border-4 sm:border-8 border-black shadow-[8px_8px_0px_#000] sm:shadow-[15px_15px_0px_#000]">
            <h2 className="text-4xl sm:text-6xl font-black uppercase drop-shadow-[2px_2px_0px_#eab308] mb-8 text-center">Hall of Fame</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">
              
              {/* ARRAY DATA FOTO BERBEDA */}
              {[
                { id: 1, src: '/jaki.jpeg', name: 'jaki #1' },
                { id: 2, src: '/foto2.jpeg', name: 'GUEST #2' },
                { id: 3, src: '/disnifat.png', name: 'org keren #3' }
              ].map((item) => (
                <div key={item.id} className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 border-4 sm:border-8 border-black shadow-[6px_6px_0px_#3b82f6] transform hover:-translate-y-2 transition-transform">
                    <img src={item.src} alt={item.name} className="w-full aspect-[3/4] object-cover border-2 border-black" />
                    <div className="mt-2 text-center font-black text-xs sm:text-sm uppercase tracking-widest">{item.name}</div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        )}

        {/* --- PAGE: CONTACT (TAMBAH TIKTOK & X) --- */}
        {step === 'contact' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full animate-fade-in-up bg-white p-6 sm:p-10 border-4 sm:border-8 border-black shadow-[8px_8px_0px_#000] sm:shadow-[15px_15px_0px_#000]">
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              <h2 className="text-4xl sm:text-6xl font-black uppercase drop-shadow-[2px_2px_0px_#f472b6]">Say Hi!</h2>
              <p className="text-sm sm:text-lg font-bold">lagi bosen parah aja sih makanya bikin ginian wkwk. kalo mau sksd, nanya nanya, atau ngirim yappingan, ketik aja di bawah!</p>
              
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="NAMA..." 
                  className="w-full bg-blue-50 border-4 border-black px-4 py-3 font-black focus:outline-none focus:bg-yellow-50 uppercase" 
                />
                <textarea 
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="PESAN..." 
                  rows={4} 
                  className="w-full bg-blue-50 border-4 border-black px-4 py-3 font-black focus:outline-none focus:bg-yellow-50 uppercase resize-none"
                ></textarea>
                
                <button 
                  onClick={sendEmail}
                  className="w-full bg-black text-white px-6 py-4 border-4 border-black font-black uppercase shadow-[4px_4px_0px_#3b82f6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#3b82f6] transition-all"
                >
                  Kirim via Email ✉️
                </button>
              </div>

            </div>
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center gap-4 bg-yellow-400 p-8 border-4 border-black shadow-[8px_8px_0px_#000] transform rotate-1">
              <h3 className="font-black text-2xl uppercase mb-2">Or Stalk My Socials</h3>
              <a href="https://instagram.com/hadistyyy" target="_blank" rel="noreferrer" className="w-full text-center bg-white px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_#000] hover:-translate-y-1 transition-transform">
                IG: @hadistyyy
              </a>
              <a href="https://tiktok.com/@disyarratu" target="_blank" rel="noreferrer" className="w-full text-center bg-white px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_#000] hover:-translate-y-1 transition-transform">
                TikTok: @hdstyn
              </a>
              <a href="https://x.com/disyyAp" target="_blank" rel="noreferrer" className="w-full text-center bg-white px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_#000] hover:-translate-y-1 transition-transform">
                X: @disyyAp
              </a>
            </div>
          </div>
        )}

        {/* --- STEP 2: SETUP --- */}
        {step === 'setup' && (
          <div className="bg-white p-6 sm:p-10 border-4 sm:border-8 border-black shadow-[10px_10px_0px_#000] sm:shadow-[15px_15px_0px_#000] w-full max-w-4xl animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-black mb-8 sm:mb-10 text-black tracking-tight text-center uppercase drop-shadow-[2px_2px_0px_#3b82f6]">Customize Session</h2>
            
            <div className="mb-8 sm:mb-10 bg-blue-50 p-4 sm:p-8 border-2 sm:border-4 border-black shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000]">
              <span className="block text-xs sm:text-sm font-black text-black mb-4 sm:mb-5 uppercase tracking-[0.2em] text-center bg-yellow-400 px-4 py-2 border-2 border-black w-full">1. Pilih Grid Layout</span>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-6 w-full mt-4">
                {(['1', '2', '3', '4', '2x2'] as LayoutOption[]).map((num) => (
                  <button 
                    key={num}
                    onClick={() => setLayoutType(num)}
                    className={`w-[85px] h-[100px] sm:w-[120px] sm:h-[140px] border-2 sm:border-4 border-black transition-all flex flex-col items-center justify-center gap-2 sm:gap-3 ${layoutType === num ? 'bg-blue-600 text-white shadow-[0px_0px_0px_#000] translate-x-1 translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] hover:bg-slate-100'}`}
                  >
                    <div className={`flex gap-1 p-1 border-2 border-current bg-white ${num === '2x2' ? 'flex-wrap w-8 h-8 sm:w-12 sm:h-12' : 'flex-col w-6 sm:w-8 h-8 sm:h-12'}`}>
                      {Array.from({ length: num === '2x2' ? 4 : parseInt(num) }).map((_, i) => (
                        <div key={i} className={`flex-1 ${num === '2x2' ? 'w-[45%] h-[45%]' : 'w-full'} ${layoutType === num ? 'bg-blue-400' : 'bg-slate-300'}`}></div>
                      ))}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black tracking-[0.1em] sm:tracking-[0.15em] uppercase">{num === '1' ? 'POLAROID' : num === '2x2' ? 'SQUARE' : `${num} GRID`}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 sm:mb-10 bg-pink-50 p-4 sm:p-8 border-2 sm:border-4 border-black shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000]">
              <span className="block text-xs sm:text-sm font-black text-black mb-4 sm:mb-5 uppercase tracking-[0.2em] text-center bg-blue-300 px-4 py-2 border-2 border-black w-full">2. Filter Lensa Kamera</span>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
                {PHOTO_FILTERS.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-2 sm:px-6 sm:py-4 border-2 sm:border-4 border-black text-[10px] sm:text-xs font-black uppercase transition-all ${activeFilter.name === filter.name ? 'bg-pink-500 text-white shadow-[0px_0px_0px_#000] translate-x-1 translate-y-1' : 'bg-white text-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:bg-slate-100'}`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center pt-4 sm:pt-6 gap-3 sm:gap-4">
              <button onClick={() => setStep('home')} className="text-black font-black uppercase hover:underline transition w-full sm:w-auto py-2 sm:py-3 text-sm sm:text-base">
                Batal
              </button>
              <button 
                onClick={() => setStep('camera')}
                className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-yellow-400 text-black border-2 sm:border-4 border-black shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] font-black uppercase text-base sm:text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
              >
                Buka Kamera ➡️
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: CAMERA --- */}
        {step === 'camera' && (
          <div className="bg-white p-4 sm:p-8 border-4 sm:border-8 border-black shadow-[10px_10px_0px_#000] sm:shadow-[15px_15px_0px_#000] w-full max-w-4xl flex flex-col items-center animate-fade-in-up">
            <div className="w-full flex justify-between items-center px-3 sm:px-6 py-2 sm:py-4 mb-3 sm:mb-4 bg-slate-100 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
              <button 
                onClick={() => { setStep(retakeIndex !== null ? 'result' : 'setup'); setRetakeIndex(null); }}
                disabled={isShooting}
                className="text-black font-black uppercase disabled:opacity-50 hover:underline text-xs sm:text-sm"
              >
                ⬅ Batal {retakeIndex !== null && 'Retake'}
              </button>
              
              <div className="flex items-center gap-2 sm:gap-4">
                {!isShooting && (
                  <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-1.5 sm:p-2 bg-white border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-200 transition text-sm sm:text-lg active:translate-y-[2px] active:shadow-none"
                    title="Balik Kamera"
                  >
                    🔄
                  </button>
                )}
                {retakeIndex !== null ? (
                  <span className="font-black text-white bg-blue-600 border-2 sm:border-4 border-black px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs shadow-[2px_2px_0px_#000]">
                    RETAKE SHOT {retakeIndex + 1}
                  </span>
                ) : (
                  <span className="font-black text-black bg-white border-2 sm:border-4 border-black px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs shadow-[2px_2px_0px_#000]">
                    SHOT {photos.length} / {getLayoutCount()}
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black border-4 sm:border-8 border-black overflow-hidden shadow-[4px_4px_0px_#3b82f6] sm:shadow-[8px_8px_0px_#3b82f6] flex items-center justify-center">
              {!hasStream && <span className="animate-pulse text-white font-black text-sm sm:text-xl uppercase">MEMUAT LENSA...</span>}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: activeFilter.css }}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasStream ? 'opacity-100' : 'opacity-0'}`}
              />

              {hasStream && (
                <div className="absolute inset-0 pointer-events-none z-10 p-4 sm:p-10 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 sm:w-16 sm:h-16 border-t-4 sm:border-t-8 border-l-4 sm:border-l-8 border-white"></div>
                    <div className="w-8 h-8 sm:w-16 sm:h-16 border-t-4 sm:border-t-8 border-r-4 sm:border-r-8 border-white"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 sm:w-16 sm:h-16 border-b-4 sm:border-b-8 border-l-4 sm:border-l-8 border-white"></div>
                    <div className="w-8 h-8 sm:w-16 sm:h-16 border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-white"></div>
                  </div>
                </div>
              )}

              {isFlashing && <div className="absolute inset-0 bg-white z-20" />}
              
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <span 
                    className="text-[8rem] sm:text-[15rem] font-black text-yellow-400 leading-none"
                    style={{ WebkitTextStroke: '4px black', textShadow: '6px 6px 0px #000' }}
                  >
                    {countdown}
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={startPhotoshoot}
              disabled={!hasStream || isShooting}
              className="mt-6 sm:mt-8 mb-2 w-16 h-16 sm:w-24 sm:h-24 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 border-4 sm:border-8 border-black shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:shadow-none flex items-center justify-center"
            >
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white border-2 sm:border-4 border-black" />
            </button>
          </div>
        )}

        {/* --- STEP 4: RESULT & EDITOR --- */}
        {step === 'result' && (
          <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white border-4 sm:border-8 border-black shadow-[10px_10px_0px_#000] sm:shadow-[15px_15px_0px_#000] overflow-hidden animate-fade-in-up mx-auto">
            
            <div className="p-5 sm:p-8 w-full lg:w-1/2 flex flex-col gap-4 sm:gap-6 border-b-4 sm:border-b-8 lg:border-b-0 lg:border-r-4 sm:lg:border-r-8 border-black bg-blue-50 order-2 lg:order-1 overflow-y-auto custom-scrollbar max-h-[80vh] sm:max-h-[85vh]">
              
              <div className="bg-white p-3 sm:p-4 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
                <h3 className="font-black text-[10px] sm:text-xs text-black uppercase tracking-[0.2em] mb-2 sm:mb-3 bg-yellow-400 inline-block px-2 border-2 border-black">Custom Title</h3>
                <input 
                  type="text" 
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  maxLength={15}
                  placeholder="Ketik namamu..."
                  className="w-full bg-white border-2 sm:border-4 border-black px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm font-black text-black focus:outline-none focus:bg-yellow-50 uppercase"
                />
              </div>

              <div className="bg-white p-3 sm:p-4 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
                <h3 className="font-black text-[10px] sm:text-xs text-black uppercase tracking-[0.2em] mb-2 sm:mb-3 bg-pink-400 text-white inline-block px-2 border-2 border-black">Frame Theme</h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-3 max-h-[150px] sm:max-h-[200px] overflow-y-auto p-2 sm:p-4 bg-slate-100 border-2 sm:border-4 border-black custom-scrollbar">
                  {FRAME_STYLES.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setActiveColor(color)}
                      style={color.type === 'theme' ? color.bgStyle : {backgroundColor: color.hex}}
                      className={`w-10 h-10 sm:w-12 sm:h-12 border-2 sm:border-4 border-black transition-all ${activeColor.name === color.name ? 'shadow-[0px_0px_0px_#000] translate-x-[2px] translate-y-[2px] ring-2 ring-yellow-400' : 'shadow-[2px_2px_0px_#000] hover:bg-slate-200'} relative overflow-hidden`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]">
                <h3 className="font-black text-[10px] sm:text-xs text-black uppercase tracking-[0.2em] mb-2 sm:mb-3 bg-green-400 text-white inline-block px-2 border-2 border-black">Sticker Pack</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {STICKER_PACKS.map((pack) => (
                    <button
                      key={pack.name}
                      onClick={() => setActiveSticker(pack)}
                      className={`py-2 px-1 border-2 sm:border-4 border-black text-[10px] font-black uppercase transition-all flex justify-center items-center gap-1 ${activeSticker.name === pack.name ? 'bg-blue-600 text-white shadow-[0px_0px_0px_#000] translate-x-[2px] translate-y-[2px]' : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:bg-slate-100'}`}
                    >
                      {pack.images.length > 0 && <img src={pack.images[0]} alt="icon" className="w-4 h-4 mr-1 inline-block" />}
                      {pack.name.replace(/[^\w\s]/gi, '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-grow"></div>

              <div className="flex flex-col gap-2 sm:gap-3 mt-2">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button 
                    onClick={downloadPhotostrip}
                    className="w-full py-3 sm:py-4 bg-blue-600 text-white border-2 sm:border-4 border-black font-black text-[10px] sm:text-xs uppercase shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex justify-center items-center gap-1"
                  >
                    ⬇️ Simpan
                  </button>
                  <button 
                    onClick={sharePhotostrip}
                    disabled={isSharing}
                    className="w-full py-3 sm:py-4 bg-pink-500 text-white border-2 sm:border-4 border-black font-black text-[10px] sm:text-xs uppercase shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex justify-center items-center gap-1 disabled:opacity-50"
                  >
                    {isSharing ? '⏳ Loading...' : '📤 Share'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button 
                    onClick={() => { setPhotos([]); setStep('camera'); setRetakeIndex(null); }}
                    className="py-3 sm:py-4 bg-white text-black border-2 sm:border-4 border-black font-black uppercase shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-[10px] sm:text-xs"
                  >
                    🔄 Retake Semua
                  </button>
                  <button 
                    onClick={() => { setPhotos([]); setStep('home'); setRetakeIndex(null); }}
                    className="py-3 sm:py-4 bg-yellow-400 text-black border-2 sm:border-4 border-black font-black uppercase shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-[10px] sm:text-xs"
                  >
                    🏠 Selesai
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10 w-full lg:w-1/2 flex justify-center items-center relative order-1 lg:order-2 overflow-hidden bg-white" style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '15px 15px' }}>
              
              <div 
                className={`p-3 sm:p-5 pb-12 sm:pb-20 border-4 sm:border-8 border-black shadow-[10px_10px_0px_#000] sm:shadow-[15px_15px_0px_#000] transition-all duration-700 ease-in-out relative z-10
                  ${layoutType === '2x2' ? 'w-full max-w-[300px] sm:max-w-[340px] grid grid-cols-2 gap-2 sm:gap-4' : 
                    layoutType === '1' ? 'w-full max-w-[260px] sm:max-w-[300px] flex flex-col gap-3 sm:gap-4' : 
                    'w-full max-w-[240px] sm:max-w-[280px] flex flex-col gap-3 sm:gap-4'
                  }`}
                style={activeColor.type === 'solid' ? { backgroundColor: activeColor.hex } : activeColor.bgStyle}
              >
                {activeColor.type === 'theme' && (
                   <div className="absolute inset-0 z-0" style={{cssText: activeColor.bgStyle} as React.CSSProperties}></div>
                )}

                {photos.map((src, index) => (
                  <div 
                    key={index} 
                    className="w-full aspect-video overflow-hidden relative border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] z-10 group/photo cursor-pointer bg-white hover:-translate-y-1 hover:translate-x-[2px] transition-transform"
                    onClick={() => {
                      setRetakeIndex(index);
                      setStep('camera');
                    }}
                    title="Klik buat Retake foto ini"
                  >
                    <img src={src} alt={`shot-${index}`} className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 sm:gap-2">
                      <span className="text-3xl sm:text-4xl drop-shadow-[2px_2px_0px_#000]">🔄</span>
                      <span className="text-white font-black text-[8px] sm:text-xs tracking-[0.2em] drop-shadow-[2px_2px_0px_#000]">RETAKE</span>
                    </div>

                    {activeSticker.images.length > 0 && (
                      <>
                        <img src={activeSticker.images[index % activeSticker.images.length]} alt="sticker" className="absolute -left-2 sm:-left-4 bottom-1 sm:bottom-2 w-8 h-8 sm:w-14 sm:h-14 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] pointer-events-none z-20" />
                        <img src={activeSticker.images[(index + 1) % activeSticker.images.length]} alt="sticker" className="absolute -right-2 sm:-right-4 top-1 sm:top-2 w-8 h-8 sm:w-14 sm:h-14 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] pointer-events-none z-20 rotate-12" />
                      </>
                    )}
                  </div>
                ))}
                
                <div className="absolute left-0 right-0 bottom-3 sm:bottom-5 text-center transition-colors duration-700 z-10 flex flex-col items-center justify-center h-[40px] sm:h-[60px]" style={{ color: activeColor.text }}>
                  {activeColor.textBg && (
                    <div className="absolute inset-0 mx-3 sm:mx-4 border-2 sm:border-4 border-black z-[-1] transition-colors duration-500 shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000]" style={{ backgroundColor: activeColor.textBg }}></div>
                  )}
                  <p className="font-black tracking-[0.1em] sm:tracking-[0.2em] text-base sm:text-2xl w-full px-4 sm:px-6 truncate uppercase" style={{ WebkitTextStroke: '1px black' }}>
                    {customTitle || 'BLUEBOOTH'}
                  </p>
                  <p className="text-[7px] sm:text-[9px] mt-0.5 sm:mt-1 font-black tracking-widest uppercase bg-white text-black px-1 sm:px-2 border border-black inline-block">{activeFilter.name.replace(/[^\w\s]/gi, '')} • 2026</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-left: 2px solid #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border: 2px solid #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2563eb; }
      `}} />
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}