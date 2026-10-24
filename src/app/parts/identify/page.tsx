"use client";

import { useState, useRef } from "react";
import Sidebar from "@/app/components/Sidebar";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  PAGE_BG,
} from "@/app/components/ui";

export default function PartsIdentifyPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/png"));
      stopCamera();
    }
  };

  return (
    <div className={`min-h-screen ${PAGE_BG} font-sans flex select-none`}>
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 pt-16 pb-6 md:p-10 max-w-5xl mx-auto space-y-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Tools / CV Identification
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">Part Identifier</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Scan or upload photos of parts to identify and add them to your team inventory.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera / Scan Box */}
          <div className={`p-6 ${CARD} space-y-4`}>
            <h2 className="text-sm font-semibold text-zinc-200 uppercase font-mono tracking-wider">
              Camera Feed
            </h2>

            <div className="relative aspect-video bg-zinc-900/50 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured scan" className="w-full h-full object-contain" />
              ) : stream ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <p className="text-xs font-mono text-zinc-500">Camera inactive</p>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              {!stream && !capturedImage && (
                <button
                  onClick={startCamera}
                  className={BTN_PRIMARY}
                >
                  Start Camera
                </button>
              )}

              {stream && (
                <button
                  onClick={capturePhoto}
                  className={BTN_PRIMARY}
                >
                  Capture
                </button>
              )}

              {capturedImage && (
                <button
                  onClick={() => { setCapturedImage(null); startCamera(); }}
                  className={BTN_SECONDARY}
                >
                  Retake
                </button>
              )}
            </div>
          </div>

          {/* Identification Details */}
          <div className={`p-6 ${CARD} space-y-4`}>
            <h2 className="text-sm font-semibold text-zinc-200 uppercase font-mono tracking-wider">
              Part Metadata
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Once captured, part recognition results and inventory mapping options will appear here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}