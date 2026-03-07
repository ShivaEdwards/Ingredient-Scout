import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RefreshCw, Check, Crop as CropIcon, Image as ImageIcon, Type as TypeIcon, Scan as ScanIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ImageScannerProps {
  onImageCaptured: (base64: string) => void;
  onManualTextSubmit: (text: string) => void;
  isProcessing: boolean;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({ onImageCaptured, onManualTextSubmit, isProcessing }) => {
  const [mode, setMode] = useState<'upload' | 'camera' | 'crop' | 'manual'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [manualText, setManualText] = useState('');
  
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
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: true, // We will trigger manually via the "Gallery" button
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
      }
    }
  };

  const cancelCamera = () => {
    stopCamera();
    setMode('upload');
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        undefined as any,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  };

  const getCroppedImg = async () => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
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
        <div className="relative bg-slate-100 rounded-3xl overflow-hidden flex flex-col max-h-[600px] shadow-xl border border-slate-200">
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <CropIcon size={18} />
              <span>Set all four corners</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode('upload');
                  setCropImage(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={getCroppedImg}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-bold shadow-md shadow-emerald-600/20"
              >
                <Check size={18} />
                Analyze
              </button>
            </div>
          </div>
          
          <div className="relative flex-grow overflow-auto p-4 flex items-center justify-center bg-slate-200 min-h-[400px]">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              className="max-w-full"
              minWidth={50}
              minHeight={50}
              keepSelection
            >
              <img
                ref={imgRef}
                src={cropImage}
                onLoad={onImageLoad}
                alt="Crop source"
                className="max-w-full max-h-[70vh] object-contain select-none"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            </ReactCrop>
          </div>
          
          <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 italic">
            Drag the corners to focus on the ingredient list only.
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
