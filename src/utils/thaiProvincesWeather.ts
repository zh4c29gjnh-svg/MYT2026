/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SevenElevenDailyWeatherItem,
  SevenElevenWeatherCondition,
  SevenElevenWeatherForecast,
} from '../types/types.ts';

export interface ThaiProvinceCoord {
  name: string;
  lat: number;
  lon: number;
  keywords?: string[];
}

export const THAI_PROVINCES: ThaiProvinceCoord[] = [
  { name: 'กรุงเทพมหานคร', lat: 13.7563, lon: 100.5018, keywords: ['กทม', 'กรุงเทพ', 'สุขุมวิท', 'ลาดกระบัง', 'พหลโยธิน', 'ลาดพร้าว', 'บางนา', 'พระราม', 'จตุจักร'] },
  { name: 'กระบี่', lat: 8.0863, lon: 98.9063 },
  { name: 'กาญจนบุรี', lat: 14.0228, lon: 99.5328 },
  { name: 'กาฬสินธุ์', lat: 16.4314, lon: 103.5059 },
  { name: 'กำแพงเพชร', lat: 16.4828, lon: 99.5227 },
  { name: 'ขอนแก่น', lat: 16.4419, lon: 102.836 },
  { name: 'จันทบุรี', lat: 12.6114, lon: 102.1039 },
  { name: 'ฉะเชิงเทรา', lat: 13.6904, lon: 101.078, keywords: ['สนามชัยเขต', 'บางปะกง', 'พนมสารคาม', 'แปดริ้ว'] },
  { name: 'ชลบุรี', lat: 13.3611, lon: 100.9847, keywords: ['พัทยา', 'ศรีราชา', 'บ่อวิน', 'แหลมฉบัง', 'บางแสน', 'สัตหีบ', 'บ้านบึง', 'อมตะ'] },
  { name: 'ชัยนาท', lat: 15.1852, lon: 100.1251 },
  { name: 'ชัยภูมิ', lat: 15.8068, lon: 102.0315 },
  { name: 'ชุมพร', lat: 10.493, lon: 99.1800 },
  { name: 'เชียงราย', lat: 19.9105, lon: 99.8406 },
  { name: 'เชียงใหม่', lat: 18.7883, lon: 98.9853 },
  { name: 'ตรัง', lat: 7.5594, lon: 99.6114 },
  { name: 'ตราด', lat: 12.2428, lon: 102.5175 },
  { name: 'ตาก', lat: 16.884, lon: 99.1258 },
  { name: 'นครนายก', lat: 14.2069, lon: 101.2131 },
  { name: 'นครปฐม', lat: 13.8199, lon: 100.0622, keywords: ['ศาลายา', 'สามพราน', 'กำแพงแสน'] },
  { name: 'นครพนม', lat: 17.392, lon: 104.7695 },
  { name: 'นครราชสีมา', lat: 14.9799, lon: 102.0978, keywords: ['โคราช', 'ปากช่อง', 'เขาใหญ่'] },
  { name: 'นครศรีธรรมราช', lat: 8.4304, lon: 99.9631 },
  { name: 'นครสวรรค์', lat: 15.7047, lon: 100.1372 },
  { name: 'นนทบุรี', lat: 13.8621, lon: 100.5144, keywords: ['บางบัวทอง', 'ปากเกร็ด', 'แจ้งวัฒนะ', 'รัตนาธิเบศร์', 'บางใหญ่'] },
  { name: 'นราธิวาส', lat: 6.4255, lon: 101.8253 },
  { name: 'น่าน', lat: 18.7756, lon: 100.773 },
  { name: 'บึงกาฬ', lat: 18.3609, lon: 103.6464 },
  { name: 'บุรีรัมย์', lat: 14.993, lon: 103.1029 },
  { name: 'ปทุมธานี', lat: 14.0208, lon: 100.525, keywords: ['ลำลูกกา', 'ธัญบุรี', 'คลองหลวง', 'รังสิต', 'ไสวประชาราษฎร์'] },
  { name: 'ประจวบคีรีขันธ์', lat: 11.8124, lon: 99.7973, keywords: ['หัวหิน', 'ปราณบุรี'] },
  { name: 'ปราจีนบุรี', lat: 14.0509, lon: 101.3728, keywords: ['กบินทร์บุรี', 'ศรีมหาโพธิ'] },
  { name: 'ปัตตานี', lat: 6.8695, lon: 101.2505 },
  { name: 'พระนครศรีอยุธยา', lat: 14.3532, lon: 100.5684, keywords: ['อยุธยา', 'วังน้อย', 'บางปะอิน', 'โรจนะ'] },
  { name: 'พะเยา', lat: 19.1665, lon: 99.902 },
  { name: 'พังงา', lat: 8.4501, lon: 98.5255 },
  { name: 'พัทลุง', lat: 7.6167, lon: 100.074 },
  { name: 'พิจิตร', lat: 16.4429, lon: 100.3488 },
  { name: 'พิษณุโลก', lat: 16.8211, lon: 100.2659 },
  { name: 'เพชรบุรี', lat: 13.111, lon: 99.9391, keywords: ['ชะอำ'] },
  { name: 'เพชรบูรณ์', lat: 16.419, lon: 101.1561, keywords: ['เขาค้อ', 'หล่มสัก'] },
  { name: 'แพร่', lat: 18.1446, lon: 100.1403 },
  { name: 'ภูเก็ต', lat: 7.8804, lon: 98.3923 },
  { name: 'มหาสารคาม', lat: 16.1851, lon: 103.3026 },
  { name: 'มุกดาหาร', lat: 16.5424, lon: 104.7209 },
  { name: 'แม่ฮ่องสอน', lat: 19.302, lon: 97.9654 },
  { name: 'ยโสธร', lat: 15.7926, lon: 104.1453 },
  { name: 'ยะลา', lat: 6.5411, lon: 101.2804 },
  { name: 'ร้อยเอ็ด', lat: 16.0538, lon: 103.652 },
  { name: 'ระนอง', lat: 9.9529, lon: 98.6085 },
  { name: 'ระยอง', lat: 12.6814, lon: 101.2816, keywords: ['มาบยางพร', 'ปลวกแดง', 'นิคมพัฒนา', 'มาบตาพุด', 'บ้านฉาง', 'แกลง'] },
  { name: 'ราชบุรี', lat: 13.5283, lon: 99.8134, keywords: ['บ้านโป่ง', 'โพธาราม'] },
  { name: 'ลพบุรี', lat: 14.7995, lon: 100.6534 },
  { name: 'ลำปาง', lat: 18.2888, lon: 99.4909 },
  { name: 'ลำพูน', lat: 18.5745, lon: 99.0087 },
  { name: 'เลย', lat: 17.486, lon: 101.7223 },
  { name: 'ศรีสะเกษ', lat: 15.1186, lon: 104.322 },
  { name: 'สกลนคร', lat: 17.1546, lon: 104.1348 },
  { name: 'สงขลา', lat: 7.1898, lon: 100.5954, keywords: ['หาดใหญ่'] },
  { name: 'สตูล', lat: 6.6238, lon: 100.0674 },
  { name: 'สมุทรปราการ', lat: 13.5991, lon: 100.5998, keywords: ['บางพลี', 'สำโรง', 'พระประแดง', 'เทพารักษ์', 'ศรีนครินทร์', 'บางบ่อ'] },
  { name: 'สมุทรสงคราม', lat: 13.4098, lon: 100.0023, keywords: ['แม่กลอง', 'อัมพวา'] },
  { name: 'สมุทรสาคร', lat: 13.5475, lon: 100.2744, keywords: ['มหาชัย', 'กระทุ่มแบน', 'พระราม2'] },
  { name: 'สระแก้ว', lat: 13.824, lon: 102.0646, keywords: ['อรัญประเทศ'] },
  { name: 'สระบุรี', lat: 14.5289, lon: 100.9101, keywords: ['แก่งคอย', 'หนองแค', 'มวกเหล็ก'] },
  { name: 'สิงห์บุรี', lat: 14.8936, lon: 100.3967 },
  { name: 'สุโขทัย', lat: 17.0056, lon: 99.8264 },
  { name: 'สุพรรณบุรี', lat: 14.4745, lon: 100.1177 },
  { name: 'สุราษฎร์ธานี', lat: 9.1382, lon: 99.3217, keywords: ['สมุย', 'พะงัน'] },
  { name: 'สุรินทร์', lat: 14.8829, lon: 103.4937 },
  { name: 'หนองคาย', lat: 17.8783, lon: 102.742 },
  { name: 'หนองบัวลำภู', lat: 17.2218, lon: 102.426 },
  { name: 'อ่างทอง', lat: 14.5896, lon: 100.4551 },
  { name: 'อำนาจเจริญ', lat: 15.8657, lon: 104.6258 },
  { name: 'อุดรธานี', lat: 17.4138, lon: 102.7872 },
  { name: 'อุตรดิตถ์', lat: 17.6201, lon: 100.0993 },
  { name: 'อุทัยธานี', lat: 15.3835, lon: 100.0246 },
  { name: 'อุบลราชธานี', lat: 15.2287, lon: 104.8564 },
];

export const WEATHER_CONDITION_OPTIONS: {
  value: SevenElevenWeatherCondition;
  label: string;
  defaultRainProb: number;
  defaultTempMax: number;
  defaultTempMin: number;
}[] = [
  {
    value: 'sunny',
    label: 'แดดจัด / ท้องฟ้าแจ่มใส',
    defaultRainProb: 10,
    defaultTempMax: 34,
    defaultTempMin: 26,
  },
  {
    value: 'partly_cloudy',
    label: 'มีเมฆบางส่วน / อากาศโปร่ง',
    defaultRainProb: 20,
    defaultTempMax: 33,
    defaultTempMin: 25,
  },
  {
    value: 'cloudy',
    label: 'มีเมฆมาก / ครึ้มฟ้าครึ้มฝน',
    defaultRainProb: 40,
    defaultTempMax: 31,
    defaultTempMin: 25,
  },
  {
    value: 'light_rain',
    label: 'ฝนตกเล็กน้อย / ฝนปรอยๆ',
    defaultRainProb: 60,
    defaultTempMax: 30,
    defaultTempMin: 24,
  },
  {
    value: 'rain',
    label: 'ฝนตกปานกลาง (เตรียมผ้าใบกันฝน)',
    defaultRainProb: 75,
    defaultTempMax: 29,
    defaultTempMin: 24,
  },
  {
    value: 'thunderstorm',
    label: 'ฝนฟ้าคะนอง / ฝนตกหนัก',
    defaultRainProb: 90,
    defaultTempMax: 28,
    defaultTempMin: 23,
  },
];

const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export function isConditionRainy(
  condition: SevenElevenWeatherCondition,
  rainProbability: number
): boolean {
  if (
    condition === 'light_rain' ||
    condition === 'rain' ||
    condition === 'thunderstorm'
  ) {
    return true;
  }
  return rainProbability >= 40;
}

export function detectProvinceFromText(text: string): string {
  if (!text) return 'กรุงเทพมหานคร';
  const normalized = text.trim();

  // First check direct province name match
  for (const prov of THAI_PROVINCES) {
    if (normalized.includes(prov.name)) {
      return prov.name;
    }
  }

  // Next check district/keyword matches
  for (const prov of THAI_PROVINCES) {
    if (prov.keywords) {
      for (const kw of prov.keywords) {
        if (normalized.includes(kw)) {
          return prov.name;
        }
      }
    }
  }

  return 'กรุงเทพมหานคร';
}

/**
 * Parses Thai short date (e.g. "15/9/69", "15/09/2569") or ISO date ("2026-09-15") to "YYYY-MM-DD"
 */
export function parseThaiInspectionDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Check D/M/YY or DD/MM/YYYY
  const slashParts = trimmed.split(/[/-]/);
  if (slashParts.length === 3) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10);
    let y = parseInt(slashParts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      if (y < 100) {
        // 2-digit Buddhist year e.g. 69 -> 2569 -> 2026
        y = y + 2500 - 543;
      } else if (y > 2400) {
        // 4-digit Buddhist year e.g. 2569 -> 2026
        y = y - 543;
      }
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
  }

  return null;
}

function getCenterDateObject(inspectionDateStr: string): Date {
  const iso = parseThaiInspectionDateToISO(inspectionDateStr);
  if (iso) {
    const parts = iso.split('-').map(Number);
    const dt = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    if (!isNaN(dt.getTime())) {
      return dt;
    }
  }
  return new Date(2026, 8, 15, 12, 0, 0); // Default 15/9/69
}

function formatDateToISO(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDayMonth(dt: Date): string {
  const d = dt.getDate();
  const m = dt.getMonth() + 1;
  return `${d}/${m}`;
}

function mapWmoCodeToCondition(code: number): {
  condition: SevenElevenWeatherCondition;
  conditionLabel: string;
} {
  if (code === 0 || code === 1) {
    return { condition: 'sunny', conditionLabel: 'แดดจัด / ท้องฟ้าแจ่มใส' };
  }
  if (code === 2) {
    return { condition: 'partly_cloudy', conditionLabel: 'มีเมฆบางส่วน / อากาศโปร่ง' };
  }
  if (code === 3 || code === 45 || code === 48) {
    return { condition: 'cloudy', conditionLabel: 'มีเมฆมาก' };
  }
  if ((code >= 51 && code <= 57) || code === 61 || code === 80) {
    return { condition: 'light_rain', conditionLabel: 'ฝนตกเล็กน้อย / ฝนปรอยๆ' };
  }
  if (code === 63 || code === 65 || code === 81 || code === 82) {
    return { condition: 'rain', conditionLabel: 'ฝนตกปานกลาง (เตรียมผ้าใบกันฝน)' };
  }
  if (code >= 95) {
    return { condition: 'thunderstorm', conditionLabel: 'ฝนฟ้าคะนอง / ฝนตกหนัก' };
  }
  return { condition: 'partly_cloudy', conditionLabel: 'มีเมฆบางส่วน / อากาศโปร่ง' };
}

/**
 * Generates a realistic 7-day forecast array centered on `inspectionDateStr` (offsets -3 to +3)
 */
export function buildSevenDayForecastCentered(
  inspectionDateStr: string,
  centerCondition: SevenElevenWeatherCondition = 'partly_cloudy',
  centerRainProb = 20,
  centerTempMin = 25,
  centerTempMax = 33,
  provinceName = 'กรุงเทพมหานคร'
): SevenElevenDailyWeatherItem[] {
  const centerDate = getCenterDateObject(inspectionDateStr);
  const provSeed = provinceName
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const offsets = [-3, -2, -1, 0, 1, 2, 3];

  return offsets.map((offset) => {
    const dt = new Date(centerDate.getTime());
    dt.setDate(centerDate.getDate() + offset);
    const dayNameShort = THAI_DAY_SHORT[dt.getDay()];
    const dateLabel = formatShortDayMonth(dt);

    if (offset === 0) {
      const rainy = isConditionRainy(centerCondition, centerRainProb);
      return {
        dayOffset: 0,
        dateLabel,
        dayNameShort,
        isInspectionDay: true,
        isRainy: rainy,
        condition: centerCondition,
        rainProbability: centerRainProb,
        tempMin: centerTempMin,
        tempMax: centerTempMax,
      };
    }

    // Deterministic daily pattern around the inspection date
    const hash = (provSeed + dt.getDate() * 13 + (dt.getMonth() + 1) * 7 + (offset + 4) * 19) % 100;
    const rainDelta = ((hash % 7) - 3) * 10; // -30 to +30
    const rainProbability = Math.min(90, Math.max(10, Math.round((centerRainProb + rainDelta) / 5) * 5));
    const isRainy = rainProbability >= 40;
    const condition: SevenElevenWeatherCondition = isRainy
      ? rainProbability >= 70
        ? 'rain'
        : 'light_rain'
      : rainProbability <= 15
      ? 'sunny'
      : 'partly_cloudy';

    const minDelta = (hash % 3) - 1; // -1, 0, +1
    const maxDelta = ((hash >> 2) % 3) - 1 + (isRainy ? -1 : 0);
    const tempMin = Math.max(18, Math.min(30, centerTempMin + minDelta));
    const tempMax = Math.max(tempMin + 4, Math.min(40, centerTempMax + maxDelta));

    return {
      dayOffset: offset,
      dateLabel,
      dayNameShort,
      isInspectionDay: false,
      isRainy,
      condition,
      rainProbability,
      tempMin,
      tempMax,
    };
  });
}

/**
 * Ensures any SevenElevenWeatherForecast has a valid 7-day array centered on its forecastDate
 */
export function ensureSevenDayForecast(
  wf: SevenElevenWeatherForecast
): SevenElevenDailyWeatherItem[] {
  const centerDate = getCenterDateObject(wf.forecastDate);
  const offsets = [-3, -2, -1, 0, 1, 2, 3];

  if (wf.dailyForecasts && wf.dailyForecasts.length === 7) {
    // Keep user-edited values, but always keep dateLabel & dayNameShort synced with forecastDate
    return offsets.map((offset, idx) => {
      const existing = wf.dailyForecasts![idx];
      const dt = new Date(centerDate.getTime());
      dt.setDate(centerDate.getDate() + offset);
      return {
        ...existing,
        dayOffset: offset,
        dateLabel: formatShortDayMonth(dt),
        dayNameShort: THAI_DAY_SHORT[dt.getDay()],
        isInspectionDay: offset === 0,
      };
    });
  }

  return buildSevenDayForecastCentered(
    wf.forecastDate,
    wf.condition,
    wf.rainProbability,
    wf.tempMin,
    wf.tempMax,
    wf.province
  );
}

export async function fetchProvinceWeatherForecast(
  provinceName: string,
  inspectionDateStr: string
): Promise<Omit<SevenElevenWeatherForecast, 'enabled'>> {
  const prov =
    THAI_PROVINCES.find((p) => p.name === provinceName) || THAI_PROVINCES[0];
  const centerDate = getCenterDateObject(inspectionDateStr);
  const centerIso = formatDateToISO(centerDate);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${prov.lat}&longitude=${prov.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FBangkok&past_days=7&forecast_days=14`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API unavailable');
    const data = await res.json();

    const times: string[] = data?.daily?.time || [];
    let targetIdx = times.indexOf(centerIso);
    if (targetIdx < 0) {
      // Fallback to today's index (usually index 7 when past_days=7)
      targetIdx = Math.min(7, Math.max(0, times.length - 1));
    }

    const wmoCode = Number(data?.daily?.weathercode?.[targetIdx] ?? 2);
    const maxT = Math.round(Number(data?.daily?.temperature_2m_max?.[targetIdx] ?? 33));
    const minT = Math.round(Number(data?.daily?.temperature_2m_min?.[targetIdx] ?? 25));
    const rainProb = Math.round(
      Number(data?.daily?.precipitation_probability_max?.[targetIdx] ?? 20)
    );

    const mapped = mapWmoCodeToCondition(wmoCode);

    // Build 7-day forecast centered on targetIdx (or computed date)
    const fallbackSeven = buildSevenDayForecastCentered(
      inspectionDateStr,
      mapped.condition,
      rainProb,
      minT,
      maxT,
      prov.name
    );

    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    const dailyForecasts: SevenElevenDailyWeatherItem[] = offsets.map(
      (offset, i) => {
        const dt = new Date(centerDate.getTime());
        dt.setDate(centerDate.getDate() + offset);
        const dayIso = formatDateToISO(dt);
        const apiIdx = times.indexOf(dayIso);
        const slotIdx = apiIdx >= 0 ? apiIdx : targetIdx + offset;

        if (
          slotIdx >= 0 &&
          slotIdx < times.length &&
          data?.daily?.temperature_2m_max?.[slotIdx] !== undefined
        ) {
          const dCode = Number(data.daily.weathercode?.[slotIdx] ?? 2);
          const dMax = Math.round(Number(data.daily.temperature_2m_max[slotIdx]));
          const dMin = Math.round(Number(data.daily.temperature_2m_min[slotIdx]));
          const dRain = Math.round(
            Number(data.daily.precipitation_probability_max?.[slotIdx] ?? 20)
          );
          const dMapped = mapWmoCodeToCondition(dCode);
          const rainy = isConditionRainy(dMapped.condition, dRain);

          return {
            dayOffset: offset,
            dateLabel: formatShortDayMonth(dt),
            dayNameShort: THAI_DAY_SHORT[dt.getDay()],
            isInspectionDay: offset === 0,
            isRainy: rainy,
            condition: dMapped.condition,
            rainProbability: dRain,
            tempMin: dMin,
            tempMax: dMax,
          };
        }

        return fallbackSeven[i];
      }
    );

    const centerItem = dailyForecasts[3];

    return {
      province: prov.name,
      forecastDate: inspectionDateStr || 'ตามวันนัดหมาย',
      condition: centerItem.condition,
      conditionLabel: mapped.conditionLabel,
      tempMax: centerItem.tempMax,
      tempMin: centerItem.tempMin,
      rainProbability: centerItem.rainProbability,
      dailyForecasts,
    };
  } catch {
    const dailyForecasts = buildSevenDayForecastCentered(
      inspectionDateStr,
      'partly_cloudy',
      20,
      25,
      33,
      prov.name
    );
    return {
      province: prov.name,
      forecastDate: inspectionDateStr || 'ตามวันนัดหมาย',
      condition: 'partly_cloudy',
      conditionLabel: 'มีเมฆบางส่วน / อากาศโปร่ง',
      tempMax: 33,
      tempMin: 25,
      rainProbability: 20,
      dailyForecasts,
    };
  }
}

export function createDefaultWeatherForecast(
  branchName = '',
  area = '',
  inspectionDate = '15/9/69'
): SevenElevenWeatherForecast {
  const province = detectProvinceFromText(`${branchName} ${area}`);
  const dailyForecasts = buildSevenDayForecastCentered(
    inspectionDate || '15/9/69',
    'partly_cloudy',
    20,
    25,
    33,
    province
  );
  return {
    enabled: true,
    province,
    forecastDate: inspectionDate || '15/9/69',
    condition: 'partly_cloudy',
    conditionLabel: 'มีเมฆบางส่วน / อากาศโปร่ง',
    tempMax: 33,
    tempMin: 25,
    rainProbability: 20,
    dailyForecasts,
  };
}

