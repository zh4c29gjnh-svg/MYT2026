/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LandSurveyPin } from '../types/types.ts';

const WGS84_A = 6378137.0; // Semi-major axis (meters)
const WGS84_E2 = 0.00669437999014; // First eccentricity squared
const UTM_K0 = 0.9996;
const EARTH_RADIUS_M = 6371008.8;

/**
 * Haversine geodesic distance in meters between two WGS84 coordinates
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_M * c;
}

/**
 * Forward azimuth / compass bearing in degrees (0° = North, 90° = East)
 */
export function calculateBearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

export function getCompassDirectionLabel(deg: number): string {
  const dirs = [
    'เหนือ (N)',
    'ตะวันออกเฉียงเหนือ (NE)',
    'ตะวันออก (E)',
    'ตะวันออกเฉียงใต้ (SE)',
    'ใต้ (S)',
    'ตะวันตกเฉียงใต้ (SW)',
    'ตะวันตก (W)',
    'ตะวันตกเฉียงเหนือ (NW)',
  ];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}

/**
 * Converts WGS84 (lat, lng) to UTM Zone (47P / 48P in Thailand), Easting (E), Northing (N)
 */
export function latLngToUtm(
  lat: number,
  lng: number
): { zone: string; zoneNum: number; easting: number; northing: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const zoneNum = Math.floor((lng + 180) / 6) + 1;
  const latRad = toRad(lat);
  const lngOrigin = (zoneNum - 1) * 6 - 180 + 3; // Central meridian
  const lngOriginRad = toRad(lngOrigin);

  const eccPrimeSquared = WGS84_E2 / (1 - WGS84_E2);
  const N =
    WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = eccPrimeSquared * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (toRad(lng) - lngOriginRad);

  const M =
    WGS84_A *
    ((1 -
      WGS84_E2 / 4 -
      (3 * WGS84_E2 * WGS84_E2) / 64 -
      (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256) *
      latRad -
      ((3 * WGS84_E2) / 8 +
        (3 * WGS84_E2 * WGS84_E2) / 32 +
        (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * WGS84_E2 * WGS84_E2) / 256 +
        (45 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 3072) * Math.sin(6 * latRad));

  const easting =
    UTM_K0 *
      N *
      (A +
        ((1 - T + C) * A * A * A) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) *
          A *
          A *
          A *
          A *
          A) /
          120) +
    500000.0;

  let northing =
    UTM_K0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) *
            A *
            A *
            A *
            A *
            A *
            A) /
            720));

  if (lat < 0) {
    northing += 10000000.0;
  }

  const bandLetter = lat >= 16 ? 'Q' : lat >= 8 ? 'P' : 'N';
  return {
    zone: `${zoneNum}${bandLetter}`,
    zoneNum,
    easting: parseFloat(easting.toFixed(2)),
    northing: parseFloat(northing.toFixed(2)),
  };
}

/**
 * Converts UTM Easting/Northing (WGS84 Zone 47N or 48N) back to Lat/Lng
 */
export function utmToLatLng(
  easting: number,
  northing: number,
  zoneNum = 47
): { lat: number; lng: number } {
  const e1 =
    (1 - Math.sqrt(1 - WGS84_E2)) / (1 + Math.sqrt(1 - WGS84_E2));
  const x = easting - 500000.0;
  const y = northing;

  const M = y / UTM_K0;
  const mu =
    M /
    (WGS84_A *
      (1 -
        WGS84_E2 / 4 -
        (3 * WGS84_E2 * WGS84_E2) / 64 -
        (5 * WGS84_E2 * WGS84_E2 * WGS84_E2) / 256));

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) *
      Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

  const eccPrimeSquared = WGS84_E2 / (1 - WGS84_E2);
  const N1 =
    WGS84_A /
    Math.sqrt(1 - WGS84_E2 * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 =
    (WGS84_A * (1 - WGS84_E2)) /
    Math.pow(1 - WGS84_E2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * UTM_K0);

  const latRad =
    phi1Rad -
    ((N1 * Math.tan(phi1Rad)) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) *
          D *
          D *
          D *
          D) /
          24 +
        ((61 +
          90 * T1 +
          298 * C1 +
          45 * T1 * T1 -
          252 * eccPrimeSquared -
          3 * C1 * C1) *
          D *
          D *
          D *
          D *
          D *
          D) /
          720);

  const lngOrigin = (zoneNum - 1) * 6 - 180 + 3;
  const lngRad =
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 -
        2 * C1 +
        28 * T1 -
        3 * C1 * C1 +
        8 * eccPrimeSquared +
        24 * T1 * T1) *
        D *
        D *
        D *
        D *
        D) /
        120) /
    Math.cos(phi1Rad);

  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  return {
    lat: parseFloat(toDeg(latRad).toFixed(6)),
    lng: parseFloat((lngOrigin + toDeg(lngRad)).toFixed(6)),
  };
}

export interface SurveyEdgeSegment {
  fromPin: LandSurveyPin;
  toPin: LandSurveyPin;
  measuredMeters: number;
  deedMeters?: number;
  diffMeters?: number; // measured - deed
  bearingDegrees: number;
  compassLabel: string;
}

export function computeSurveyEdges(
  pins: LandSurveyPin[],
  isClosedPolygon: boolean
): SurveyEdgeSegment[] {
  if (pins.length < 2) return [];
  const edges: SurveyEdgeSegment[] = [];
  const limit = isClosedPolygon && pins.length >= 3 ? pins.length : pins.length - 1;

  for (let i = 0; i < limit; i++) {
    const fromPin = pins[i];
    const toPin = pins[(i + 1) % pins.length];
    const measured = parseFloat(
      haversineDistanceMeters(
        fromPin.lat,
        fromPin.lng,
        toPin.lat,
        toPin.lng
      ).toFixed(2)
    );
    const deed =
      fromPin.deedDistanceToNextMeters !== undefined &&
      fromPin.deedDistanceToNextMeters > 0
        ? fromPin.deedDistanceToNextMeters
        : undefined;
    const diff =
      deed !== undefined ? parseFloat((measured - deed).toFixed(2)) : undefined;
    const bearing = parseFloat(
      calculateBearingDegrees(
        fromPin.lat,
        fromPin.lng,
        toPin.lat,
        toPin.lng
      ).toFixed(1)
    );

    edges.push({
      fromPin,
      toPin,
      measuredMeters: measured,
      deedMeters: deed,
      diffMeters: diff,
      bearingDegrees: bearing,
      compassLabel: getCompassDirectionLabel(bearing),
    });
  }

  return edges;
}

/**
 * Projects pins onto a local metric tangent plane (in meters relative to pin[0])
 * and computes polygon area in square meters using the Shoelace formula.
 */
export function computePolygonAreaSqMeters(pins: LandSurveyPin[]): number {
  if (pins.length < 3) return 0;
  const origin = pins[0];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cosLat = Math.cos(toRad(origin.lat));

  const xy = pins.map((p) => ({
    x: toRad(p.lng - origin.lng) * EARTH_RADIUS_M * cosLat,
    y: toRad(p.lat - origin.lat) * EARTH_RADIUS_M,
  }));

  let sum = 0;
  for (let i = 0; i < xy.length; i++) {
    const cur = xy[i];
    const next = xy[(i + 1) % xy.length];
    sum += cur.x * next.y - next.x * cur.y;
  }

  return parseFloat((Math.abs(sum) / 2).toFixed(2));
}

export interface ThaiLandAreaBreakdown {
  sqMeters: number;
  totalSqWah: number;
  rai: number;
  ngan: number;
  sqWah: number;
  formattedThai: string;
}

/**
 * Converts square meters to Thai land area units:
 * 1 ตารางวา = 4 ตารางเมตร
 * 1 งาน = 100 ตารางวา (400 ตร.ม.)
 * 1 ไร่ = 4 งาน = 400 ตารางวา (1,600 ตร.ม.)
 */
export function sqMetersToThaiArea(sqMeters: number): ThaiLandAreaBreakdown {
  const safeSqm = Math.max(0, sqMeters);
  const totalSqWah = safeSqm / 4;
  const rai = Math.floor(totalSqWah / 400);
  const remAfterRai = totalSqWah - rai * 400;
  const ngan = Math.floor(remAfterRai / 100);
  const sqWah = parseFloat((remAfterRai - ngan * 100).toFixed(1));

  return {
    sqMeters: parseFloat(safeSqm.toFixed(2)),
    totalSqWah: parseFloat(totalSqWah.toFixed(2)),
    rai,
    ngan,
    sqWah,
    formattedThai: `${rai} ไร่ ${ngan} งาน ${sqWah} ตร.ว.`,
  };
}

export function thaiAreaToSqMeters(
  rai = 0,
  ngan = 0,
  sqWah = 0
): number {
  const totalWah = (Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(sqWah) || 0);
  return parseFloat((totalWah * 4).toFixed(2));
}

/**
 * Checks if a GPS point (lat, lng) is inside the polygon defined by pins,
 * and computes the shortest distance in meters to the polygon boundary (or nearest pin if <3 pins).
 */
export function evaluatePointAgainstBoundary(
  lat: number,
  lng: number,
  pins: LandSurveyPin[]
): { isInside: boolean; distanceMeters: number } {
  if (pins.length === 0) {
    return { isInside: false, distanceMeters: 0 };
  }
  if (pins.length === 1) {
    const d = haversineDistanceMeters(lat, lng, pins[0].lat, pins[0].lng);
    return { isInside: d <= 15, distanceMeters: parseFloat(d.toFixed(1)) };
  }

  const origin = pins[0];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cosLat = Math.cos(toRad(origin.lat));
  const toXY = (la: number, ln: number) => ({
    x: toRad(ln - origin.lng) * EARTH_RADIUS_M * cosLat,
    y: toRad(la - origin.lat) * EARTH_RADIUS_M,
  });

  const pt = toXY(lat, lng);
  const poly = pins.map((p) => toXY(p.lat, p.lng));

  // Ray-casting point-in-polygon if >= 3 pins
  let inside = false;
  if (poly.length >= 3) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x,
        yi = poly[i].y;
      const xj = poly[j].x,
        yj = poly[j].y;
      const intersect =
        yi > pt.y !== yj > pt.y &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
  }

  // Minimum distance to any polygon segment
  let minDist = Infinity;
  const segCount = poly.length >= 3 ? poly.length : poly.length - 1;
  for (let i = 0; i < segCount; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
    }
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const d = Math.hypot(pt.x - projX, pt.y - projY);
    if (d < minDist) minDist = d;
  }

  // Consider inside if raycast inside OR within 4m GPS tolerance of boundary edge
  const effectiveInside = inside || minDist <= 4.0;
  return {
    isInside: effectiveInside,
    distanceMeters: inside ? 0 : parseFloat(minDist.toFixed(1)),
  };
}

/**
 * Offsets a WGS84 (lat, lng) coordinate by distanceMeters along bearingDegrees (0° = North, 90° = East).
 * Used to enforce the 2.00m minimum pin spacing when GPS jitter produces < 2.00m distance.
 */
export function offsetLatLngByMeters(
  lat: number,
  lng: number,
  distanceMeters: number,
  bearingDegrees: number
): { lat: number; lng: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const brng = toRad(bearingDegrees);
  const dNorth = distanceMeters * Math.cos(brng);
  const dEast = distanceMeters * Math.sin(brng);

  const dLat = toDeg(dNorth / EARTH_RADIUS_M);
  const cosLat = Math.max(0.01, Math.cos(toRad(lat)));
  const dLng = toDeg(dEast / (EARTH_RADIUS_M * cosLat));

  return {
    lat: parseFloat((lat + dLat).toFixed(6)),
    lng: parseFloat((lng + dLng).toFixed(6)),
  };
}

export interface PlotCheckinRefPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface ProjectedPinItem {
  pin: LandSurveyPin;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'middle' | 'end';
  shortTitle: string;
}

export interface ProjectedEdgeLabelItem {
  edge: SurveyEdgeSegment;
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  pixelLength: number;
  isCompact: boolean;
}

export interface ProjectedCheckinItem {
  x: number;
  y: number;
  lat: number;
  lng: number;
  label: string;
  nearestPin: LandSurveyPin | null;
  nearestPinX: number;
  nearestPinY: number;
  distanceToNearestPinMeters: number;
  midLabelX: number;
  midLabelY: number;
}

export interface ParcelPlotLayout {
  width: number;
  height: number;
  frameWidthMeters: number;
  frameHeightMeters: number;
  pixelsPerMeter: number;
  scaleBarMeters: number;
  scaleBarPixels: number;
  projectedPins: ProjectedPinItem[];
  projectedEdges: ProjectedEdgeLabelItem[];
  projectedCheckin: ProjectedCheckinItem | null;
  toXY: (lat: number, lng: number) => { x: number; y: number };
  toLatLng: (svgX: number, svgY: number) => { lat: number; lng: number };
}

/**
 * Builds a proportional metric SVG layout for the parcel & check-in point:
 * - Enforces a minimum 2.00m x 2.00m working frame so close pins never collapse.
 * - Includes the active/latest GPS check-in point in the bounding box so both the parcel
 *   and check-in distance line fit inside the frame.
 * - Pushes pin labels outward from the polygon centroid and offsets edge distance labels
 *   with collision repulsion so text labels never overlap.
 */
export function buildParcelPlotLayout(params: {
  pins: LandSurveyPin[];
  edges: SurveyEdgeSegment[];
  checkinPoint?: PlotCheckinRefPoint | null;
  width: number;
  height: number;
  padding?: number;
  minFrameMeters?: number;
}): ParcelPlotLayout | null {
  const {
    pins,
    edges,
    checkinPoint,
    width,
    height,
    padding = 46,
    minFrameMeters = 2.0,
  } = params;

  if (pins.length === 0 && !checkinPoint) {
    return null;
  }

  const allCoords: Array<{ lat: number; lng: number }> = pins.map((p) => ({
    lat: p.lat,
    lng: p.lng,
  }));
  if (checkinPoint) {
    allCoords.push({ lat: checkinPoint.lat, lng: checkinPoint.lng });
  }

  const refLat =
    allCoords.reduce((s, c) => s + c.lat, 0) / Math.max(1, allCoords.length);
  const refLng =
    allCoords.reduce((s, c) => s + c.lng, 0) / Math.max(1, allCoords.length);

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const cosLat = Math.max(0.01, Math.cos(toRad(refLat)));

  // Convert lat/lng to local meters relative to (refLat, refLng)
  const toLocalMeters = (lat: number, lng: number) => ({
    mx: toRad(lng - refLng) * EARTH_RADIUS_M * cosLat,
    my: toRad(lat - refLat) * EARTH_RADIUS_M,
  });

  const fromLocalMeters = (mx: number, my: number) => ({
    lat: parseFloat((refLat + toDeg(my / EARTH_RADIUS_M)).toFixed(6)),
    lng: parseFloat(
      (refLng + toDeg(mx / (EARTH_RADIUS_M * cosLat))).toFixed(6)
    ),
  });

  const meterPts = allCoords.map((c) => toLocalMeters(c.lat, c.lng));
  const minMx = Math.min(...meterPts.map((p) => p.mx));
  const maxMx = Math.max(...meterPts.map((p) => p.mx));
  const minMy = Math.min(...meterPts.map((p) => p.my));
  const maxMy = Math.max(...meterPts.map((p) => p.my));

  const centerMx = (minMx + maxMx) / 2;
  const centerMy = (minMy + maxMy) / 2;

  // Enforce minimum 2.00m x 2.00m working frame + 25% breathing margin
  const rawSpanX = maxMx - minMx;
  const rawSpanY = maxMy - minMy;
  const frameWidthMeters = parseFloat(
    Math.max(minFrameMeters, rawSpanX * 1.28, 2.0).toFixed(2)
  );
  const frameHeightMeters = parseFloat(
    Math.max(minFrameMeters, rawSpanY * 1.28, 2.0).toFixed(2)
  );

  const availW = Math.max(80, width - padding * 2);
  const availH = Math.max(80, height - padding * 2);
  const pixelsPerMeter = Math.min(
    availW / frameWidthMeters,
    availH / frameHeightMeters
  );

  const toXY = (lat: number, lng: number) => {
    const { mx, my } = toLocalMeters(lat, lng);
    return {
      x: width / 2 + (mx - centerMx) * pixelsPerMeter,
      y: height / 2 - (my - centerMy) * pixelsPerMeter,
    };
  };

  const toLatLng = (svgX: number, svgY: number) => {
    const mx = centerMx + (svgX - width / 2) / pixelsPerMeter;
    const my = centerMy - (svgY - height / 2) / pixelsPerMeter;
    return fromLocalMeters(mx, my);
  };

  // Compute polygon centroid in SVG space
  const rawPinXY = pins.map((pin) => ({
    pin,
    ...toXY(pin.lat, pin.lng),
  }));

  const centroidX =
    rawPinXY.length > 0
      ? rawPinXY.reduce((s, p) => s + p.x, 0) / rawPinXY.length
      : width / 2;
  const centroidY =
    rawPinXY.length > 0
      ? rawPinXY.reduce((s, p) => s + p.y, 0) / rawPinXY.length
      : height / 2;

  // Track placed label boxes to prevent text collisions
  const occupiedBoxes: Array<{
    cx: number;
    cy: number;
    w: number;
    h: number;
  }> = [];

  const resolveNonOverlappingPos = (
    prefX: number,
    prefY: number,
    boxW: number,
    boxH: number,
    dirX: number,
    dirY: number
  ): { x: number; y: number } => {
    const clampX = (x: number) =>
      Math.max(boxW / 2 + 6, Math.min(width - boxW / 2 - 6, x));
    const clampY = (y: number) =>
      Math.max(boxH / 2 + 6, Math.min(height - boxH / 2 - 6, y));

    const overlaps = (cx: number, cy: number) =>
      occupiedBoxes.some(
        (b) =>
          Math.abs(cx - b.cx) < (boxW + b.w) / 2 + 3 &&
          Math.abs(cy - b.cy) < (boxH + b.h) / 2 + 3
      );

    // Try along preferred outward normal or alternate angles
    const candidateOffsets = [0, 14, -14, 24, -24, 34];
    for (const step of candidateOffsets) {
      const cx = clampX(prefX + dirX * step);
      const cy = clampY(prefY + dirY * step);
      if (!overlaps(cx, cy)) {
        occupiedBoxes.push({ cx, cy, w: boxW, h: boxH });
        return { x: cx, y: cy };
      }
    }

    const fallbackX = clampX(prefX);
    const fallbackY = clampY(prefY);
    occupiedBoxes.push({ cx: fallbackX, cy: fallbackY, w: boxW, h: boxH });
    return { x: fallbackX, y: fallbackY };
  };

  // Reserve pin circle footprints first
  rawPinXY.forEach((p) => {
    occupiedBoxes.push({ cx: p.x, cy: p.y, w: 22, h: 22 });
  });

  // Push pin labels outward from centroid
  const projectedPins: ProjectedPinItem[] = rawPinXY.map((p, idx) => {
    let dx = p.x - centroidX;
    let dy = p.y - centroidY;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      const angle = (idx * Math.PI) / 2 - Math.PI / 4;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    } else {
      dx /= len;
      dy /= len;
    }

    const offsetDist = 22;
    const prefX = p.x + dx * offsetDist;
    const prefY = p.y + dy * offsetDist;
    const resolved = resolveNonOverlappingPos(prefX, prefY, 52, 16, dx, dy);

    const textAnchor: 'start' | 'middle' | 'end' =
      Math.abs(dx) < 0.35 ? 'middle' : dx > 0 ? 'start' : 'end';

    return {
      pin: p.pin,
      x: p.x,
      y: p.y,
      labelX: resolved.x,
      labelY: resolved.y,
      textAnchor,
      shortTitle: `หมุด ${p.pin.pinNumber}`,
    };
  });

  // Position edge distance labels with perpendicular offset & collision avoidance
  const projectedEdges: ProjectedEdgeLabelItem[] = edges
    .map((edge, index) => {
      const p1 = rawPinXY.find((p) => p.pin.id === edge.fromPin.id);
      const p2 = rawPinXY.find((p) => p.pin.id === edge.toPin.id);
      if (!p1 || !p2) return null;

      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const segDx = p2.x - p1.x;
      const segDy = p2.y - p1.y;
      const pixelLength = Math.hypot(segDx, segDy);

      // Outward normal relative to centroid
      let nx = -segDy;
      let ny = segDx;
      const nLen = Math.hypot(nx, ny) || 1;
      nx /= nLen;
      ny /= nLen;
      if (nx * (mx - centroidX) + ny * (my - centroidY) < 0) {
        nx = -nx;
        ny = -ny;
      }

      const isCompact = pixelLength < 65;
      const normalOffset = isCompact ? 15 : 8;
      const prefX = mx + nx * normalOffset;
      const prefY = my + ny * normalOffset;
      const resolved = resolveNonOverlappingPos(
        prefX,
        prefY,
        isCompact ? 54 : 68,
        18,
        nx,
        ny
      );

      return {
        edge,
        index,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        labelX: resolved.x,
        labelY: resolved.y,
        pixelLength,
        isCompact,
      };
    })
    .filter((item): item is ProjectedEdgeLabelItem => item !== null);

  // Project check-in reference point and its distance to the nearest pin
  let projectedCheckin: ProjectedCheckinItem | null = null;
  if (checkinPoint) {
    const chkXY = toXY(checkinPoint.lat, checkinPoint.lng);
    let nearestPin: LandSurveyPin | null = null;
    let nearestPinX = chkXY.x;
    let nearestPinY = chkXY.y;
    let minMeters = Infinity;

    rawPinXY.forEach((p) => {
      const d = haversineDistanceMeters(
        checkinPoint.lat,
        checkinPoint.lng,
        p.pin.lat,
        p.pin.lng
      );
      if (d < minMeters) {
        minMeters = d;
        nearestPin = p.pin;
        nearestPinX = p.x;
        nearestPinY = p.y;
      }
    });

    const midX = (chkXY.x + nearestPinX) / 2;
    const midY = (chkXY.y + nearestPinY) / 2;
    const resolvedMid = resolveNonOverlappingPos(
      midX,
      midY - 10,
      78,
      18,
      0,
      -1
    );

    projectedCheckin = {
      x: chkXY.x,
      y: chkXY.y,
      lat: checkinPoint.lat,
      lng: checkinPoint.lng,
      label: checkinPoint.label || 'จุดเช็คอิน',
      nearestPin,
      nearestPinX,
      nearestPinY,
      distanceToNearestPinMeters:
        minMeters === Infinity ? 0 : parseFloat(minMeters.toFixed(2)),
      midLabelX: resolvedMid.x,
      midLabelY: resolvedMid.y,
    };
  }

  // Choose clean engineering scale bar length (e.g. 0.5m, 1m, 2m, 5m, 10m, 20m, 50m)
  const targetMeters = frameWidthMeters * 0.22;
  const niceSteps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200];
  const scaleBarMeters =
    niceSteps.find((s) => s >= targetMeters) ||
    niceSteps[niceSteps.length - 1];
  const scaleBarPixels = Math.max(28, Math.round(scaleBarMeters * pixelsPerMeter));

  return {
    width,
    height,
    frameWidthMeters,
    frameHeightMeters,
    pixelsPerMeter,
    scaleBarMeters,
    scaleBarPixels,
    projectedPins,
    projectedEdges,
    projectedCheckin,
    toXY,
    toLatLng,
  };
}

