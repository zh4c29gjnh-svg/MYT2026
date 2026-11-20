/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/meetings.space.created',
];

// Core Drive + Sheets scopes (compatible with all @gmail.com and Workspace accounts)
export const DRIVE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;
let customUser: any = null;

// Auth state listeners
type AuthSuccessCallback = (user: any, token: string) => void;
type AuthFailureCallback = () => void;
const listeners: {
  success?: AuthSuccessCallback;
  failure?: AuthFailureCallback;
}[] = [];

export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/**
 * Synchronous check for a non-expired in-memory OAuth access token.
 * Useful in click handlers before calling signInWithPopup / GIS so Safari iOS/iPadOS keeps user-gesture activation.
 */
export const getCachedAccessTokenSync = (): string | null => {
  if (!cachedAccessToken) return null;
  if (tokenExpiresAt > 0 && Date.now() > tokenExpiresAt) {
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    return null;
  }
  return cachedAccessToken;
};

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
};

export const initAuth = (
  onAuthSuccess?: AuthSuccessCallback,
  onAuthFailure?: AuthFailureCallback
) => {
  if (onAuthSuccess || onAuthFailure) {
    listeners.push({ success: onAuthSuccess, failure: onAuthFailure });
  }

  const validToken = getCachedAccessTokenSync();
  if (validToken && customUser) {
    if (onAuthSuccess) onAuthSuccess(customUser, validToken);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    const token = getCachedAccessTokenSync();
    if (user) {
      if (token) {
        listeners.forEach((l) => l.success?.(user, token));
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        tokenExpiresAt = 0;
        customUser = null;
        listeners.forEach((l) => l.failure?.());
      }
    } else if (!customUser) {
      cachedAccessToken = null;
      tokenExpiresAt = 0;
      listeners.forEach((l) => l.failure?.());
    }
  });
};

/**
 * Request Access Token via Google Identity Services (GIS) Token Client
 * Calls requestAccessToken() synchronously when GIS is ready so iPad Safari allows the popup.
 */
const signInWithGis = (
  scopeList: string[] = SCOPES
): Promise<{ user: any; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const checkGsi = () => {
      const google = (window as any).google;
      return !!google?.accounts?.oauth2;
    };

    const proceed = () => {
      const google = (window as any).google;
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: scopeList.join(' '),
          prompt: 'select_account',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              if (
                tokenResponse.error === 'popup_closed' ||
                tokenResponse.error === 'popup_closed_by_user'
              ) {
                reject(
                  new Error(
                    'หน้าต่างลงชื่อเข้าใช้ Google ถูกปิดหรือถูกบล็อกป๊อปอัป (บน iPad แนะนำให้เปิดแอปในแท็บใหม่เต็มจอ หรืออนุญาต Pop-ups)'
                  )
                );
              } else if (tokenResponse.error === 'popup_failed_to_open') {
                reject(
                  new Error(
                    'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป Google กรุณาอนุญาต Pop-ups ในการตั้งค่า Safari หรือเปิดในแท็บใหม่'
                  )
                );
              } else {
                reject(
                  new Error(`ข้อผิดพลาดการเชื่อมต่อ: ${tokenResponse.error}`)
                );
              }
              return;
            }

            if (!tokenResponse.access_token) {
              reject(new Error('ไม่พบ Access Token จาก Google'));
              return;
            }

            cachedAccessToken = tokenResponse.access_token;
            const expiresInSec = Number(tokenResponse.expires_in) || 3500;
            tokenExpiresAt =
              Date.now() + Math.max(300, expiresInSec - 90) * 1000;

            try {
              const res = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                  headers: { Authorization: `Bearer ${cachedAccessToken}` },
                }
              );
              if (res.ok) {
                const info = await res.json();
                customUser = {
                  displayName: info.name || info.email,
                  email: info.email,
                  photoURL: info.picture,
                  uid: info.sub,
                };
              } else {
                customUser = {
                  displayName: 'ผู้ใช้งาน Google Workspace',
                  email: 'google-user@workspace',
                  uid: 'gsi-user',
                };
              }
            } catch {
              customUser = {
                displayName: 'ผู้ใช้งาน Google Workspace',
                email: 'google-user@workspace',
                uid: 'gsi-user',
              };
            }

            listeners.forEach((l) =>
              l.success?.(customUser, tokenResponse.access_token)
            );
            resolve({
              user: customUser,
              accessToken: tokenResponse.access_token,
            });
          },
        });

        // Must be called immediately while user activation gesture is still alive
        tokenClient.requestAccessToken();
      } catch (err: any) {
        reject(err);
      }
    };

    if (checkGsi()) {
      proceed();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (checkGsi()) {
          clearInterval(interval);
          proceed();
        } else if (attempts > 12) {
          clearInterval(interval);
          reject(new Error('Google Identity Services ยังโหลดไม่พร้อม'));
        }
      }, 150);
    }
  });
};

/**
 * Universal Google Sign In
 * Tries Google Identity Services first, falls back to Firebase signInWithPopup
 */
export const googleSignIn = async (
  scopeList: string[] = SCOPES
): Promise<{
  user: any;
  accessToken: string;
} | null> => {
  if (isSigningIn) return null;
  isSigningIn = true;

  try {
    // 1. Try Google Identity Services
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const res = await signInWithGis(scopeList);
        return res;
      } catch (gisErr: any) {
        console.warn('GIS sign in attempted, checking fallback:', gisErr);
        const msg = gisErr?.message || '';
        // If full Workspace scopes failed because of Chat/Meet scope restriction, retry with core Drive+Sheets scopes
        if (
          scopeList.length > DRIVE_SHEETS_SCOPES.length &&
          (msg.includes('invalid_scope') || msg.includes('access_denied'))
        ) {
          return await signInWithGis(DRIVE_SHEETS_SCOPES);
        }
        if (
          msg.includes('หน้าต่างลงชื่อเข้าใช้') ||
          msg.includes('บล็อกหน้าต่างป๊อปอัป')
        ) {
          throw gisErr;
        }
      }
    }

    // 2. Fallback to Firebase signInWithPopup
    const fbProvider = new GoogleAuthProvider();
    scopeList.forEach((s) => fbProvider.addScope(s));
    fbProvider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, fbProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่พบ Access Token จากการเข้าสู่ระบบ Google');
    }

    cachedAccessToken = credential.accessToken;
    tokenExpiresAt = Date.now() + 3400 * 1000;
    customUser = result.user;
    listeners.forEach((l) => l.success?.(customUser, cachedAccessToken!));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    let friendlyMessage = error.message;

    if (
      error.code === 'auth/popup-closed-by-user' ||
      error.message?.includes('popup_closed')
    ) {
      friendlyMessage =
        'หน้าต่างลงชื่อเข้าใช้ Google ถูกปิดหรือถูกบล็อกป๊อปอัป (บน iPad กรุณากดอนุญาต Pop-ups หรือเปิดแอปในแท็บ Safari เต็มจอ)';
    } else if (error.code === 'auth/popup-blocked') {
      friendlyMessage =
        'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาต Pop-ups สำหรับเว็บไซต์นี้แล้วลองใหม่อีกครั้ง';
    } else if (error.code === 'auth/cancelled-popup-request') {
      friendlyMessage = 'คำขอก่อนหน้าถูกยกเลิก กรุณากดลองใหม่อีกครั้ง';
    } else if (error.code === 'auth/network-request-failed') {
      friendlyMessage =
        'การเชื่อมต่อเครือข่ายขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ต';
    }

    const err = new Error(friendlyMessage);
    (err as any).code = error.code;
    throw err;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Focused sign-in helper for Google Drive & Sheets upload (compatible with standard Gmail accounts too)
 */
export const googleSignInForDrive = () => googleSignIn(DRIVE_SHEETS_SCOPES);

export const getAccessToken = async (): Promise<string | null> => {
  return getCachedAccessTokenSync();
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  tokenExpiresAt = 0;
  customUser = null;
  listeners.forEach((l) => l.failure?.());
};
