/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clearAccessToken, getAccessToken } from './googleAuth.ts';

export interface DriveUploadedFile {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Uploads a PDF, image, or JSON backup file to Google Drive using Drive API v3 multipart/related upload
 */
export async function uploadToGoogleDrive(
  fileName: string,
  content: string | Blob,
  mimeType: string = 'application/pdf'
): Promise<DriveUploadedFile | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อใช้งาน Google Drive');
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: 'เอกสารระบบจัดการงานก่อสร้าง MYT Construction',
  };

  const boundary = '-------myt314159265358979323846';
  const startPart =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const endPart = `\r\n--${boundary}--`;

  const body = new Blob([startPart, content, endPart], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (response.status === 401) {
    clearAccessToken();
    throw new Error(
      'เซสชันการเข้าสู่ระบบ Google หมดอายุแล้ว กรุณากดปุ่มบันทึกเข้า Google Drive เพื่อเข้าสู่ระบบใหม่อีกครั้ง'
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive upload failed:', errorText);
    throw new Error(
      `บันทึก Google Drive ไม่สำเร็จ (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink:
      data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    webContentLink: data.webContentLink,
  };
}

/**
 * List files created in Google Drive by this app
 */
export async function listDriveFiles(): Promise<
  Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>
> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const query = encodeURIComponent('trashed = false');
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to list drive files:', err);
    return [];
  }
}

/**
 * Export project task list or daily report to Google Sheets
 */
export async function exportToGoogleSheets(
  title: string,
  headerRow: string[],
  dataRows: (string | number)[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อใช้งาน Google Sheets');
  }

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'ข้อมูล MYT',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (createRes.status === 401) {
    clearAccessToken();
    throw new Error('เซสชัน Google หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`สร้าง Google Sheets ไม่สำเร็จ: ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl;

  // 2. Append values
  const values = [headerRow, ...dataRows];
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  if (!appendRes.ok) {
    console.warn('Failed to append values to sheet, but sheet was created');
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Create a Google Meet space for site team coordination
 */
export async function createGoogleMeetMeeting(): Promise<{
  meetingUri: string;
} | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error(
      'กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อสร้างห้อง Google Meet'
    );
  }

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType: 'OPEN',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`สร้างห้องประชุม Meet ไม่สำเร็จ: ${errText}`);
  }

  const data = await res.json();
  return { meetingUri: data.meetingUri };
}
