import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false 
        });
        streamRef.current = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    startCamera();
    return () => stopCamera();
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(data);
        stopCamera();
      }
    }
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage.split(',')[1]);
    }
  };

  const retake = async () => {
    setCapturedImage(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false 
      });
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelClick = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="space-y-6">
      <div className="relative aspect-square sm:aspect-video rounded-3xl overflow-hidden bg-stone-50 border border-teal-500/20 shadow-lg">
        {!capturedImage ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
        )}
        
        <div className="absolute inset-0 pointer-events-none border-[40px] border-teal-950/40">
           <div className="w-full h-full border border-teal-500/30 rounded-xl" />
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleCancelClick}
          className="px-6 py-4 bg-stone-100/20 text-teal-600 font-medium rounded-xl hover:text-stone-800 transition-colors"
        >
          Cancel
        </button>
        {!capturedImage ? (
          <button 
            onClick={takePhoto}
            className="flex-grow flex items-center justify-center gap-3 py-4 bg-teal-500 text-stone-800 font-medium rounded-xl hover:bg-teal-400 transition-colors shadow-lg"
          >
            <Camera className="w-5 h-5" />
            CAPTURE HEALTH ID / QR
          </button>
        ) : (
          <>
            <button 
              onClick={retake}
              className="px-6 py-4 bg-stone-100/40 text-stone-700 font-medium rounded-xl hover:bg-teal-800 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={confirmPhoto}
              className="flex-grow flex items-center justify-center gap-3 py-4 bg-white text-stone-800 font-medium rounded-xl hover:bg-stone-100 transition-colors shadow-lg"
            >
              <Check className="w-5 h-5" />
              PROCESS CREDENTIALS
            </button>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
