/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Image as ImageIcon,
  FileDown,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Eye,
  ExternalLink,
  X,
  Share2,
} from 'lucide-react';
import {
  exportElementAsPng,
  createPdfBlobFromElement,
  prepareAndTriggerPrint,
  triggerPrint,
  unmountPrintImage,
  isIosOrIpad,
  PreparedPrintResult,
} from '../../utils/exportUtils.ts';
import { uploadToGoogleDrive } from '../../services/googleWorkspace.ts';
import {
  getCachedAccessTokenSync,
  googleSignInForDrive,
  isInIframe,
} from '../../services/googleAuth.ts';
import confetti from 'canvas-confetti';

interface DocumentActionButtonsProps {
  elementId: string;
  documentTitle: string;
  fileName: string;
  onPreviewToggle?: () => void;
  isPreviewMode?: boolean;
  onSaveToSystem?: () => void;
  documentData?: any;
}

export const DocumentActionButtons: React.FC<DocumentActionButtonsProps> = ({
  elementId,
  documentTitle,
  fileName,
  onPreviewToggle,
  isPreviewMode = false,
  onSaveToSystem,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printModalState, setPrintModalState] =
    useState<PreparedPrintResult | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [driveResult, setDriveResult] = useState<{
    id: string;
    url?: string;
    fileName?: string;
  } | null>(null);
  const [readyPdfAsset, setReadyPdfAsset] = useState<{
    url: string;
    blob: Blob;
    name: string;
  } | null>(null);
  const [authPopupHint, setAuthPopupHint] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    return () => {
      if (readyPdfAsset?.url) {
        URL.revokeObjectURL(readyPdfAsset.url);
      }
    };
  }, [readyPdfAsset]);

  const triggerDownloadLink = (blobUrl: string, targetFileName: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = targetFileName;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 3000);
  };

  const handleSharePdfOnIpad = async (blob: Blob, targetFileName: string) => {
    try {
      const pdfFile = new File([blob], targetFileName, {
        type: 'application/pdf',
      });
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        navigator.canShare?.({ files: [pdfFile] })
      ) {
        await navigator.share({
          files: [pdfFile],
          title: documentTitle || targetFileName,
        });
        return true;
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Share sheet skipped:', err);
      }
    }
    return false;
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setMessage(null);
    setAuthPopupHint(false);
    setProgressLabel('กำลังเตรียมหน้าพิมพ์...');
    try {
      const prepared = await prepareAndTriggerPrint(
        elementId,
        (cur, total) => setProgressLabel(`กำลังจัดหน้าพิมพ์ ${cur}/${total}...`)
      );
      if (prepared) {
        if (!prepared.dialogOpened) {
          setPrintModalState(prepared);
        } else {
          unmountPrintImage();
          setMessage('ส่งคำสั่งพิมพ์เอกสาร A4 เรียบร้อยแล้ว');
          setTimeout(() => setMessage(null), 4000);
        }
      } else {
        setMessage('เกิดข้อผิดพลาดในการเตรียมหน้าเอกสารสำหรับพิมพ์');
      }
    } catch (err: any) {
      setMessage(`เกิดข้อผิดพลาดในการพิมพ์: ${err?.message || err}`);
    } finally {
      setIsPrinting(false);
      setProgressLabel(null);
    }
  };

  const handleClosePrintModal = () => {
    if (printModalState?.pdfBlobUrl) {
      URL.revokeObjectURL(printModalState.pdfBlobUrl);
    }
    unmountPrintImage();
    setPrintModalState(null);
  };

  const handleDownloadPdfFromPrintModal = () => {
    if (!printModalState) return;
    const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    triggerDownloadLink(printModalState.pdfBlobUrl, finalName);
  };

  const handleSavePng = async () => {
    setIsExportingPng(true);
    setMessage(null);
    setAuthPopupHint(false);
    setProgressLabel('กำลังเตรียมรูปภาพ PNG...');
    try {
      const ok = await exportElementAsPng(
        elementId,
        `${fileName}.png`,
        (cur, total) => setProgressLabel(`กำลังเรนเดอร์รูปหน้า ${cur}/${total}...`)
      );
      if (ok) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
        setMessage('บันทึกรูปภาพ PNG เรียบร้อยแล้ว');
      } else {
        setMessage('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
      }
    } catch (err: any) {
      setMessage(`เกิดข้อผิดพลาด: ${err?.message || err}`);
    } finally {
      setIsExportingPng(false);
      setProgressLabel(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSavePdf = async () => {
    setIsExportingPdf(true);
    setMessage(null);
    setAuthPopupHint(false);
    setProgressLabel('กำลังสร้าง PDF...');
    try {
      const pdfBlob = await createPdfBlobFromElement(
        elementId,
        (cur, total) => setProgressLabel(`กำลังสร้าง PDF หน้า ${cur}/${total}...`)
      );
      if (pdfBlob) {
        const finalName = fileName.endsWith('.pdf')
          ? fileName
          : `${fileName}.pdf`;
        const blobUrl = URL.createObjectURL(pdfBlob);

        if (readyPdfAsset?.url) {
          URL.revokeObjectURL(readyPdfAsset.url);
        }
        setReadyPdfAsset({ url: blobUrl, blob: pdfBlob, name: finalName });

        // Trigger standard download immediately
        triggerDownloadLink(blobUrl, finalName);

        confetti({ particleCount: 35, spread: 70, origin: { y: 0.8 } });
        setMessage(
          isIosOrIpad()
            ? 'สร้างเอกสาร PDF ครบทุกหน้าแล้ว — บน iPad สามารถกดปุ่ม "เปิดดู PDF" หรือ "บันทึกลงแอป Files" ด้านล่างได้ทันที'
            : 'บันทึกเอกสาร PDF เรียบร้อยแล้ว'
        );
      } else {
        setMessage('เกิดข้อผิดพลาดในการสร้าง PDF');
      }
    } catch (err: any) {
      setMessage(`เกิดข้อผิดพลาดในการสร้าง PDF: ${err?.message || err}`);
    } finally {
      setIsExportingPdf(false);
      setProgressLabel(null);
    }
  };

  const handleUploadDrive = async () => {
    setMessage(null);
    setDriveResult(null);
    setAuthPopupHint(false);

    // IMPORTANT FOR IPAD SAFARI:
    // Check token SYNCHRONOUSLY before any await so googleSignInForDrive() executes inside the user's tap gesture!
    const existingToken = getCachedAccessTokenSync();

    setIsUploadingDrive(true);
    try {
      if (!existingToken) {
        setProgressLabel('กำลังเชื่อมต่อบัญชี Google...');
        try {
          const authResult = await googleSignInForDrive();
          if (!authResult) {
            setMessage('กรุณาลงชื่อเข้าใช้ Google เพื่อบันทึกไฟล์ PDF เข้า Drive');
            setAuthPopupHint(true);
            setIsUploadingDrive(false);
            setProgressLabel(null);
            return;
          }
        } catch (authErr: any) {
          setMessage(
            authErr?.message ||
              'ไม่สามารถเปิดหน้าต่างเข้าสู่ระบบ Google ได้ กรุณาอนุญาต Pop-ups หรือเปิดแอปในแท็บใหม่'
          );
          setAuthPopupHint(true);
          setIsUploadingDrive(false);
          setProgressLabel(null);
          return;
        }
      }

      setProgressLabel('กำลังสร้างไฟล์ PDF...');
      const finalPdfName = fileName.endsWith('.pdf')
        ? fileName
        : `${fileName}.pdf`;
      const pdfBlob = await createPdfBlobFromElement(
        elementId,
        (cur, total) => setProgressLabel(`กำลังสร้าง PDF หน้า ${cur}/${total}...`)
      );

      if (!pdfBlob) {
        setMessage('ไม่สามารถสร้างไฟล์ PDF สำหรับอัปโหลดเข้า Google Drive ได้');
        setIsUploadingDrive(false);
        setProgressLabel(null);
        return;
      }

      setProgressLabel('กำลังอัปโหลดไฟล์ PDF เข้า Google Drive...');
      const res = await uploadToGoogleDrive(
        finalPdfName,
        pdfBlob,
        'application/pdf'
      );

      if (res) {
        setDriveResult({
          id: res.id,
          url: res.webViewLink,
          fileName: res.name,
        });
        confetti({ particleCount: 45, spread: 80, origin: { y: 0.7 } });
        setMessage(`บันทึกไฟล์ PDF (${res.name}) เข้า Google Drive สำเร็จ!`);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'ไม่สามารถบันทึกเข้า Google Drive ได้');
      if (isInIframe() || isIosOrIpad()) {
        setAuthPopupHint(true);
      }
    } finally {
      setIsUploadingDrive(false);
      setProgressLabel(null);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm mb-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800 text-sm">
              การดำเนินการเอกสาร:
            </span>
            {onPreviewToggle && (
              <button
                type="button"
                onClick={onPreviewToggle}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  isPreviewMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                {isPreviewMode ? 'ปิดมุมมองจำลอง' : 'แสดงตัวอย่างก่อนพิมพ์'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              title="พิมพ์เอกสารออกเครื่องพิมพ์ขนาด A4"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-1.5" />
              )}
              {isPrinting && progressLabel ? progressLabel : 'พิมพ์เอกสาร'}
            </button>

            {/* PNG button */}
            <button
              type="button"
              onClick={handleSavePng}
              disabled={isExportingPng}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {isExportingPng ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-1.5" />
              )}
              {isExportingPng && progressLabel ? progressLabel : 'บันทึก PNG'}
            </button>

            {/* PDF button */}
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isExportingPdf}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-1.5" />
              )}
              {isExportingPdf && progressLabel ? progressLabel : 'บันทึก PDF'}
            </button>

            {/* Google Drive Upload (Direct PDF) */}
            <button
              type="button"
              onClick={handleUploadDrive}
              disabled={isUploadingDrive}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              title="สร้างและอัปโหลดไฟล์ PDF เข้า Google Drive โดยตรง"
            >
              {isUploadingDrive ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 mr-1.5" />
              )}
              {isUploadingDrive && progressLabel
                ? progressLabel
                : 'บันทึกเข้า Google Drive'}
            </button>

            {/* Save to System if callback provided */}
            {onSaveToSystem && (
              <button
                type="button"
                onClick={onSaveToSystem}
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                บันทึกเข้าระบบ
              </button>
            )}
          </div>
        </div>

        {/* Notifications / iPad Actions / Drive Result Feedback */}
        {(message || readyPdfAsset || authPopupHint) && (
          <div className="mt-3 p-3 rounded-xl text-xs font-medium bg-slate-50 text-slate-800 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-1">
              {message && <div className="font-semibold">{message}</div>}
              {authPopupHint && (
                <div className="text-[11px] text-slate-600">
                  บน iPad / Safari หากหน้าต่างเข้าสู่ระบบ Google ถูกบล็อกในโหมดจำลอง สามารถกดปุ่มด้านขวาเพื่อเปิดในแท็บใหม่เต็มจอแล้วกดบันทึกเข้า Drive ได้เลยครับ
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {readyPdfAsset && (
                <>
                  <a
                    href={readyPdfAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    เปิดดู / พิมพ์ PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      handleSharePdfOnIpad(
                        readyPdfAsset.blob,
                        readyPdfAsset.name
                      ).then((shared) => {
                        if (!shared) {
                          triggerDownloadLink(
                            readyPdfAsset.url,
                            readyPdfAsset.name
                          );
                        }
                      });
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1" />
                    บันทึกลงแอป Files / แชร์ (iPad)
                  </button>
                </>
              )}

              {driveResult?.url && (
                <a
                  href={driveResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-2xs"
                >
                  เปิดไฟล์ PDF ใน Google Drive
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              )}

              {authPopupHint && (
                <a
                  href={
                    typeof window !== 'undefined' ? window.location.href : '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold shadow-2xs"
                >
                  เปิดแอปในแท็บเต็ม (Safari)
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* In-App A4 Print Preview & Print Controller Modal */}
      {printModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Top Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    หน้าต่างเตรียมพิมพ์เอกสาร A4 ({fileName})
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    คลิกปุ่มด้านขวาเพื่อเปิดสั่งพิมพ์ แชร์เข้าแอป Files หรือดาวน์โหลด PDF
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={printModalState.pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  เปิด PDF เต็มจอ / สั่งพิมพ์
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (printIframeRef.current?.contentWindow) {
                        printIframeRef.current.contentWindow.focus();
                        printIframeRef.current.contentWindow.print();
                      } else {
                        triggerPrint();
                      }
                    } catch {
                      triggerPrint();
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  สั่งพิมพ์ทันที
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdfFromPrintModal}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                  ดาวน์โหลด PDF
                </button>

                <button
                  type="button"
                  onClick={handleClosePrintModal}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-200 overflow-y-auto p-4 flex flex-col items-center gap-4">
              <div className="w-full h-[68vh] bg-slate-800 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                <iframe
                  ref={printIframeRef}
                  src={printModalState.pdfBlobUrl}
                  title={`Print Preview ${fileName}`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
