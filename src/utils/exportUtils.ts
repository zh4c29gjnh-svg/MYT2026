/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

const TRANSPARENT_1PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Detects iOS / iPadOS (including iPadOS desktop-mode Safari which reports MacIntel + touch points)
 */
export function isIosOrIpad(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
  );
}

function yieldForGc(ms = 35): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, ms));
    } else {
      setTimeout(resolve, ms);
    }
  });
}

function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return;
  try {
    canvas.width = 1;
    canvas.height = 1;
  } catch {
    // ignore
  }
}

/**
 * Triggers a browser download from a Blob object (with generous 60s revoke window for iPad Safari)
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 60000);
}

/**
 * Pre-resizes oversized images onto an offscreen canvas (max 1400px) to prevent WebKit/iPad RAM spikes
 */
async function ensureImageReadyForCanvas(
  img: HTMLImageElement,
  maxDim = 1350
): Promise<HTMLCanvasElement | HTMLImageElement | null> {
  try {
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2500);
      });
    }
    if (!img.naturalWidth || !img.naturalHeight) return null;

    if (typeof img.decode === 'function') {
      await img.decode().catch(() => {});
    }

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w <= maxDim && h <= maxDim) {
      return img;
    }

    const scale = maxDim / Math.max(w, h);
    const dw = Math.max(1, Math.round(w * scale));
    const dh = Math.max(1, Math.round(h * scale));
    const tmp = document.createElement('canvas');
    tmp.width = dw;
    tmp.height = dh;
    const ctx = tmp.getContext('2d');
    if (!ctx) return img;
    ctx.drawImage(img, 0, 0, dw, dh);
    return tmp;
  } catch {
    return null;
  }
}

interface CapturedImgPlacement {
  img: HTMLImageElement;
  normX: number;
  normY: number;
  normW: number;
  normH: number;
  clipNormX: number;
  clipNormY: number;
  clipNormW: number;
  clipNormH: number;
  objectFit: string;
  mixBlendMode: string;
  opacity: number;
}

/**
 * Draws a source image into target box respecting CSS object-fit ('contain' | 'cover' | 'fill')
 */
function drawImageWithObjectFit(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  objectFit: string
): void {
  const sw =
    source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const sh =
    source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!sw || !sh || dw <= 0 || dh <= 0) return;

  if (objectFit === 'contain') {
    const scale = Math.min(dw / sw, dh / sh);
    const rw = sw * scale;
    const rh = sh * scale;
    const rx = dx + (dw - rw) / 2;
    const ry = dy + (dh - rh) / 2;
    ctx.drawImage(source, 0, 0, sw, sh, rx, ry, rw, rh);
    return;
  }

  if (objectFit === 'cover') {
    const scale = Math.max(dw / sw, dh / sh);
    const cropW = dw / scale;
    const cropH = dh / scale;
    const sx = (sw - cropW) / 2;
    const sy = (sh - cropH) / 2;
    ctx.drawImage(source, sx, sy, cropW, cropH, dx, dy, dw, dh);
    return;
  }

  ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
}

/**
 * Renders a specific HTMLElement into an HTMLCanvasElement.
 * Key iPadOS Safari Fix:
 * - Images (`<img>`) are temporarily swapped to a 1x1 transparent PNG during html-to-image's
 *   SVG <foreignObject> pass so Safari never bloats SVG memory, never drops photos on page 2,
 *   and never blacks out pages 3+.
 * - Every `<img>` is then composited directly onto the output <canvas> with exact layout coordinates
 *   using native 2D ctx.drawImage(), which works 100% reliably on iPadOS, iOS, macOS, and Desktop.
 */
async function renderNodeToCanvas(
  element: HTMLElement,
  pixelRatioOverride?: number
): Promise<HTMLCanvasElement | null> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const ios = isIosOrIpad();
  const ratio = pixelRatioOverride ?? (ios ? 1.65 : 2.1);

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2500);
      });
    })
  );

  // Measure element and every <img> position relative to element BEFORE swapping src.
  // Because getBoundingClientRect() measures in the same transformed coordinate space for both
  // parent and child, normalizing against rootRect is 100% immune to DocumentZoomContainer CSS scale().
  const rootRect = element.getBoundingClientRect();
  const placements: CapturedImgPlacement[] = [];

  for (const img of images) {
    const imgRect = img.getBoundingClientRect();
    const style = window.getComputedStyle(img);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      imgRect.width <= 0 ||
      imgRect.height <= 0 ||
      rootRect.width <= 0 ||
      rootRect.height <= 0
    ) {
      continue;
    }

    // Check immediate overflow-hidden clip container if present
    const parentEl = img.parentElement;
    const parentStyle = parentEl ? window.getComputedStyle(parentEl) : null;
    const clipRect =
      parentEl && parentStyle && parentStyle.overflow !== 'visible'
        ? parentEl.getBoundingClientRect()
        : imgRect;

    placements.push({
      img,
      normX: (imgRect.left - rootRect.left) / rootRect.width,
      normY: (imgRect.top - rootRect.top) / rootRect.height,
      normW: imgRect.width / rootRect.width,
      normH: imgRect.height / rootRect.height,
      clipNormX: (clipRect.left - rootRect.left) / rootRect.width,
      clipNormY: (clipRect.top - rootRect.top) / rootRect.height,
      clipNormW: clipRect.width / rootRect.width,
      clipNormH: clipRect.height / rootRect.height,
      objectFit: style.objectFit || 'fill',
      mixBlendMode: style.mixBlendMode || 'normal',
      opacity: parseFloat(style.opacity || '1') || 1,
    });
  }

  // Pre-prepare downscaled image sources before swapping DOM src
  const preparedSources = new Map<
    HTMLImageElement,
    HTMLCanvasElement | HTMLImageElement | null
  >();
  for (const p of placements) {
    const ready = await ensureImageReadyForCanvas(p.img, ios ? 1150 : 1450);
    preparedSources.set(p.img, ready);
  }

  // Temporarily swap <img> src to a tiny 1px transparent placeholder while maintaining exact box layout
  const originalSrcs = new Map<HTMLImageElement, string>();
  const originalSrcsets = new Map<HTMLImageElement, string>();
  for (const img of images) {
    originalSrcs.set(img, img.src);
    if (img.srcset) {
      originalSrcsets.set(img, img.srcset);
      img.removeAttribute('srcset');
    }
    img.src = TRANSPARENT_1PX_PNG;
  }

  // Temporarily disable third-party stylesheets (e.g. Google Identity Services) that lack CORS headers
  const disabledLinks: HTMLLinkElement[] = [];
  const allLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  );
  for (const link of allLinks) {
    if (
      link.href &&
      link.href.includes('accounts.google.com') &&
      !link.disabled
    ) {
      link.disabled = true;
      disabledLinks.push(link);
    }
  }

  const targetWidth = element.offsetWidth || 794;
  const targetHeight = element.offsetHeight || 1123;
  const outW = Math.round(targetWidth * ratio);
  const outH = Math.round(targetHeight * ratio);

  const renderOptions = {
    width: targetWidth,
    height: targetHeight,
    canvasWidth: outW,
    canvasHeight: outH,
    pixelRatio: ratio,
    backgroundColor: '#ffffff',
    cacheBust: false,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
      boxShadow: 'none',
      border: 'none',
    },
  };

  let outCanvas: HTMLCanvasElement | null = null;

  try {
    try {
      outCanvas = await toCanvas(element, renderOptions);
    } catch (err) {
      console.warn('Retrying toCanvas with skipFonts:', err);
      outCanvas = await toCanvas(element, {
        ...renderOptions,
        skipFonts: true,
      });
    }
  } finally {
    for (const link of disabledLinks) {
      link.disabled = false;
    }
    for (const [img, origSrc] of originalSrcs.entries()) {
      img.src = origSrc;
    }
    for (const [img, origSrcset] of originalSrcsets.entries()) {
      img.setAttribute('srcset', origSrcset);
    }
  }

  if (!outCanvas) {
    for (const src of preparedSources.values()) {
      if (src instanceof HTMLCanvasElement) releaseCanvas(src);
    }
    return null;
  }

  // Ensure crisp solid white background underneath before compositing photos & signatures
  const ctx = outCanvas.getContext('2d');
  if (ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.restore();

    // Composite every real photo / signature directly onto the canvas
    for (const p of placements) {
      const source = preparedSources.get(p.img);
      if (!source) continue;

      const dx = p.normX * outCanvas.width;
      const dy = p.normY * outCanvas.height;
      const dw = p.normW * outCanvas.width;
      const dh = p.normH * outCanvas.height;

      const cx = p.clipNormX * outCanvas.width;
      const cy = p.clipNormY * outCanvas.height;
      const cw = p.clipNormW * outCanvas.width;
      const ch = p.clipNormH * outCanvas.height;

      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, cw, ch);
      ctx.clip();
      ctx.globalAlpha = p.opacity;
      if (p.mixBlendMode === 'multiply') {
        ctx.globalCompositeOperation = 'multiply';
      }
      drawImageWithObjectFit(ctx, source, dx, dy, dw, dh, p.objectFit);
      ctx.restore();
    }
  }

  // Clean up temporary per-image downscaled canvases immediately
  for (const src of preparedSources.values()) {
    if (src instanceof HTMLCanvasElement) releaseCanvas(src);
  }

  return outCanvas;
}

/**
 * Returns the page elements to export (each `.a4-print-page`, or the root element itself)
 */
function getExportPageNodes(elementId: string): HTMLElement[] {
  const root = document.getElementById(elementId);
  if (!root) {
    console.error(`Element with id "${elementId}" not found`);
    return [];
  }
  const pageNodes = Array.from(
    root.querySelectorAll<HTMLElement>('.a4-print-page')
  );
  return pageNodes.length > 0 ? pageNodes : [root];
}

/**
 * Creates a PDF Blob sequentially ONE page at a time, releasing each canvas immediately
 * after encoding as compressed JPEG so Safari on iPadOS never hits Canvas/RAM limits.
 */
export async function createPdfBlobFromElement(
  elementId: string,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<Blob | null> {
  const nodes = getExportPageNodes(elementId);
  if (nodes.length === 0) return null;

  const ios = isIosOrIpad();
  // Slightly lighter ratio when there are many pages on iOS/iPadOS so PDF size & RAM stay low
  const ratio = ios ? (nodes.length >= 5 ? 1.5 : 1.65) : 2.1;

  let pdf: jsPDF | null = null;

  for (let idx = 0; idx < nodes.length; idx++) {
    onProgress?.(idx + 1, nodes.length);
    const canvas = await renderNodeToCanvas(nodes[idx], ratio);
    if (!canvas) continue;

    const isLandscape = canvas.width > canvas.height;
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    if (!pdf) {
      pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
    } else {
      pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    }

    // Use JPEG compression (5-10x smaller in memory than raw PNG, zero black pages on iPadOS)
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    if (nodes.length > 1) {
      pdf.addImage(
        jpegDataUrl,
        'JPEG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );
    } else {
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      if (imgHeight <= pageHeight + 8) {
        pdf.addImage(
          jpegDataUrl,
          'JPEG',
          0,
          0,
          pageWidth,
          pageHeight,
          undefined,
          'FAST'
        );
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(
          jpegDataUrl,
          'JPEG',
          0,
          position,
          pageWidth,
          imgHeight,
          undefined,
          'FAST'
        );
        heightLeft -= pageHeight;

        while (heightLeft > 5) {
          position = heightLeft - imgHeight;
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
          pdf.addImage(
            jpegDataUrl,
            'JPEG',
            0,
            position,
            pageWidth,
            imgHeight,
            undefined,
            'FAST'
          );
          heightLeft -= pageHeight;
        }
      }
    }

    // Immediately release GPU/RAM canvas buffer before rendering the next page
    releaseCanvas(canvas);
    if (idx < nodes.length - 1) {
      await yieldForGc(ios ? 55 : 20);
    }
  }

  return pdf ? pdf.output('blob') : null;
}

/**
 * Downloads a DOM element as a PNG image file (stitched vertically when multi-page)
 */
export async function exportElementAsPng(
  elementId: string,
  fileName: string = 'document.png',
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<boolean> {
  try {
    const nodes = getExportPageNodes(elementId);
    if (nodes.length === 0) return false;

    const ios = isIosOrIpad();
    // Cap PNG scale so stitched multi-page canvas never exceeds iOS 16MP canvas pixel cap
    const ratio = ios
      ? nodes.length >= 4
        ? 1.05
        : nodes.length >= 2
        ? 1.3
        : 1.65
      : nodes.length >= 5
      ? 1.5
      : 2.0;

    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < nodes.length; i++) {
      onProgress?.(i + 1, nodes.length);
      const c = await renderNodeToCanvas(nodes[i], ratio);
      if (c) canvases.push(c);
      if (i < nodes.length - 1) {
        await yieldForGc(ios ? 45 : 15);
      }
    }

    if (canvases.length === 0) return false;

    let finalCanvas: HTMLCanvasElement;
    if (canvases.length === 1) {
      finalCanvas = canvases[0];
    } else {
      const gapPx = 20;
      const maxWidth = Math.max(...canvases.map((c) => c.width));
      const totalHeight =
        canvases.reduce((sum, c) => sum + c.height, 0) +
        gapPx * (canvases.length - 1);

      finalCanvas = document.createElement('canvas');
      finalCanvas.width = maxWidth;
      finalCanvas.height = totalHeight;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, maxWidth, totalHeight);
        let y = 0;
        for (const c of canvases) {
          ctx.drawImage(c, 0, y);
          y += c.height + gapPx;
        }
      }
      for (const c of canvases) releaseCanvas(c);
    }

    const finalName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    const blob = await new Promise<Blob | null>((resolve) =>
      finalCanvas.toBlob((b) => resolve(b), 'image/png', 1.0)
    );
    releaseCanvas(finalCanvas);

    if (!blob) return false;
    downloadBlob(blob, finalName);
    return true;
  } catch (err) {
    console.error('Failed to export element as PNG:', err);
    return false;
  }
}

/**
 * Downloads a DOM element as a high-quality PDF document (A4 portrait or landscape, 1 or more pages)
 */
export async function exportElementAsPdf(
  elementId: string,
  fileName: string = 'document.pdf',
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<boolean> {
  try {
    const pdfBlob = await createPdfBlobFromElement(elementId, onProgress);
    if (!pdfBlob) return false;

    const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    downloadBlob(pdfBlob, finalName);
    return true;
  } catch (err) {
    console.error('Failed to export element as PDF:', err);
    return false;
  }
}

/**
 * Mounts one or more rendered A4 page images into #myt-print-mount so @media print prints ONLY the A4 pages
 */
export function mountPrintImages(
  imgDataUrls: string[],
  isLandscape = false
): void {
  let mount = document.getElementById('myt-print-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'myt-print-mount';
    document.body.appendChild(mount);
  }

  let orientStyle = document.getElementById('myt-print-page-orientation');
  if (!orientStyle) {
    orientStyle = document.createElement('style');
    orientStyle.id = 'myt-print-page-orientation';
    document.head.appendChild(orientStyle);
  }
  orientStyle.textContent = isLandscape
    ? `@media print { @page { size: A4 landscape; margin: 0; } html, body, body.myt-printing-active > #myt-print-mount { width: 297mm !important; } }`
    : `@media print { @page { size: A4 portrait; margin: 0; } html, body, body.myt-printing-active > #myt-print-mount { width: 210mm !important; } }`;

  mount.innerHTML = '';
  imgDataUrls.forEach((dataUrl, idx) => {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Print Document Page ${idx + 1}`;
    img.style.width = isLandscape ? '297mm' : '210mm';
    img.style.height = isLandscape ? '210mm' : '297mm';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.pageBreakInside = 'avoid';
    if (idx < imgDataUrls.length - 1) {
      img.style.pageBreakAfter = 'always';
      img.style.breakAfter = 'page';
    }
    mount!.appendChild(img);
  });

  document.body.classList.add('myt-printing-active');
}

export function unmountPrintImage(): void {
  document.body.classList.remove('myt-printing-active');
}

/**
 * Attempts to trigger native browser print and returns true if the print dialog actually opened
 */
export function triggerPrint(): boolean {
  let dialogOpened = false;
  const onBeforePrint = () => {
    dialogOpened = true;
  };
  window.addEventListener('beforeprint', onBeforePrint, { once: true });
  try {
    window.print();
  } catch {
    // ignore
  }
  window.removeEventListener('beforeprint', onBeforePrint);
  return dialogOpened;
}

export interface PreparedPrintResult {
  ok: boolean;
  dialogOpened: boolean;
  imgDataUrl: string;
  pdfBlobUrl: string;
  pdfBlob: Blob;
}

/**
 * Renders the target A4 document element (all pages) page-by-page without exceeding iPad RAM,
 * mounts them for isolated A4 printing, attempts native window.print(), and returns print assets.
 */
export async function prepareAndTriggerPrint(
  elementId: string,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<PreparedPrintResult | null> {
  try {
    const nodes = getExportPageNodes(elementId);
    if (nodes.length === 0) return null;

    const ios = isIosOrIpad();
    const ratio = ios ? (nodes.length >= 5 ? 1.5 : 1.65) : 2.0;

    let pdf: jsPDF | null = null;
    const pageImgUrls: string[] = [];
    let isLandscape = false;

    for (let idx = 0; idx < nodes.length; idx++) {
      onProgress?.(idx + 1, nodes.length);
      const canvas = await renderNodeToCanvas(nodes[idx], ratio);
      if (!canvas) continue;

      if (idx === 0) {
        isLandscape = canvas.width > canvas.height;
      }

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      pageImgUrls.push(jpegDataUrl);

      if (!pdf) {
        pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });
      } else {
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      }

      pdf.addImage(
        jpegDataUrl,
        'JPEG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );

      releaseCanvas(canvas);
      if (idx < nodes.length - 1) {
        await yieldForGc(ios ? 45 : 15);
      }
    }

    if (!pdf || pageImgUrls.length === 0) return null;

    const pdfBlob = pdf.output('blob');
    const pdfBlobUrl = URL.createObjectURL(pdfBlob);

    mountPrintImages(pageImgUrls, isLandscape);

    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const dialogOpened = triggerPrint();

    return {
      ok: true,
      dialogOpened,
      imgDataUrl: pageImgUrls[0],
      pdfBlobUrl,
      pdfBlob,
    };
  } catch (err) {
    console.error('Failed to prepare document for print:', err);
    return null;
  }
}
