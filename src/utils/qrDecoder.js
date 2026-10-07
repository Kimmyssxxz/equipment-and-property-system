'use client';

import jsQR from 'jsqr';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Loads an image file or blob into an HTMLImageElement
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Nabigong basahin ang image file: ' + (err?.message || 'Invalid format')));
    };
    img.src = url;
  });
}

/**
 * Draws image to a canvas with target width and height
 */
function createCanvasFromImage(img, targetWidth, targetHeight, cropRect = null) {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (cropRect) {
    ctx.drawImage(
      img,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      targetWidth,
      targetHeight
    );
  } else {
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  }
  return { canvas, ctx };
}

/**
 * Preprocessing: Grayscale & Contrast boost
 */
function applyGrayscaleAndContrast(imageData, contrast = 1.5) {
  const data = imageData.data;
  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let luma = 0.299 * r + 0.587 * g + 0.114 * b;
    luma = (luma - 128) * contrast + 128;
    luma = Math.max(0, Math.min(255, luma));
    data[i] = luma;
    data[i + 1] = luma;
    data[i + 2] = luma;
  }
}

/**
 * Preprocessing: Otsu / Mean Threshold Binarization
 */
function applyThresholding(imageData, invert = false) {
  const data = imageData.data;
  const len = data.length;
  let total = 0;
  const count = len / 4;
  for (let i = 0; i < len; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const avg = total / count;
  const threshold = Math.min(225, Math.max(30, avg));

  for (let i = 0; i < len; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = (invert ? luma < threshold : luma >= threshold) ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
}

/**
 * Try jsQR on canvas
 */
function scanCanvasWithJsQR(canvas, ctx) {
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data && code.data.trim()) {
      return code.data.trim();
    }
  } catch (e) {
    // ignore canvas read errors
  }
  return null;
}

/**
 * Try Native BarcodeDetector if supported by browser (Chromium / Safari 17+)
 */
async function scanWithNativeBarcodeDetector(source) {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }

  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    const detector = new window.BarcodeDetector({
      formats: formats && formats.length > 0
        ? formats
        : ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'data_matrix', 'aztec'],
    });

    const barcodes = await detector.detect(source);
    if (barcodes && barcodes.length > 0) {
      for (const bc of barcodes) {
        if (bc.rawValue && bc.rawValue.trim()) {
          return bc.rawValue.trim();
        }
      }
    }
  } catch (e) {
    // Ignore barcode detector errors and fallback
  }
  return null;
}

/**
 * Try Html5Qrcode in a clean, isolated temporary element
 */
async function scanWithIsolatedHtml5Qrcode(file) {
  if (typeof document === 'undefined') return null;
  const tempId = 'temp-qr-decoder-' + Date.now();
  let tempDiv = null;
  let qrScanner = null;

  try {
    tempDiv = document.createElement('div');
    tempDiv.id = tempId;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '1px';
    tempDiv.style.height = '1px';
    tempDiv.style.opacity = '0';
    tempDiv.style.pointerEvents = 'none';
    document.body.appendChild(tempDiv);

    qrScanner = new Html5Qrcode(tempId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
      ],
      verbose: false,
    });

    const result = await qrScanner.scanFile(file, false);
    if (result && typeof result === 'string' && result.trim()) {
      return result.trim();
    }
  } catch (e) {
    // Continue fallback
  } finally {
    if (qrScanner) {
      try {
        await qrScanner.clear();
      } catch (err) {}
    }
    if (tempDiv && tempDiv.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv);
    }
  }
  return null;
}

/**
 * Main Robust QR & Barcode Decode Function from File / Blob
 * Executes multi-engine, multi-scale, and multi-filter passes
 */
export async function decodeQRFromImage(file) {
  if (!file) throw new Error('Walang napiling file.');

  // 1. First attempt: Native Browser BarcodeDetector directly on File/Blob
  try {
    const nativeResult = await scanWithNativeBarcodeDetector(file);
    if (nativeResult) return nativeResult;
  } catch (e) {}

  // 2. Load the image into an HTMLImageElement
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  if (!origW || !origH) {
    throw new Error('Hindi ma-decode ang dimensyon ng larawan.');
  }

  // Check BarcodeDetector on image element
  try {
    const nativeResultImg = await scanWithNativeBarcodeDetector(img);
    if (nativeResultImg) return nativeResultImg;
  } catch (e) {}

  // 3. Multi-Scale Passes with jsQR
  // Downscale to multiple resolutions for QR finder optimization
  const scales = [
    Math.min(1.0, 1600 / Math.max(origW, origH)), // Max 1600px
    Math.min(1.0, 1000 / Math.max(origW, origH)), // Max 1000px (Sweet spot)
    Math.min(1.0, 700 / Math.max(origW, origH)),  // Max 700px
    Math.min(1.0, 450 / Math.max(origW, origH)),  // Max 450px
    1.0,                                          // Raw unscaled
  ];

  const uniqueScales = [...new Set(scales.map((s) => Math.round(s * 100) / 100))].filter((s) => s > 0);

  for (const scale of uniqueScales) {
    const targetW = Math.round(origW * scale);
    const targetH = Math.round(origH * scale);
    const { canvas, ctx } = createCanvasFromImage(img, targetW, targetH);

    // Pass A: Raw resized with jsQR
    let res = scanCanvasWithJsQR(canvas, ctx);
    if (res) return res;

    // Check BarcodeDetector on canvas
    res = await scanWithNativeBarcodeDetector(canvas);
    if (res) return res;

    // Pass B: High Contrast Grayscale
    const imgDataContrast = ctx.getImageData(0, 0, targetW, targetH);
    applyGrayscaleAndContrast(imgDataContrast, 1.8);
    ctx.putImageData(imgDataContrast, 0, 0);
    res = scanCanvasWithJsQR(canvas, ctx);
    if (res) return res;

    // Pass C: Binarized Thresholding
    const imgDataThresh = ctx.getImageData(0, 0, targetW, targetH);
    applyThresholding(imgDataThresh, false);
    ctx.putImageData(imgDataThresh, 0, 0);
    res = scanCanvasWithJsQR(canvas, ctx);
    if (res) return res;

    // Pass D: Inverted Binarized (For dark mode or white QR codes)
    const imgDataInvert = ctx.getImageData(0, 0, targetW, targetH);
    applyThresholding(imgDataInvert, true);
    ctx.putImageData(imgDataInvert, 0, 0);
    res = scanCanvasWithJsQR(canvas, ctx);
    if (res) return res;
  }

  // 4. Region of Interest (ROI) Cropping Passes
  // Handles photos where the QR code is centered or in a section of the photo
  const cropBoxes = [
    // Center 65%
    {
      x: Math.round(origW * 0.175),
      y: Math.round(origH * 0.175),
      width: Math.round(origW * 0.65),
      height: Math.round(origH * 0.65),
    },
    // Center 45%
    {
      x: Math.round(origW * 0.275),
      y: Math.round(origH * 0.275),
      width: Math.round(origW * 0.45),
      height: Math.round(origH * 0.45),
    },
    // Top Half
    {
      x: 0,
      y: 0,
      width: origW,
      height: Math.round(origH * 0.55),
    },
    // Bottom Half
    {
      x: 0,
      y: Math.round(origH * 0.45),
      width: origW,
      height: Math.round(origH * 0.55),
    },
  ];

  for (const crop of cropBoxes) {
    const targetW = 600;
    const targetH = 600;
    const { canvas, ctx } = createCanvasFromImage(img, targetW, targetH, crop);

    let res = scanCanvasWithJsQR(canvas, ctx);
    if (res) return res;

    res = await scanWithNativeBarcodeDetector(canvas);
    if (res) return res;

    // Contrast boost on crop
    const imgDataCrop = ctx.getImageData(0, 0, targetW, targetH);
    applyGrayscaleAndContrast(imgDataCrop, 1.6);
    ctx.putImageData(imgDataCrop, 0, 0);
    res = scanCanvasWithJsQR(canvas, ctx);
    if (res) return res;
  }

  // 5. Final fallback: Isolated Html5Qrcode engine
  const html5Res = await scanWithIsolatedHtml5Qrcode(file);
  if (html5Res) return html5Res;

  throw new Error('Hindi nabasa ang QR code sa larawan. Pakitapat nang maayos ang QR code sa gitna at siguraduhing maliwanag ang kuha.');
}
