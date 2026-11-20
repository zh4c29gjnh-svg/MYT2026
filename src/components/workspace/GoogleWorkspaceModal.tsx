/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  FileSpreadsheet,
  MessageSquare,
  Video,
  ExternalLink,
  CheckCircle2,
  LogOut,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import {
  googleSignIn,
  logout,
  getAccessToken,
  initAuth,
  isInIframe,
} from '../../services/googleAuth.ts';
import {
  uploadToGoogleDrive,
  exportToGoogleSheets,
  createGoogleMeetMeeting,
  listDriveFiles,
} from '../../services/googleWorkspace.ts';
import { User } from 'firebase/auth';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  allData: any;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  allData,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>>([]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        loadDriveFiles();
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadDriveFiles = async () => {
    try {
      const files = await listDriveFiles();
      setDriveFiles(files);
    } catch (err) {
      console.warn('Could not list drive files', err);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setStatusMessage(`ยินดีต้อนรับคุณ ${res.user.displayName || res.user.email}`);
        await loadDriveFiles();
      }
    } catch (err: any) {
      setStatusMessage(`ไม่สามารถเข้าสู่ระบบได้: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setDriveFiles([]);
    setStatusMessage('ออกจากระบบเรียบร้อย');
  };

  const handleCreateMeet = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await createGoogleMeetMeeting();
      if (res?.meetingUri) {
        setMeetLink(res.meetingUri);
        setStatusMessage('สร้างห้องประชุม Google Meet สำหรับประสานงานหน้างานสำเร็จ!');
      }
    } catch (err: any) {
      setStatusMessage(`ไม่สามารถสร้าง Meet: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">✨</span>
            <h3 className="font-semibold text-lg">Google Workspace Integration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Iframe tip if in iframe */}
          {isInIframe() && !user && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <span className="font-semibold block">เปิดใช้งานในแท็บใหม่เพื่อเข้าสู่ระบบ Google ราบรื่น 100%:</span>
                  <span className="text-blue-700">
                    หน้าต่างจำลองของ AI Studio อาจถูกเบราว์เซอร์บล็อกการส่งข้อมูลล็อกอิน แนะนำให้กดเปิดแอปในแท็บใหม่
                  </span>
                </div>
              </div>
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 flex items-center justify-center space-x-1 shadow-xs"
              >
                <span>เปิดแอปในแท็บใหม่</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            </div>
          )}

          {/* Auth State Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {user.displayName?.[0] || user.email?.[0] || 'U'}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-slate-900 text-sm">
                      {user.displayName || user.email}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-xs text-slate-500">
                    เชื่อมต่อ Google Workspace เรียบร้อยแล้ว
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">
                  เข้าสู่ระบบด้วยบัญชี Google
                </h4>
                <p className="text-xs text-slate-500">
                  เพื่อเปิดใช้งาน Google Drive, Google Sheets, Google Meet และ Google Chat
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  ออกจากระบบ
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="gsi-material-button inline-flex items-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" />
                  ) : (
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                    </svg>
                  )}
                  Sign in with Google
                </button>
              )}
            </div>
          </div>

          {statusMessage && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs space-y-2">
              <div className="font-semibold text-amber-900 flex items-center space-x-1.5">
                <span className="text-base">⚠️</span>
                <span>{statusMessage}</span>
              </div>
              <div className="text-slate-600 space-y-1 pl-5 list-disc">
                <p>• เมื่อหน้าต่าง Pop-up เปิดขึ้นมา กรุณาอย่าเพิ่งปิดหน้าต่างจนกว่าจะเลือกบัญชี Google เสร็จสิ้น</p>
                <p>• หากเบราว์เซอร์บล็อกหน้าต่าง Pop-up ให้คลิกที่ไอคอนกากบาทแดงตรงช่องพิมพ์ที่อยู่ URL ด้านบน เพื่อเลือก <b>"อนุญาตป๊อปอัปเสมอ (Always allow pop-ups)"</b></p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
                >
                  {isLoading ? 'กำลังเปิดหน้าต่าง...' : 'ลองเข้าสู่ระบบ Google ใหม่อีกครั้ง'}
                </button>
              </div>
            </div>
          )}

          {/* 4 Integrations Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Google Drive Card */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-2 hover:border-amber-400 transition-colors">
              <div className="flex items-center space-x-2">
                <Cloud className="w-5 h-5 text-amber-500" />
                <h5 className="font-bold text-slate-800 text-sm">Google Drive</h5>
              </div>
              <p className="text-xs text-slate-500">
                สำรองข้อมูลใบเสร็จรับเงิน, หนังสือส่งมอบงาน และคลังข้อมูล ผรม. ขึ้น Google Drive
              </p>
              <div className="text-[11px] text-amber-700 font-medium">
                {driveFiles.length > 0 ? `พบ ${driveFiles.length} ไฟล์ในระบบ` : 'พร้อมสำรองข้อมูล'}
              </div>
            </div>

            {/* Google Sheets Card */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-2 hover:border-emerald-400 transition-colors">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h5 className="font-bold text-slate-800 text-sm">Google Sheets</h5>
              </div>
              <p className="text-xs text-slate-500">
                ส่งออกตารางสรุปใบเสร็จ แผนงานโครงการ และรายงานประจำวันเป็น Spreadsheet
              </p>
              <div className="text-[11px] text-emerald-700 font-medium">
                ใช้งานได้โดยตรงจากหน้าคลังและตารางแผนงาน
              </div>
            </div>

            {/* Google Meet Card */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-2 hover:border-blue-400 transition-colors">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-blue-600" />
                <h5 className="font-bold text-slate-800 text-sm">Google Meet</h5>
              </div>
              <p className="text-xs text-slate-500">
                สร้างห้องประชุมประสานงานหน้างานและตรวจรับงานกับผู้รับเหมาและวิศวกร
              </p>
              <button
                onClick={handleCreateMeet}
                disabled={isLoading}
                className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                สร้างห้องประชุมด่วน
              </button>
              {meetLink && (
                <div className="pt-1">
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline font-bold inline-flex items-center"
                  >
                    เข้าร่วมห้องประชุม Meet
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
            </div>

            {/* Google Chat Card */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-2 hover:border-teal-400 transition-colors">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                <h5 className="font-bold text-slate-800 text-sm">Google Chat</h5>
              </div>
              <p className="text-xs text-slate-500">
                ส่งการแจ้งเตือนรายงานประจำวันและความคืบหน้างวดงานเข้ากลุ่มพูดคุยของทีม
              </p>
              <div className="text-[11px] text-teal-700 font-medium">
                ส่งข้อมูลสรุป Daily Report ได้ทันที
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
