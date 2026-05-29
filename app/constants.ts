import React from 'react';

export type FrameStyle = {
  name: string;
  type: 'solid' | 'theme';
  bgStyle?: React.CSSProperties; 
  hex?: string;
  text: string;
  textBg?: string; 
  renderCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
};

export const FRAME_STYLES: FrameStyle[] = [
  {
    name: "Comic Pop (Blue)", type: 'theme', text: '#ffffff', textBg: '#000000',
    bgStyle: { backgroundColor: '#3b82f6', backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '15px 15px' },
    renderCanvas: (ctx, w, h) => {
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000000';
      for(let i=0; i<w; i+=15) {
        for(let j=0; j<h; j+=15) { ctx.beginPath(); ctx.arc(i, j, 2, 0, Math.PI*2); ctx.fill(); }
      }
    }
  },
  {
    name: "Andy's Room", type: 'theme', text: '#000000', textBg: '#ffffff',
    bgStyle: { backgroundColor: '#38bdf8', backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 10%, transparent 10%), radial-gradient(circle at 80% 60%, #fff 15%, transparent 15%)' },
    renderCanvas: (ctx, w, h) => {
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w*0.2, h*0.1, 40, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.8, h*0.5, 60, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.1, h*0.8, 50, 0, Math.PI*2); ctx.fill();
    }
  },
  {
    name: "Bikini Bottom", type: 'theme', text: '#000000', textBg: '#fef08a',
    bgStyle: { backgroundColor: '#fde047', backgroundImage: 'radial-gradient(circle at 10% 20%, #eab308 5%, transparent 5%), radial-gradient(circle at 90% 80%, #eab308 8%, transparent 8%)' },
    renderCanvas: (ctx, w, h) => {
      ctx.fillStyle = '#fde047'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(w*0.1, h*0.15, 30, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.85, h*0.75, 45, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.2, h*0.8, 25, 0, Math.PI*2); ctx.fill();
    }
  },
  {
    name: "Skena Checker", type: 'theme', text: '#ffffff', textBg: '#000000',
    bgStyle: { backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' },
    renderCanvas: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000000';
      for(let i=0; i<w; i+=40) {
        for(let j=0; j<h; j+=40) { if((i/40 + j/40) % 2 === 0) ctx.fillRect(i, j, 40, 40); }
      }
    }
  },
  { name: 'Onyx Black', type: 'solid', text: '#ffffff', hex: '#000000', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#000000'; ctx.fillRect(0,0,w,h); } },
  { name: 'Pure White', type: 'solid', text: '#000000', hex: '#ffffff', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h); } },
  { name: 'Cobalt Blue', type: 'solid', text: '#ffffff', hex: '#2563eb', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#2563eb'; ctx.fillRect(0,0,w,h); } },
  { name: 'Hot Pink', type: 'solid', text: '#000000', hex: '#f472b6', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#f472b6'; ctx.fillRect(0,0,w,h); } },
  { name: 'Neon Lime', type: 'solid', text: '#000000', hex: '#bef264', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#bef264'; ctx.fillRect(0,0,w,h); } },
  { name: 'Lilac', type: 'solid', text: '#000000', hex: '#d8b4fe', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#d8b4fe'; ctx.fillRect(0,0,w,h); } },
  { name: 'Warning Yellow', type: 'solid', text: '#000000', hex: '#facc15', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#facc15'; ctx.fillRect(0,0,w,h); } },
  { name: 'Crimson Red', type: 'solid', text: '#ffffff', hex: '#e11d48', renderCanvas: (ctx, w, h) => { ctx.fillStyle = '#e11d48'; ctx.fillRect(0,0,w,h); } },
];

export const PHOTO_FILTERS = [
  { name: 'Original', css: 'none', ctxFilter: 'none' },
  { name: 'Comic Contrast', css: 'brightness(1.1) contrast(1.2) saturate(1.3)', ctxFilter: 'brightness(1.1) contrast(1.2) saturate(1.3)' },
  { name: 'Cool Film', css: 'brightness(1.05) contrast(1.1) saturate(1.1) sepia(0.1) hue-rotate(-15deg)', ctxFilter: 'brightness(1.05) contrast(1.1) saturate(1.1) sepia(0.1) hue-rotate(-15deg)' },
  { name: 'Warm Analog', css: 'brightness(1.05) contrast(1.05) saturate(1.2) sepia(0.2) hue-rotate(-5deg)', ctxFilter: 'brightness(1.05) contrast(1.05) saturate(1.2) sepia(0.2) hue-rotate(-5deg)' },
  { name: 'Vintage', css: 'sepia(0.3) contrast(1.1) brightness(0.9) hue-rotate(-10deg)', ctxFilter: 'sepia(0.3) contrast(1.1) brightness(0.9) hue-rotate(-10deg)' },
  { name: 'Manga B&W', css: 'grayscale(1) contrast(1.4) brightness(1.1)', ctxFilter: 'grayscale(1) contrast(1.4) brightness(1.1)' },
];

export const getImgUrl = (hexCode: string) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hexCode}.png`;

export const STICKER_PACKS = [
  { name: 'Polos', images: [] },
  { name: 'Coquette 🎀', images: [getImgUrl('1f380'), getImgUrl('1f352'), getImgUrl('2728')] }, 
  { name: 'Y2K ✨', images: [getImgUrl('2728'), getImgUrl('1f98b'), getImgUrl('2b50')] }, 
  { name: 'Skena 🎱', images: [getImgUrl('1f3b1'), getImgUrl('1f578'), getImgUrl('1f3a7')] }, 
  { name: 'Love 🤍', images: [getImgUrl('1f90d'), getImgUrl('1f5a4'), getImgUrl('1f496')] }, 
];

export type LayoutOption = '1' | '2' | '3' | '4' | '2x2';
export type AppStep = 'home' | 'setup' | 'camera' | 'result' | 'about' | 'spotlight' | 'contact';
export type CameraFacing = 'user' | 'environment';