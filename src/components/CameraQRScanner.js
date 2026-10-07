'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { decodeQRFromImage } from '@/utils/qrDecoder';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Scan,
  Keyboard,
  AlertCircle,
  X,
  Loader2,
  FileImage,
} from 'lucide-react';

export default function CameraQRScanner({ onScanSuccess, onSwitchToManual }) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'NOT_FOUND', 'PERMISSION_DENIED', 'UNKNOWN'
  const [isSuccessBeep, setIsSuccessBeep] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileScanError, setFileScanError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerContainerId = 'qr-reader-video-container';

  // Function to initialize and start camera scanner
  const startScanner = async () => {
    setCameraError(null);
    setErrorType(null);
    setIsScanning(false);
    setFileScanError(null);

    // Stop any running scanner first
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // ignore cleanup error
      }
    }

    try {
      const isSecureContext =
        typeof window !== 'undefined' &&
        (window.isSecureContext ||
          window.location.protocol === 'https:' ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1');

      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        if (!isSecureContext) {
          setErrorType('INSECURE_HTTP');
          setCameraError(
            'Harang ng mobile browser ang camera access sa unsecure HTTP IP address (http://). Kinakailangan ang HTTPS o localhost.'
          );
        } else {
          setErrorType('UNSUPPORTED');
          setCameraError('Hindi nahanap o hindi suportado ng browser na ito ang camera video streaming.');
        }
        return;
      }

      const qrScanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = qrScanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
      };

      // Query available camera devices for iOS Safari & Android compatibility
      let cameraDevices = [];
      try {
        cameraDevices = await Html5Qrcode.getCameras();
      } catch (camListErr) {
        // Continue to facingMode fallback
      }

      if (cameraDevices && cameraDevices.length > 0) {
        // Select back/rear camera on iPhone / iPad / Android
        const rearCamera = cameraDevices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('0')
        );
        const targetCamId = rearCamera ? rearCamera.id : cameraDevices[cameraDevices.length - 1].id;

        await qrScanner.start(targetCamId, config, handleScanSuccess, () => {});
        setIsScanning(true);
      } else {
        // Fallback constraint mode
        try {
          await qrScanner.start({ facingMode: 'environment' }, config, handleScanSuccess, () => {});
          setIsScanning(true);
        } catch (backCamErr) {
          await qrScanner.start({ facingMode: 'user' }, config, handleScanSuccess, () => {});
          setIsScanning(true);
        }
      }
    } catch (err) {
      console.warn('Camera Scanner Notice:', err);
      setIsScanning(false);

      const errString = String(err).toLowerCase();
      if (errString.includes('notfounderror') || errString.includes('devices not found')) {
        setErrorType('NOT_FOUND');
        setCameraError('Walang nakitang physical camera / webcam sa iyong Desktop computer.');
      } else if (errString.includes('notallowederror') || errString.includes('permission')) {
        setErrorType('PERMISSION_DENIED');
        setCameraError('Naka-block ang camera access sa browser o Windows Privacy Settings.');
      } else {
        setErrorType('UNKNOWN');
        setCameraError('Hindi ma-access ang camera: ' + (err.message || 'Device in use or inaccessible'));
      }
    }
  };

  const handleScanSuccess = (decodedText) => {
    setIsSuccessBeep(true);
    setFileScanError(null);
    setTimeout(() => setIsSuccessBeep(false), 1200);

    if (onScanSuccess) {
      onScanSuccess(decodedText);
    }
  };

  // Start scanner on mount
  useEffect(() => {
    startScanner();

    // Support pasting image from clipboard (Ctrl+V)
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
          }
        } catch (e) {}
      }
    };
  }, []);

  // Process image file through robust multi-engine decoder
  const processImageFile = async (file) => {
    if (!file) return;
    setIsProcessingFile(true);
    setFileScanError(null);

    try {
      const decodedResult = await decodeQRFromImage(file);
      handleScanSuccess(decodedResult);
    } catch (err) {
      console.warn('Image QR Decode Error:', err);
      setFileScanError(
        err?.message ||
          'Hindi mabasa ang QR code sa larawan. Siguraduhing malinaw, nakagitna, at maliwanag ang QR code.'
      );
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Scan from Image File upload input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Camera Viewport / Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border-2 shadow-inner flex flex-col items-center justify-center min-h-[300px] transition-all ${
          isDragging ? 'border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-500/20' : 'border-emerald-500/80'
        }`}
      >
        {/* Html5Qrcode video element mounts here */}
        <div id={scannerContainerId} className="w-full h-full overflow-hidden" />

        {/* Visual Target Reticle Overlay with Laser Animation */}
        {isScanning && !cameraError && !isProcessingFile && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-emerald-400/90 rounded-2xl relative shadow-2xl flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                <span className="w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
              </div>

              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-lg shadow-emerald-400" />

              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                <span className="w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
              </div>
            </div>
          </div>
        )}

        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-300 z-30 animate-in fade-in">
            <FileImage className="w-12 h-12 mb-2 animate-bounce" />
            <p className="text-sm font-extrabold">I-drop dito ang QR code photo</p>
          </div>
        )}

        {/* Processing Image File Loading State */}
        {isProcessingFile && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 space-y-3 animate-in fade-in">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <Scan className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-emerald-300">Sinusuri ang QR Code sa Larawan...</p>
              <p className="text-[11px] text-slate-400">Gumagamit ng multi-scale & vision image decoder</p>
            </div>
          </div>
        )}

        {/* Camera Error Message & Actionable Solution Box */}
        {cameraError && !isProcessingFile && (
          <div className="p-6 text-center text-white space-y-3.5 max-w-md z-10 animate-in fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <CameraOff className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-black text-amber-300">
                {errorType === 'NOT_FOUND'
                  ? 'Walang Nakitang Camera Hardware'
                  : errorType === 'INSECURE_HTTP'
                  ? '⚠️ Camera Blocked (Insecure HTTP Network Access)'
                  : 'Camera Access Notice'}
              </h4>
              <p className="text-[11px] text-slate-300 leading-normal">
                {errorType === 'NOT_FOUND'
                  ? 'Dahil Desktop PC ang gamit mo na walang nakasaksak na webcam, i-upload ang QR photo o gamitin ang Manual Input.'
                  : errorType === 'INSECURE_HTTP'
                  ? 'Haharangin ng mobile browsers ang camera sa HTTP IP address. Gamitin ang Upload QR Photo o magpatakbo ng HTTPS.'
                  : cameraError}
              </p>
            </div>

            {/* Direct Alternative Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Photo File</span>
              </button>

              {onSwitchToManual && (
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Manual Input Mode</span>
                </button>
              )}

              <button
                type="button"
                onClick={startScanner}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-[10px] font-semibold transition-all cursor-pointer"
                title="Kung nagkabit ka ng USB camera"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Camera</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Scan Feedback Flash */}
        {isSuccessBeep && (
          <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center z-30 animate-in fade-in">
            <div className="px-5 py-3 rounded-2xl bg-white text-emerald-950 font-black text-xs shadow-2xl flex items-center gap-2.5 border border-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
              <span>QR Code Successfully Detected!</span>
            </div>
          </div>
        )}
      </div>

      {/* Inline File Scan Error Alert Box (No ugly browser popup) */}
      {fileScanError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-rose-800">Hindi nabasa ang QR code sa larawan</p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                {fileScanError}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer transition-all shadow-2xs"
                >
                  Pumili ng ibang larawan
                </button>
                {onSwitchToManual && (
                  <button
                    type="button"
                    onClick={onSwitchToManual}
                    className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] cursor-pointer transition-all"
                  >
                    I-type ang Property Number nang manual
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFileScanError(null)}
            className="p-1 text-rose-400 hover:text-rose-700 rounded-lg hover:bg-rose-100 cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input for QR Image Scan */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Action Toolbar below Viewfinder */}
      <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-bold">
          <Scan className="w-4 h-4 text-emerald-600" />
          <span>{isScanning ? 'Live Camera Active' : 'Image / QR Scanner'}</span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFile}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isProcessingFile ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Binabasa ang larawan...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Scan mula sa Photo File (o I-paste)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

