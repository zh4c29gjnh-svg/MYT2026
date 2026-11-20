/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts a numeric amount to Thai Baht text representation
 * e.g. 45000.00 -> "สี่หมื่นห้าพันบาทถ้วน"
 * e.g. 51546.39 -> "ห้าหมื่นหนึ่งพันห้าร้อยสี่สิบหกบาทสามสิบเก้าสตางค์"
 * e.g. 0.00 -> "ศูนย์บาทถ้วน"
 */
export function formatBahtText(numberInput: number | string): string {
  if (numberInput === undefined || numberInput === null || numberInput === '') {
    return 'ศูนย์บาทถ้วน';
  }

  const num = typeof numberInput === 'string' ? parseFloat(numberInput.replace(/,/g, '')) : numberInput;

  if (isNaN(num)) {
    return 'ศูนย์บาทถ้วน';
  }

  if (num === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const rounded = absNum.toFixed(2);
  const [bahtStr, satangStr] = rounded.split('.');

  const thaiNums = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function convertGroup(digits: string): string {
    let result = '';
    const len = digits.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(digits[i], 10);
      const position = len - i - 1;

      if (digit !== 0) {
        if (position === 1 && digit === 1) {
          result += 'สิบ';
        } else if (position === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (position === 0 && digit === 1 && len > 1 && digits[len - 2] !== '0') {
          result += 'เอ็ด';
        } else {
          result += thaiNums[digit] + thaiUnits[position];
        }
      }
    }

    return result;
  }

  function convertInteger(intStr: string): string {
    if (parseInt(intStr, 10) === 0) {
      return '';
    }

    // Split into millions chunks (groups of 6 digits from right to left)
    const chunks: string[] = [];
    let remaining = intStr;
    while (remaining.length > 0) {
      const start = Math.max(0, remaining.length - 6);
      chunks.unshift(remaining.substring(start));
      remaining = remaining.substring(0, start);
    }

    let result = '';
    for (let i = 0; i < chunks.length; i++) {
      const groupText = convertGroup(chunks[i]);
      if (groupText) {
        result += groupText;
        if (i < chunks.length - 1) {
          result += 'ล้าน';
        }
      }
    }

    return result;
  }

  let bahtText = convertInteger(bahtStr);
  let satangText = '';

  const satangVal = parseInt(satangStr || '0', 10);
  if (satangVal > 0) {
    satangText = convertGroup(satangStr) + 'สตางค์';
  }

  let finalResult = '';
  if (bahtText) {
    finalResult += bahtText + 'บาท';
  }

  if (satangVal === 0) {
    finalResult += 'ถ้วน';
  } else {
    finalResult += satangText;
  }

  return (isNegative ? 'ลบ' : '') + finalResult;
}

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '0.00';
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val)) return '0.00';
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date to Thai Buddhist Era (พ.ศ.)
 * e.g. "2026-11-10" -> { day: "10", month: "พฤศจิกายน", year: "2569", fullText: "10 พฤศจิกายน 2569" }
 */
export function formatThaiDate(dateStr: string | Date): {
  day: string;
  month: string;
  year: string;
  fullText: string;
} {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) {
    return { day: '1', month: 'มกราคม', year: '2569', fullText: '1 มกราคม 2569' };
  }

  const thaiMonths = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  const day = d.getDate().toString();
  const month = thaiMonths[d.getMonth()];
  const year = (d.getFullYear() + 543).toString();

  return {
    day,
    month,
    year,
    fullText: `${day} ${month} ${year}`,
  };
}
