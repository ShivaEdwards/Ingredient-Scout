import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, Check, Crop as CropIcon, Image as ImageIcon, Type as TypeIcon, Scan as ScanIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

interface Point {
  x: number;
  y: number;
}

interface ImageScannerProps {
  onImageCaptured: (base64: string) => void;
  onManualTextSubmit: (text: string) => void;
  isProcessing: boolean;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({ onImageCaptured, onManualTextSubmit, isProcessing }) => {
  const [mode, setMode] = useState<'upload' | 'camera' | 'crop' | 'manual'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  
  // 4 corners in percentages (0-100)
  const [corners, setCorners] = useState<Point[]>([
    { x: 10, y: 10 }, // TL
    { x: 90, y: 10 }, // TR
    { x: 90, y: 90 }, // BR
    { x: 10, y: 90 }, // BL
  ]);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCropImage(base64);
        setMode('crop');
        // Reset corners to default rectangle
        setCorners([
          { x: 15, y: 15 },
          { x: 85, y: 15 },
          { x: 85, y: 85 },
          { x: 15, y: 85 },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: true,
    disabled: isProcessing
  });

  const startCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setMode('upload');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg');
        
        stopCamera();
        setCropImage(base64);
        setMode('crop');
        setCorners([
          { x: 15, y: 15 },
          { x: 85, y: 15 },
          { x: 85, y: 85 },
          { x: 15, y: 85 },
        ]);
      }
    }
  };

  const cancelCamera = () => {
    stopCamera();
    setMode('upload');
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCorner(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeCorner === null || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the container
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    const newCorners = [...corners];
    newCorners[activeCorner] = { x, y };
    setCorners(newCorners);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeCorner !== null) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setActiveCorner(null);
    }
  };

  const getCroppedImg = async () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find bounding box of the 4 corners
    const minX = Math.min(...corners.map(c => c.x)) / 100;
    const minY = Math.min(...corners.map(c => c.y)) / 100;
    const maxX = Math.max(...corners.map(c => c.x)) / 100;
    const maxY = Math.max(...corners.map(c => c.y)) / 100;

    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;

    const cropX = minX * naturalWidth;
    const cropY = minY * naturalHeight;
    const cropWidth = (maxX - minX) * naturalWidth;
    const cropHeight = (maxY - minY) * naturalHeight;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.drawImage(
      imgRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const base64 = canvas.toDataURL('image/jpeg');
    setPreview(base64);
    onImageCaptured(base64);
    setMode('upload');
    setCropImage(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualText.trim()) {
      onManualTextSubmit(manualText);
      setMode('upload');
      setManualText('');
    }
  };

  // SVG Path for the semi-transparent overlay with a hole
  const getOverlayPath = () => {
    if (!corners.length) return "";
    const c = corners;
    // Outer rectangle (clockwise) + Inner quadrilateral (counter-clockwise) to create a hole
    return `M 0 0 H 100 V 100 H 0 Z M ${c[0].x} ${c[0].y} L ${c[3].x} ${c[3].y} L ${c[2].x} ${c[2].y} L ${c[1].x} ${c[1].y} Z`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {mode === 'upload' && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            onClick={startCamera}
            className={cn(
              "relative border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group",
              isDragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Camera size={40} />
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-slate-900">
                Scan label
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Tap to open camera and scan ingredients
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={open}
              disabled={isProcessing}
              className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm"
            >
              <ImageIcon size={20} className="text-emerald-600" />
              Gallery
            </button>
            <button
              onClick={() => setMode('manual')}
              disabled={isProcessing}
              className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm"
            >
              <TypeIcon size={20} className="text-emerald-600" />
              Type
            </button>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
              <TypeIcon size={20} className="text-emerald-600" />
              Manual Input
            </h3>
            <button onClick={() => setMode('upload')} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleManualSubmit}>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste or type the ingredients list here..."
              className="w-full h-40 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none text-slate-700"
              required
            />
            <button
              type="submit"
              className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Analyze Ingredients
            </button>
          </form>
        </motion.div>
      )}

      {mode === 'camera' && (
        <div className="relative bg-black rounded-3xl overflow-hidden aspect-[3/4] flex items-center justify-center shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
            <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-medium flex items-center gap-2">
              <ScanIcon size={14} />
              Align ingredients in center
            </div>
          </div>
          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
            <button
              onClick={cancelCamera}
              className="p-4 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors"
            >
              <X size={24} />
            </button>
            <button
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full p-1 shadow-lg transform active:scale-90 transition-transform"
            >
              <div className="w-full h-full rounded-full border-4 border-slate-900 flex items-center justify-center">
                <div className="w-14 h-14 bg-emerald-500 rounded-full" />
              </div>
            </button>
            <div className="w-14 h-14" /> {/* Spacer for balance */}
          </div>
        </div>
      )}

      {mode === 'crop' && cropImage && (
        <div className="relative bg-slate-900 rounded-3xl overflow-hidden flex flex-col h-[80vh] max-h-[700px] shadow-2xl border border-slate-800">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <CropIcon size={18} className="text-emerald-500" />
              <span className="text-sm">Adjust corners to fit label</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode('upload');
                  setCropImage(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={getCroppedImg}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-emerald-600/20"
              >
                <Check size={18} />
                Done
              </button>
            </div>
          </div>
          
          <div className="relative flex-grow bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
            <div 
              ref={containerRef}
              className="relative inline-block max-w-full max-h-full"
            >
              <img
                ref={imgRef}
                src={cropImage}
                alt="Crop source"
                className="max-w-full max-h-[60vh] object-contain select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
              
              {/* SVG Overlay */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <path 
                  d={getOverlayPath()} 
                  fill="rgba(0,0,0,0.6)" 
                  fillRule="evenodd"
                />
                <path 
                  d={`M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              </svg>

              {/* Draggable Corners */}
              {corners.map((corner, i) => (
                <div
                  key={i}
                  onPointerDown={(e) => handlePointerDown(i, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={cn(
                    "absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center z-30 cursor-crosshair touch-none select-none",
                    activeCorner === i ? "scale-125" : "scale-100"
                  )}
                  style={{ 
                    left: `${corner.x}%`, 
                    top: `${corner.y}%`,
                    transition: activeCorner === null ? 'all 0.2s ease-out' : 'none'
                  }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-colors",
                    activeCorner === i ? "bg-emerald-400" : "bg-emerald-600"
                  )}>
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  
                  {/* Magnifier Guide Lines */}
                  {activeCorner === i && (
                    <div className="absolute pointer-events-none">
                      <div className="absolute w-[200vw] h-[1px] bg-emerald-500/30 -left-[100vw]" />
                      <div className="absolute h-[200vh] w-[1px] bg-emerald-500/30 -top-[100vh]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-slate-900/80 backdrop-blur-md text-center text-xs text-slate-400 font-medium border-t border-slate-800">
            Drag each corner individually to precisely outline the ingredient list.
          </div>
        </div>
      )}

      {preview && !isProcessing && mode === 'upload' && (
        <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={preview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
            <div>
              <p className="text-sm font-medium text-slate-900">Image captured</p>
              <p className="text-xs text-slate-500">Ready for analysis</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPreview(null);
              onImageCaptured("");
            }}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
