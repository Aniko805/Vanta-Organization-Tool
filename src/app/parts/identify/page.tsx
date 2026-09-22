"use client";

import { useState, useRef } from "react";
import Sidebar from "@/app/components/Sidebar";

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
    <div className="min-h-screen bg-black text-white font-sans flex select-none">
      <Sidebar />

      <main className="flex-1 p-10 max-w-5xl mx-auto space-y-8">
        <header className="border-b border-zinc-900 pb-6">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Tools / CV Identification
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Part Identifier</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Scan or upload photos of parts to identify and add them to your team inventory.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera / Scan Box */}
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase font-mono tracking-wider">
              Camera Feed
            </h2>

            <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
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
                  className="px-4 py-2 bg-white text-black font-semibold text-xs rounded hover:bg-zinc-200 transition"
                >
                  Start Camera
                </button>
              )}

              {stream && (
                <button
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-emerald-500 text-black font-semibold text-xs rounded hover:bg-emerald-400 transition"
                >
                  Capture
                </button>
              )}

              {capturedImage && (
                <button
                  onClick={() => { setCapturedImage(null); startCamera(); }}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 font-semibold text-xs rounded hover:text-white transition"
                >
                  Retake
                </button>
              )}
            </div>
          </div>

          {/* Identification Details */}
          <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
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