/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates an SVG Data URI representing a Thai National ID Card copy
 * with a realistic layout, security watermark, and certified copy endorsement.
 */
export function generateSampleIdCardDataUrl(name: string, idNumber: string, address: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0f7ff" />
      <stop offset="50%" stop-color="#e6f0fa" />
      <stop offset="100%" stop-color="#dbeafe" />
    </linearGradient>
    <pattern id="guilloche" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M0,15 Q15,0 30,15 T60,15" fill="none" stroke="#93c5fd" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>

  <!-- Card Body -->
  <rect x="5" y="5" width="590" height="370" rx="16" fill="url(#cardBg)" stroke="#94a3b8" stroke-width="2"/>
  <rect x="5" y="5" width="590" height="370" rx="16" fill="url(#guilloche)"/>

  <!-- Top Thai Flag Stripe -->
  <rect x="5" y="5" width="590" height="6" fill="#dc2626" rx="3"/>
  <rect x="5" y="11" width="590" height="4" fill="#ffffff"/>
  <rect x="5" y="15" width="590" height="6" fill="#1e3a8a"/>
  <rect x="5" y="21" width="590" height="4" fill="#ffffff"/>
  <rect x="5" y="25" width="590" height="6" fill="#dc2626"/>

  <!-- Emblem & Title Header -->
  <text x="30" y="55" font-family="'Sarabun', 'Prompt', sans-serif" font-size="13" font-weight="bold" fill="#0f172a">บัตรประจำตัวประชาชน</text>
  <text x="175" y="55" font-family="'Sarabun', 'Prompt', sans-serif" font-size="11" fill="#475569">Thai National ID Card</text>

  <!-- ID Card Number (Highlighted in box) -->
  <rect x="25" y="70" width="370" height="34" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="35" y="92" font-family="monospace, sans-serif" font-size="17" font-weight="bold" letter-spacing="2" fill="#0f172a">${idNumber}</text>

  <!-- Photo Box -->
  <rect x="425" y="65" width="145" height="185" rx="8" fill="#e2e8f0" stroke="#94a3b8"/>
  <circle cx="497" cy="130" r="38" fill="#cbd5e1"/>
  <path d="M447,235 C447,195 547,195 547,235 Z" fill="#94a3b8"/>
  <text x="497" y="215" font-family="'Sarabun', sans-serif" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="bold">รูปถ่าย</text>

  <!-- Chip Graphic -->
  <rect x="30" y="120" width="60" height="45" rx="5" fill="#fef08a" stroke="#ca8a04"/>
  <line x1="30" y1="142" x2="90" y2="142" stroke="#ca8a04" stroke-width="1.5"/>
  <line x1="60" y1="120" x2="60" y2="165" stroke="#ca8a04" stroke-width="1.5"/>

  <!-- Info Fields -->
  <text x="105" y="132" font-family="'Sarabun', sans-serif" font-size="11" fill="#64748b">ชื่อตัวและชื่อสกุล</text>
  <text x="105" y="152" font-family="'Sarabun', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${name}</text>
  <text x="105" y="172" font-family="'Sarabun', sans-serif" font-size="11" fill="#475569">Name - Surname</text>

  <text x="30" y="195" font-family="'Sarabun', sans-serif" font-size="11" fill="#64748b">ที่อยู่ตามทะเบียนบ้าน</text>
  <text x="30" y="215" font-family="'Sarabun', sans-serif" font-size="12" font-weight="500" fill="#1e293b">${address.slice(0, 48)}</text>
  <text x="30" y="235" font-family="'Sarabun', sans-serif" font-size="12" font-weight="500" fill="#1e293b">${address.slice(48, 100)}</text>

  <line x1="30" y1="255" x2="395" y2="255" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Signature & Official Endorsement Strip -->
  <rect x="25" y="265" width="550" height="95" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-dasharray="3 3"/>
  <text x="40" y="290" font-family="'Sarabun', sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">สำเนาถูกต้อง (Certified True Copy)</text>
  <text x="40" y="310" font-family="'Sarabun', sans-serif" font-size="11" fill="#64748b">ใช้สำหรับประกอบการเบิกจ่ายงานก่อสร้าง MYT เท่านั้น</text>
  
  <!-- Contractor handwritten signature effect -->
  <path d="M 360 320 Q 390 290 420 320 T 460 300 T 500 325" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>
  <text x="430" y="345" font-family="'Sarabun', sans-serif" font-size="11" fill="#334155" text-anchor="middle">( ${name} )</text>

  <!-- Cross-diagonal watermark line for safety -->
  <line x1="50" y1="360" x2="550" y2="25" stroke="#2563eb" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="6 4"/>
  <line x1="65" y1="375" x2="565" y2="40" stroke="#2563eb" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="6 4"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
