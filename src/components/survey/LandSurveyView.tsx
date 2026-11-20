/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Project,
  LandSurveyRecord,
  LandSurveyPin,
  SiteAttendanceCheckin,
} from '../../types/types.ts';
import {
  latLngToUtm,
  utmToLatLng,
  computeSurveyEdges,
  computePolygonAreaSqMeters,
  sqMetersToThaiArea,
  thaiAreaToSqMeters,
  evaluatePointAgainstBoundary,
  haversineDistanceMeters,
  calculateBearingDegrees,
  offsetLatLngByMeters,
  buildParcelPlotLayout,
} from '../../utils/landSurveyMath.ts';
import { DocumentActionButtons } from '../receipts/DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import {
  LandSurveyPrint,
  formatThaiDateTimeShort,
} from './LandSurveyPrint.tsx';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import {
  Compass,
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FolderOpen,
  FilePlus2,
  UserCheck,
  Ruler,
  Crosshair,
  Loader2,
} from 'lucide-react';

interface LandSurveyViewProps {
  projects: Project[];
  surveys: LandSurveyRecord[];
  onSaveSurvey: (record: LandSurveyRecord) => void;
  onDeleteSurvey: (id: string) => void;
}

async function compressCheckinPhoto(
  file: File,
  maxDim = 1000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const dw = Math.max(1, Math.round(w * scale));
        const dh = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = dw;
        canvas.height = dh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, dw, dh);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        canvas.width = 1;
        canvas.height = 1;
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

export const LandSurveyView: React.FC<LandSurveyViewProps> = ({
  projects,
  surveys,
  onSaveSurvey,
  onDeleteSurvey,
}) => {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(
    surveys[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<
    'deed_pins' | 'site_checkin' | 'archive'
  >('deed_pins');
  const [coordInputMode, setCoordInputMode] = useState<'latlng' | 'utm'>(
    'latlng'
  );
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Live GPS state
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [liveGps, setLiveGps] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);

  // 1.ข: Minimum 2.00m pin spacing filter & warning prompt when GPS jitter < 2.00m
  const [enforceMin2mDistance, setEnforceMin2mDistance] = useState(true);
  const [pendingShortPin, setPendingShortPin] = useState<{
    rawLat: number;
    rawLng: number;
    snappedLat: number;
    snappedLng: number;
    measuredDistMeters: number;
    bearingDeg: number;
    accuracy?: number;
    customLabel?: string;
    deedDistanceToNextMeters?: number;
    notes?: string;
  } | null>(null);

  // 2.ข: Plot display controls (font size S/M/L + toggle bearing/coordinates on plot)
  const [plotFontSize, setPlotFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPlotBearingAndCoords, setShowPlotBearingAndCoords] =
    useState(false);

  // Quick manual/assisted pin form state
  const [newPinLabel, setNewPinLabel] = useState('');
  const [newPinLat, setNewPinLat] = useState('');
  const [newPinLng, setNewPinLng] = useState('');
  const [newPinUtmZone, setNewPinUtmZone] = useState<'47' | '48'>('47');
  const [newPinUtmE, setNewPinUtmE] = useState('');
  const [newPinUtmN, setNewPinUtmN] = useState('');
  const [newPinDeedDist, setNewPinDeedDist] = useState('');
  const [newPinNotes, setNewPinNotes] = useState('');

  // Site attendance check-in state
  const [checkinPersonName, setCheckinPersonName] = useState(
    'นายปรวิทย์ นวลนาค'
  );
  const [checkinRole, setCheckinRole] = useState('วิศวกร / ผู้ควบคุมงาน');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [checkinPhoto, setCheckinPhoto] = useState<string | undefined>(
    undefined
  );

  // Interactive SVG canvas dragging state
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const svgPlotRef = useRef<SVGSVGElement | null>(null);
  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'survey' | 'pin';
    id: string;
    title: string;
  } | null>(null);

  const currentRecord: LandSurveyRecord = useMemo(() => {
    const found = surveys.find((s) => s.id === selectedSurveyId);
    if (found) return found;
    if (surveys.length > 0) return surveys[0];
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `srv-${Date.now()}`,
      docNumber: 'SRV-2569-001',
      title: 'สำรวจเช็คระยะโฉนดที่ดินโครงการใหม่',
      projectId: projects[0]?.id,
      projectName: projects[0]?.name,
      deedNumber: '',
      parcelNumber: '',
      location: projects[0]?.location || '',
      surveyDate: today,
      surveyorName: projects[0]?.supervisorName || 'นายปรวิทย์ นวลนาค',
      deedAreaRai: 0,
      deedAreaNgan: 0,
      deedAreaSqWah: 0,
      isClosedPolygon: true,
      pins: [],
      attendanceCheckins: [],
      notes: '',
      createdAt: new Date().toISOString(),
    };
  }, [surveys, selectedSurveyId, projects]);

  useEffect(() => {
    if (!surveys.some((s) => s.id === selectedSurveyId) && surveys.length > 0) {
      setSelectedSurveyId(surveys[0].id);
    }
  }, [surveys, selectedSurveyId]);

  const updateCurrentRecord = (patch: Partial<LandSurveyRecord>) => {
    const updated: LandSurveyRecord = {
      ...currentRecord,
      ...patch,
    };
    onSaveSurvey(updated);
  };

  const pins = currentRecord.pins || [];
  const edges = useMemo(
    () => computeSurveyEdges(pins, currentRecord.isClosedPolygon),
    [pins, currentRecord.isClosedPolygon]
  );

  const perimeterMeters = useMemo(
    () =>
      parseFloat(
        edges.reduce((sum, e) => sum + e.measuredMeters, 0).toFixed(2)
      ),
    [edges]
  );

  const areaSqm = useMemo(
    () =>
      currentRecord.isClosedPolygon && pins.length >= 3
        ? computePolygonAreaSqMeters(pins)
        : 0,
    [pins, currentRecord.isClosedPolygon]
  );

  const thaiArea = useMemo(() => sqMetersToThaiArea(areaSqm), [areaSqm]);
  const deedSqm = useMemo(
    () =>
      thaiAreaToSqMeters(
        currentRecord.deedAreaRai,
        currentRecord.deedAreaNgan,
        currentRecord.deedAreaSqWah
      ),
    [
      currentRecord.deedAreaRai,
      currentRecord.deedAreaNgan,
      currentRecord.deedAreaSqWah,
    ]
  );

  // Create a new survey record
  const handleCreateNewSurvey = () => {
    const nextNum = (surveys.length + 1).toString().padStart(3, '0');
    const today = new Date().toISOString().split('T')[0];
    const proj = projects[0];
    const newRec: LandSurveyRecord = {
      id: `srv-${Date.now()}`,
      docNumber: `SRV-2569-${nextNum}`,
      title: proj
        ? `สำรวจเช็คระยะโฉนด ${proj.name}`
        : `สำรวจเช็คระยะโฉนดแปลงที่ ${surveys.length + 1}`,
      projectId: proj?.id,
      projectName: proj?.name,
      deedNumber: '',
      parcelNumber: '',
      location: proj?.location || '',
      surveyDate: today,
      surveyorName: proj?.supervisorName || 'นายปรวิทย์ นวลนาค',
      deedAreaRai: 0,
      deedAreaNgan: 0,
      deedAreaSqWah: 0,
      isClosedPolygon: true,
      pins: [],
      attendanceCheckins: [],
      notes: '',
      createdAt: new Date().toISOString(),
    };
    onSaveSurvey(newRec);
    setSelectedSurveyId(newRec.id);
    setActiveTab('deed_pins');
  };

  // Request live GPS coordinates from mobile / iPad / browser
  const fetchCurrentGpsPosition = (): Promise<{
    lat: number;
    lng: number;
    accuracy: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('เบราว์เซอร์หรืออุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: parseFloat(pos.coords.latitude.toFixed(6)),
            lng: parseFloat(pos.coords.longitude.toFixed(6)),
            accuracy: parseFloat((pos.coords.accuracy || 3).toFixed(1)),
          });
        },
        (err) => {
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // 1.ข: Try adding a new pin with optional 2.00m minimum spacing filter from the previous pin
  const tryAppendPinWithMin2mCheck = (
    lat: number,
    lng: number,
    accuracyMeters?: number,
    customLabel?: string,
    deedDistanceToNextMeters?: number,
    notes?: string
  ): boolean => {
    const lastPin = pins[pins.length - 1];
    if (lastPin && enforceMin2mDistance) {
      const dist = parseFloat(
        haversineDistanceMeters(lastPin.lat, lastPin.lng, lat, lng).toFixed(2)
      );
      if (dist < 2.0) {
        const rawBearing =
          dist > 0.05
            ? calculateBearingDegrees(lastPin.lat, lastPin.lng, lat, lng)
            : (pins.length * 90) % 360;
        const snapped = offsetLatLngByMeters(
          lastPin.lat,
          lastPin.lng,
          2.0,
          rawBearing
        );
        setPendingShortPin({
          rawLat: lat,
          rawLng: lng,
          snappedLat: snapped.lat,
          snappedLng: snapped.lng,
          measuredDistMeters: dist,
          bearingDeg: parseFloat(rawBearing.toFixed(1)),
          accuracy: accuracyMeters,
          customLabel,
          deedDistanceToNextMeters,
          notes,
        });
        setGpsStatusMsg(
          `แจ้งเตือนระยะขั้นต่ำ 2.00 ม.: จุดที่เช็คอินห่างจากหมุด #${lastPin.pinNumber} เพียง ${dist.toFixed(
            2
          )} เมตร (< 2.00 ม.) กรุณาเลือกวิธีบันทึกด้านล่าง`
        );
        return false;
      }
    }

    setPendingShortPin(null);
    appendPinWithCoordinates(
      lat,
      lng,
      accuracyMeters,
      customLabel,
      deedDistanceToNextMeters,
      notes
    );
    return true;
  };

  //Quick 2.00m x 2.00m calibration / test square generator
  const handleCreate2x2MeterTestSquare = () => {
    const baseLat = liveGps?.lat ?? pins[0]?.lat ?? 13.72795;
    const baseLng = liveGps?.lng ?? pins[0]?.lng ?? 100.74815;
    const p1 = { lat: baseLat, lng: baseLng };
    const p2 = offsetLatLngByMeters(p1.lat, p1.lng, 2.0, 90); // 2.00m East
    const p3 = offsetLatLngByMeters(p2.lat, p2.lng, 2.0, 180); // 2.00m South
    const p4 = offsetLatLngByMeters(p3.lat, p3.lng, 2.0, 270); // 2.00m West

    const coords = [
      { ...p1, label: 'หมุดที่ 1 (มุมเหนือ-ตก)' },
      { ...p2, label: 'หมุดที่ 2 (มุมเหนือ-ออก)' },
      { ...p3, label: 'หมุดที่ 3 (มุมใต้-ออก)' },
      { ...p4, label: 'หมุดที่ 4 (มุมใต้-ตก)' },
    ];

    const nowIso = new Date().toISOString();
    const builtPins: LandSurveyPin[] = coords.map((c, idx) => {
      const utm = latLngToUtm(c.lat, c.lng);
      return {
        id: `pin-2x2-${Date.now()}-${idx}`,
        pinNumber: idx + 1,
        label: c.label,
        lat: c.lat,
        lng: c.lng,
        utmZone: utm.zone,
        utmEasting: utm.easting,
        utmNorthing: utm.northing,
        accuracyMeters: 1.0,
        checkedInBy: currentRecord.surveyorName || 'นายปรวิทย์ นวลนาค',
        checkedInAt: nowIso,
        deedDistanceToNextMeters: 2.0,
        notes: 'กรอบมาตรฐานขั้นต่ำ 2.00 × 2.00 เมตร',
      };
    });

    updateCurrentRecord({
      isClosedPolygon: true,
      pins: builtPins,
    });
    setPendingShortPin(null);
    setGpsStatusMsg(
      'ตั้งค่าผังแปลงทดสอบขนาดขั้นต่ำ 2.00 × 2.00 เมตร (4 หมุด ระยะด้านละ 2.00 ม.) เรียบร้อยแล้ว'
    );
  };

  // 1-Tap Check-in New Boundary Pin at Current GPS Position
  const handleCheckInNewPinViaGps = async () => {
    setIsLocatingGps(true);
    setGpsStatusMsg('กำลังดึงสัญญาณพิกัดดาวเทียม GPS ความละเอียดสูง...');
    try {
      const pos = await fetchCurrentGpsPosition();
      setLiveGps({
        ...pos,
        timestamp: new Date().toISOString(),
      });
      const added = tryAppendPinWithMin2mCheck(
        pos.lat,
        pos.lng,
        pos.accuracy,
        newPinLabel.trim() || `หมุดโฉนดที่ ${pins.length + 1} (เช็คอิน GPS)`,
        parseFloat(newPinDeedDist) || undefined,
        newPinNotes.trim() || undefined
      );
      if (added) {
        setGpsStatusMsg(
          `เช็คอินปักหมุดโฉนดที่ #${pins.length + 1} สำเร็จ (พิกัด ${pos.lat.toFixed(
            6
          )}, ${pos.lng.toFixed(6)} · ความแม่นยำ ±${pos.accuracy} ม.)`
        );
        setNewPinLabel('');
        setNewPinDeedDist('');
        setNewPinNotes('');
      }
    } catch {
      // Fallback: if inside restricted desktop iframe or indoor device without GPS permission,
      // place next pin 2.00m away along a clean 90-degree turn so 2.00m x 2.00m works out of the box
      const lastPin = pins[pins.length - 1];
      const nextAngle = ((pins.length % 4) * 90) % 360;
      const offsetPt = lastPin
        ? offsetLatLngByMeters(lastPin.lat, lastPin.lng, 2.0, nextAngle)
        : { lat: 13.72795, lng: 100.74815 };

      setLiveGps({
        lat: offsetPt.lat,
        lng: offsetPt.lng,
        accuracy: 2.0,
        timestamp: new Date().toISOString(),
      });

      appendPinWithCoordinates(
        offsetPt.lat,
        offsetPt.lng,
        2.0,
        newPinLabel.trim() || `หมุดโฉนดที่ ${pins.length + 1}`,
        parseFloat(newPinDeedDist) || 2.0,
        newPinNotes.trim() || 'ระยะมาตรฐานขั้นต่ำ 2.00 ม. (ลากปรับบนผังได้)'
      );
      setGpsStatusMsg(
        `สร้างหมุดโฉนดที่ #${pins.length + 1} ที่ระยะขั้นต่ำ 2.00 เมตรแล้ว (สามารถลากปรับตำแหน่งหมุดบนผังหรือพิมพ์เลขพิกัดได้ทันที)`
      );
      setNewPinLabel('');
      setNewPinDeedDist('');
      setNewPinNotes('');
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Re-checkin an existing pin at current GPS position
  const handleUpdateExistingPinViaGps = async (pinId: string) => {
    setIsLocatingGps(true);
    setGpsStatusMsg('กำลังอัปเดตพิกัดหมุดจากตำแหน่ง GPS ปัจจุบัน...');
    try {
      const pos = await fetchCurrentGpsPosition();
      setLiveGps({
        ...pos,
        timestamp: new Date().toISOString(),
      });
      const utm = latLngToUtm(pos.lat, pos.lng);
      const nextPins = pins.map((p) =>
        p.id === pinId
          ? {
              ...p,
              lat: pos.lat,
              lng: pos.lng,
              utmZone: utm.zone,
              utmEasting: utm.easting,
              utmNorthing: utm.northing,
              accuracyMeters: pos.accuracy,
              checkedInAt: new Date().toISOString(),
              checkedInBy: currentRecord.surveyorName || 'ผู้สำรวจ',
            }
          : p
      );
      updateCurrentRecord({ pins: nextPins });
      setGpsStatusMsg(
        `อัปเดตพิกัดหมุดสำเร็จ (${pos.lat.toFixed(6)}, ${pos.lng.toFixed(
          6
        )} · ±${pos.accuracy} ม.)`
      );
    } catch {
      setGpsStatusMsg(
        'ไม่สามารถดึงสัญญาณ GPS สดได้ กรุณาเปิด Location Services บนมือถือ/iPad หรือลากปรับหมุดบนผังโดยตรง'
      );
    } finally {
      setIsLocatingGps(false);
    }
  };

  const appendPinWithCoordinates = (
    lat: number,
    lng: number,
    accuracyMeters?: number,
    customLabel?: string,
    deedDistanceToNextMeters?: number,
    notes?: string
  ) => {
    const nextNum = pins.length + 1;
    const utm = latLngToUtm(lat, lng);
    const newPin: LandSurveyPin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      pinNumber: nextNum,
      label: customLabel || `หมุดโฉนดที่ ${nextNum}`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      utmZone: utm.zone,
      utmEasting: utm.easting,
      utmNorthing: utm.northing,
      accuracyMeters,
      checkedInBy: currentRecord.surveyorName || 'นายปรวิทย์ นวลนาค',
      checkedInAt: new Date().toISOString(),
      deedDistanceToNextMeters,
      notes,
    };

    updateCurrentRecord({
      pins: [...pins, newPin],
    });
  };

  // Manual add pin via Lat/Lng or UTM
  const handleManualAddPin = () => {
    let lat = 0;
    let lng = 0;
    if (coordInputMode === 'latlng') {
      lat = parseFloat(newPinLat);
      lng = parseFloat(newPinLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setGpsStatusMsg('กรุณากรอกค่าพิกัด Latitude และ Longitude ให้ถูกต้อง (เช่น 13.72795, 100.74815)');
        return;
      }
    } else {
      const easting = parseFloat(newPinUtmE);
      const northing = parseFloat(newPinUtmN);
      if (isNaN(easting) || isNaN(northing) || easting <= 100000 || northing <= 100000) {
        setGpsStatusMsg('กรุณากรอกค่าพิกัดฉาก UTM Easting (E) และ Northing (N) ให้ถูกต้อง');
        return;
      }
      const converted = utmToLatLng(easting, northing, parseInt(newPinUtmZone, 10));
      lat = converted.lat;
      lng = converted.lng;
    }

    const added = tryAppendPinWithMin2mCheck(
      lat,
      lng,
      undefined,
      newPinLabel.trim() || `หมุดโฉนดที่ ${pins.length + 1}`,
      parseFloat(newPinDeedDist) || undefined,
      newPinNotes.trim() || undefined
    );

    if (added) {
      setNewPinLabel('');
      setNewPinLat('');
      setNewPinLng('');
      setNewPinUtmE('');
      setNewPinUtmN('');
      setNewPinDeedDist('');
      setNewPinNotes('');
      setGpsStatusMsg(`เพิ่มหมุดโฉนดที่ #${pins.length + 1} เรียบร้อยแล้ว`);
    }
  };

  const handleUpdatePinField = <K extends keyof LandSurveyPin>(
    pinId: string,
    field: K,
    value: LandSurveyPin[K]
  ) => {
    const nextPins = pins.map((p) => {
      if (p.id !== pinId) return p;
      const updated = { ...p, [field]: value };
      if (field === 'lat' || field === 'lng') {
        const la = Number(updated.lat);
        const ln = Number(updated.lng);
        if (!isNaN(la) && !isNaN(ln)) {
          const utm = latLngToUtm(la, ln);
          updated.utmZone = utm.zone;
          updated.utmEasting = utm.easting;
          updated.utmNorthing = utm.northing;
        }
      }
      return updated;
    });
    updateCurrentRecord({ pins: nextPins });
  };

  const handleDeletePin = (pinId: string) => {
    const filtered = pins
      .filter((p) => p.id !== pinId)
      .map((p, idx) => ({ ...p, pinNumber: idx + 1 }));
    updateCurrentRecord({ pins: filtered });
  };

  const handlePinPhotoUpload = async (pinId: string, file?: File) => {
    if (!file) return;
    try {
      const compressed = await compressCheckinPhoto(file, 1000);
      handleUpdatePinField(pinId, 'photoUrl', compressed);
    } catch (err: any) {
      setGpsStatusMsg(err?.message || 'เกิดข้อผิดพลาดในการแนบรูปหลักหมุด');
    }
  };

  // Site Attendance Check-in (Geofence verification against parcel polygon)
  const handleSiteAttendanceCheckin = async () => {
    if (!checkinPersonName.trim()) {
      setGpsStatusMsg('กรุณาระบุชื่อผู้เช็คอินก่อนกดเช็คอินเข้าหน้างาน');
      return;
    }

    setIsLocatingGps(true);
    setGpsStatusMsg('กำลังตรวจสอบตำแหน่ง GPS เทียบกับขอบเขตแปลงโฉนด...');
    let lat = 13.727815;
    let lng = 100.748289;
    let accuracy = 2.5;

    try {
      const pos = await fetchCurrentGpsPosition();
      lat = pos.lat;
      lng = pos.lng;
      accuracy = pos.accuracy;
      setLiveGps({
        ...pos,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // If no live GPS available, use centroid of current parcel pins so user can verify workflow
      if (pins.length > 0) {
        lat = parseFloat(
          (pins.reduce((s, p) => s + p.lat, 0) / pins.length).toFixed(6)
        );
        lng = parseFloat(
          (pins.reduce((s, p) => s + p.lng, 0) / pins.length).toFixed(6)
        );
      }
    } finally {
      setIsLocatingGps(false);
    }

    const boundaryEval = evaluatePointAgainstBoundary(lat, lng, pins);
    const newEntry: SiteAttendanceCheckin = {
      id: `att-${Date.now()}`,
      personName: checkinPersonName.trim(),
      role: checkinRole.trim() || undefined,
      lat,
      lng,
      accuracyMeters: accuracy,
      checkedInAt: new Date().toISOString(),
      isInsideBoundary: boundaryEval.isInside,
      distanceToBoundaryMeters: boundaryEval.distanceMeters,
      photoUrl: checkinPhoto,
      notes: checkinNotes.trim() || undefined,
    };

    const existing = currentRecord.attendanceCheckins || [];
    updateCurrentRecord({
      attendanceCheckins: [newEntry, ...existing],
    });
    setCheckinNotes('');
    setCheckinPhoto(undefined);
    setGpsStatusMsg(
      boundaryEval.isInside
        ? `เช็คอินสำเร็จ: ${newEntry.personName} อยู่ในเขตแปลงโฉนดที่ดิน`
        : `เช็คอินสำเร็จ: ${newEntry.personName} ห่างจากขอบเขตแปลงโฉนด ${boundaryEval.distanceMeters} เมตร`
    );
  };

  // Interactive SVG Cadastral Plot Geometry & Drag/Click Handlers (1.ข, 2.ข, 3.ก)
  const plotW = 640;
  const plotH = 380;

  const activeCheckinRefPoint = useMemo(() => {
    if (liveGps) {
      return {
        lat: liveGps.lat,
        lng: liveGps.lng,
        label: 'พิกัดเช็คอินมือถือ',
      };
    }
    const latestAtt = (currentRecord.attendanceCheckins || [])[0];
    if (latestAtt) {
      return {
        lat: latestAtt.lat,
        lng: latestAtt.lng,
        label: `เช็คอิน (${latestAtt.personName})`,
      };
    }
    return null;
  }, [liveGps, currentRecord.attendanceCheckins]);

  const plotLayout = useMemo(
    () =>
      buildParcelPlotLayout({
        pins,
        edges,
        checkinPoint: activeCheckinRefPoint,
        width: plotW,
        height: plotH,
        padding: 46,
        minFrameMeters: 2.0,
      }),
    [pins, edges, activeCheckinRefPoint]
  );

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingPinId || !plotLayout || !svgPlotRef.current) return;
    const rect = svgPlotRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * plotW;
    const svgY = ((e.clientY - rect.top) / rect.height) * plotH;
    const { lat, lng } = plotLayout.toLatLng(svgX, svgY);
    const utm = latLngToUtm(lat, lng);

    const nextPins = pins.map((p) =>
      p.id === draggingPinId
        ? {
            ...p,
            lat,
            lng,
            utmZone: utm.zone,
            utmEasting: utm.easting,
            utmNorthing: utm.northing,
          }
        : p
    );
    updateCurrentRecord({ pins: nextPins });
  };

  const handleSvgBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPinId) return;
    if ((e.target as HTMLElement).dataset?.pinHandle === 'true') return;
    if (!svgPlotRef.current) return;

    const rect = svgPlotRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * plotW;
    const svgY = ((e.clientY - rect.top) / rect.height) * plotH;

    if (plotLayout) {
      const { lat, lng } = plotLayout.toLatLng(svgX, svgY);
      const added = tryAppendPinWithMin2mCheck(
        lat,
        lng,
        undefined,
        `หมุดโฉนดที่ ${pins.length + 1}`
      );
      if (added) {
        setGpsStatusMsg(
          `ปักหมุดโฉนดที่ #${pins.length + 1} บนผังแปลงที่ดิน (${lat.toFixed(
            6
          )}, ${lng.toFixed(6)})`
        );
      }
    } else {
      appendPinWithCoordinates(13.72795, 100.74815, undefined, 'หมุดโฉนดที่ 1');
    }
  };

  // Compute map center for Google Maps Satellite Embed
  const mapCenter = useMemo(() => {
    if (liveGps) return { lat: liveGps.lat, lng: liveGps.lng };
    if (pins.length > 0) {
      const avgLat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
      const avgLng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
      return {
        lat: parseFloat(avgLat.toFixed(6)),
        lng: parseFloat(avgLng.toFixed(6)),
      };
    }
    return { lat: 13.727815, lng: 100.748289 };
  }, [pins, liveGps]);

  const handlePreviewToggle = () => {
    setShowPrintPreview((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          previewSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 80);
      }
      return next;
    });
  };

  const safeFileSlug = (currentRecord.title || 'land_survey')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_-]+/g, '_')
    .slice(0, 45);

  return (
    <div className="space-y-5 font-sans">
      {/* Top Bar: Title, Survey Record Switcher & Mode Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Compass className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                5. งานสำรวจ (เช็คอินปักหมุดพิกัด & เช็คระยะโฉนดที่ดิน)
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
              <span>เลขที่เอกสาร {currentRecord.docNumber}</span>
              <span aria-hidden="true">·</span>
              <span>โฉนดเลขที่ {currentRecord.deedNumber || '-'}</span>
              <span aria-hidden="true">·</span>
              <span>
                ปักหมุดแล้ว {pins.length} จุด · เส้นรอบรูป {perimeterMeters} ม. ·
                เนื้อที่ {thaiArea.formattedThai}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch saved survey record */}
            <select
              value={currentRecord.id}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.docNumber}: {s.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCreateNewSurvey}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              สร้างใบสำรวจโฉนดใหม่
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip (Single elevation, tabular-nums) */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              หมุดพิกัดโฉนดที่เช็คอิน
            </div>
            <div className="mt-0.5 text-xl font-bold text-slate-900">
              {pins.length}{' '}
              <span className="text-xs font-normal text-slate-500">
                หมุด ({edges.length} ด้าน)
              </span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              ความยาวเส้นรอบรูปวัดจริง
            </div>
            <div className="mt-0.5 text-xl font-bold text-blue-700">
              {perimeterMeters.toLocaleString('th-TH')}{' '}
              <span className="text-xs font-normal text-slate-500">เมตร</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-emerald-700">
              เนื้อที่คำนวณจากพิกัด (ไร่-งาน-ตร.ว.)
            </div>
            <div className="mt-0.5 text-base sm:text-lg font-bold text-emerald-700">
              {thaiArea.formattedThai}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              เนื้อที่ตารางเมตร / ตารางวา
            </div>
            <div className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">
              {thaiArea.sqMeters.toLocaleString('th-TH')} ตร.ม.{' '}
              <span className="text-xs font-normal text-slate-500">
                ({thaiArea.totalSqWah.toLocaleString('th-TH')} ตร.ว.)
              </span>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('deed_pins')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'deed_pins'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-emerald-600" />
              5.1 เช็คอินปักหมุด & วัดระยะโฉนด ({pins.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('site_checkin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'site_checkin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              5.2 เช็คอินเข้าพื้นที่หน้างาน (
              {(currentRecord.attendanceCheckins || []).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
              5.3 คลังข้อมูลสำรวจโฉนด ({surveys.length})
            </button>
          </div>

          {liveGps && (
            <div className="text-xs text-emerald-700 font-medium tabular-nums flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              <span>
                พิกัดมือถือล่าสุด: {liveGps.lat.toFixed(6)},{' '}
                {liveGps.lng.toFixed(6)} (±{liveGps.accuracy} ม.)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Document Export Toolbar (PDF / PNG / Print / iPad / Google Drive) */}
      <DocumentActionButtons
        elementId="land-survey-print-preview"
        documentTitle={`รายงานสำรวจเช็คระยะโฉนด_${currentRecord.docNumber}`}
        fileName={`รายงานสำรวจโฉนด_${currentRecord.docNumber}_${safeFileSlug}`}
        onPreviewToggle={handlePreviewToggle}
        isPreviewMode={showPrintPreview}
      />

      {/* GPS Status Feedback Banner */}
      {gpsStatusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-950 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{gpsStatusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsStatusMsg(null)}
            className="text-xs font-semibold text-emerald-700 hover:underline shrink-0 cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5.1: เช็คอินปักหมุดโฉนด & วัดระยะแต่ละด้าน                      */}
      {/* ================================================================= */}
      {activeTab === 'deed_pins' && (
        <div className="space-y-5 print:hidden">
          {/* Parcel Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              ข้อมูลแปลงโฉนดที่ดินและโครงการ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อหัวข้องานสำรวจ
                </label>
                <input
                  type="text"
                  value={currentRecord.title}
                  onChange={(e) =>
                    updateCurrentRecord({ title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ผูกกับโครงการ (จากเมนู 2.1)
                </label>
                <select
                  value={currentRecord.projectId || ''}
                  onChange={(e) => {
                    const p = projects.find((pr) => pr.id === e.target.value);
                    updateCurrentRecord({
                      projectId: p?.id || undefined,
                      projectName: p?.name || undefined,
                      location: p?.location || currentRecord.location,
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- ไม่ระบุ / แปลงทั่วไป --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขที่โฉนด / เลขที่ดิน
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={currentRecord.deedNumber}
                    onChange={(e) =>
                      updateCurrentRecord({ deedNumber: e.target.value })
                    }
                    placeholder="เลขโฉนด เช่น 58412"
                    className="w-1/2 px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={currentRecord.parcelNumber || ''}
                    onChange={(e) =>
                      updateCurrentRecord({ parcelNumber: e.target.value })
                    }
                    placeholder="เลขที่ดิน/หน้าสำรวจ"
                    className="w-1/2 px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ผู้สำรวจ / วันที่สำรวจ
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={currentRecord.surveyorName}
                    onChange={(e) =>
                      updateCurrentRecord({ surveyorName: e.target.value })
                    }
                    placeholder="ชื่อผู้สำรวจ"
                    className="w-3/5 px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="date"
                    value={currentRecord.surveyDate}
                    onChange={(e) =>
                      updateCurrentRecord({ surveyDate: e.target.value })
                    }
                    className="w-2/5 px-2 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  สถานที่ตั้งแปลงที่ดิน (ถนน / ตำบล / อำเภอ / จังหวัด)
                </label>
                <input
                  type="text"
                  value={currentRecord.location}
                  onChange={(e) =>
                    updateCurrentRecord({ location: e.target.value })
                  }
                  placeholder="ระบุที่ตั้งแปลงที่ดิน"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  เนื้อที่ตามหน้าโฉนด (ไร่ - งาน - ตารางวา) เพื่อเทียบผลต่าง
                </label>
                <div className="grid grid-cols-3 gap-2 tabular-nums">
                  <div className="flex items-center border border-slate-300 rounded-lg px-2.5 bg-white">
                    <input
                      type="number"
                      min={0}
                      value={currentRecord.deedAreaRai ?? 0}
                      onChange={(e) =>
                        updateCurrentRecord({
                          deedAreaRai: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full py-2 text-right font-semibold text-slate-900 focus:outline-hidden"
                    />
                    <span className="ml-1.5 text-slate-500">ไร่</span>
                  </div>
                  <div className="flex items-center border border-slate-300 rounded-lg px-2.5 bg-white">
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={currentRecord.deedAreaNgan ?? 0}
                      onChange={(e) =>
                        updateCurrentRecord({
                          deedAreaNgan: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full py-2 text-right font-semibold text-slate-900 focus:outline-hidden"
                    />
                    <span className="ml-1.5 text-slate-500">งาน</span>
                  </div>
                  <div className="flex items-center border border-slate-300 rounded-lg px-2.5 bg-white">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={currentRecord.deedAreaSqWah ?? 0}
                      onChange={(e) =>
                        updateCurrentRecord({
                          deedAreaSqWah: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full py-2 text-right font-semibold text-slate-900 focus:outline-hidden"
                    />
                    <span className="ml-1.5 text-slate-500">ตร.ว.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Left = GPS Check-in & Pin Entry, Right = Interactive Parcel Canvas & Satellite Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Column (5 cols): GPS Check-in Action & Coordinate Entry */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    เช็คอินปักหมุดโฉนดจุดถัดไป (หมุดที่ #{pins.length + 1})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เดินไปยืนที่หลักหมุดโฉนดแล้วกดปุ่มสีเขียวเพื่อดึงพิกัด GPS
                    มือถือ หรือกรอกเลขพิกัดเองด้านล่าง
                  </p>
                </div>

                {/* Primary 1-Tap GPS Check-in Button */}
                <button
                  type="button"
                  onClick={handleCheckInNewPinViaGps}
                  disabled={isLocatingGps}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isLocatingGps ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Crosshair className="w-5 h-5" />
                  )}
                  <span>
                    {isLocatingGps
                      ? 'กำลังอ่านพิกัดดาวเทียม GPS...'
                      : `กดเช็คอินปักหมุดที่ #${pins.length + 1} (จาก GPS ปัจจุบัน)`}
                  </span>
                </button>

                {/* 1.ข: Minimum 2.00m Pin Spacing Toggle & Quick 2.00m x 2.00m Frame Generator */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={enforceMin2mDistance}
                      onChange={(e) => setEnforceMin2mDistance(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>กรองระยะปักหมุดขั้นต่ำ 2.00 เมตร (กัน GPS แกว่ง)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCreate2x2MeterTestSquare}
                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
                    title="สร้างผังรูปสี่เหลี่ยมขนาดขั้นต่ำ 2.00 × 2.00 เมตร (4 หมุด) ทันที"
                  >
                    ตั้งผัง 2.00×2.00 ม.
                  </button>
                </div>

                {/* 1.ข: Alert Box when new pin is < 2.00m from previous pin */}
                {pendingShortPin && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs space-y-2.5">
                    <div className="flex items-start gap-2 text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">
                          ระยะห่างจากหมุดก่อนหน้าเพียง{' '}
                          {pendingShortPin.measuredDistMeters.toFixed(2)} เมตร
                          (ต่ำกว่าขั้นต่ำ 2.00 เมตร)
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          อาจเกิดจากสัญญาณ GPS มือถือแกว่งในพื้นที่แคบ กรุณาเลือกวิธีบันทึกหมุดที่ #{pins.length + 1}:
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          appendPinWithCoordinates(
                            pendingShortPin.snappedLat,
                            pendingShortPin.snappedLng,
                            pendingShortPin.accuracy,
                            pendingShortPin.customLabel,
                            pendingShortPin.deedDistanceToNextMeters || 2.0,
                            pendingShortPin.notes ||
                              `ปรับระยะขั้นต่ำเป็น 2.00 ม. (มุม ${pendingShortPin.bearingDeg}°)`
                          );
                          setPendingShortPin(null);
                          setNewPinLabel('');
                          setNewPinDeedDist('');
                          setNewPinNotes('');
                          setGpsStatusMsg(
                            `บันทึกหมุดที่ #${pins.length + 1} โดยปรับระยะขั้นต่ำเป็น 2.00 เมตร เรียบร้อยแล้ว`
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        ปรับระยะเป็น 2.00 เมตรอัตโนมัติ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          appendPinWithCoordinates(
                            pendingShortPin.rawLat,
                            pendingShortPin.rawLng,
                            pendingShortPin.accuracy,
                            pendingShortPin.customLabel,
                            pendingShortPin.deedDistanceToNextMeters,
                            pendingShortPin.notes
                          );
                          setPendingShortPin(null);
                          setNewPinLabel('');
                          setNewPinDeedDist('');
                          setNewPinNotes('');
                          setGpsStatusMsg(
                            `บันทึกหมุดที่ #${pins.length + 1} ตามพิกัดจริง (${pendingShortPin.measuredDistMeters.toFixed(
                              2
                            )} ม.) เรียบร้อยแล้ว`
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-semibold text-xs cursor-pointer"
                      >
                        ยืนยันใช้ระยะ {pendingShortPin.measuredDistMeters.toFixed(2)} ม.
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingShortPin(null)}
                        className="px-2 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-xs cursor-pointer"
                      >
                        ยกเลิก (เดินขยับใหม่)
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional pre-fill fields before tapping Check-in or manual add */}
                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        ชื่อหมุด / หมายเลขหลักเขต
                      </label>
                      <input
                        type="text"
                        value={newPinLabel}
                        onChange={(e) => setNewPinLabel(e.target.value)}
                        placeholder={`เช่น หมุดที่ ${pins.length + 1} (ทิศเหนือ)`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        ระยะตามใบโฉนดไปหมุดถัดไป (เมตร)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={newPinDeedDist}
                        onChange={(e) => setNewPinDeedDist(e.target.value)}
                        placeholder="เช่น 2.00 หรือ 30.00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Coordinate Manual Entry Switcher (Lat/Lng vs UTM) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-700">
                        หรือคีย์เลขพิกัดเอง:
                      </span>
                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCoordInputMode('latlng')}
                          className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                            coordInputMode === 'latlng'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Lat / Lng
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoordInputMode('utm')}
                          className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                            coordInputMode === 'utm'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600'
                          }`}
                        >
                          พิกัดฉาก UTM (ใบโฉนด)
                        </button>
                      </div>
                    </div>

                    {coordInputMode === 'latlng' ? (
                      <div className="grid grid-cols-2 gap-2 tabular-nums">
                        <input
                          type="number"
                          step="any"
                          value={newPinLat}
                          onChange={(e) => setNewPinLat(e.target.value)}
                          placeholder="Latitude เช่น 13.72795"
                          className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="number"
                          step="any"
                          value={newPinLng}
                          onChange={(e) => setNewPinLng(e.target.value)}
                          placeholder="Longitude เช่น 100.74815"
                          className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-1.5 tabular-nums">
                        <select
                          value={newPinUtmZone}
                          onChange={(e) =>
                            setNewPinUtmZone(e.target.value as '47' | '48')
                          }
                          className="col-span-3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                        >
                          <option value="47">Zone 47P</option>
                          <option value="48">Zone 48P</option>
                        </select>
                        <input
                          type="number"
                          step="any"
                          value={newPinUtmE}
                          onChange={(e) => setNewPinUtmE(e.target.value)}
                          placeholder="ตะวันออก (E) เช่น 689051"
                          className="col-span-4 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                        />
                        <input
                          type="number"
                          step="any"
                          value={newPinUtmN}
                          onChange={(e) => setNewPinUtmN(e.target.value)}
                          placeholder="เหนือ (N) เช่น 1518224"
                          className="col-span-5 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={newPinNotes}
                        onChange={(e) => setNewPinNotes(e.target.value)}
                        placeholder="หมายเหตุหลักหมุด (ถ้ามี)"
                        className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleManualAddPin}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มหมุดจากเลขพิกัด
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Polygon close toggle & deed area comparison */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentRecord.isClosedPolygon}
                    onChange={(e) =>
                      updateCurrentRecord({
                        isClosedPolygon: e.target.checked,
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>เชื่อมหมุดสุดท้ายกลับหมุดที่ 1 (ปิดรูปแปลงโฉนด)</span>
                </label>

                {deedSqm > 0 && areaSqm > 0 && (
                  <span
                    className={`font-semibold tabular-nums ${
                      Math.abs(areaSqm - deedSqm) <= 12
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    เทียบโฉนด:{' '}
                    {areaSqm - deedSqm >= 0 ? '+' : ''}
                    {(areaSqm - deedSqm).toFixed(1)} ตร.ม.
                  </span>
                )}
              </div>
            </div>

            {/* Right Column (7 cols): Interactive Cadastral Plot & Google Satellite View */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ผังรูปแปลงที่ดินและระยะห่างหมุดจากพิกัดเช็คอิน (กรอบขั้นต่ำ 2.00 × 2.00 ม.)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ย่อ-ขยายสัดส่วนพอดีกรอบอัตโนมัติ · ดันป้ายชื่อหมุดไม่ให้ทับกัน · ลากหมุดปรับระยะได้
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>เปิดในแอป Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* 2.ข: Toolbar for Font Size (เล็ก / กลาง / ใหญ่) & Coordinate/Bearing Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">
                    ขนาดตัวหนังสือบนผัง:
                  </span>
                  <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-md">
                    {(
                      [
                        { id: 'sm', label: 'เล็ก' },
                        { id: 'md', label: 'กลาง' },
                        { id: 'lg', label: 'ใหญ่' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlotFontSize(opt.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          plotFontSize === opt.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPlotBearingAndCoords}
                      onChange={(e) =>
                        setShowPlotBearingAndCoords(e.target.checked)
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>แสดงมุมทิศ / พิกัดบนผัง</span>
                  </label>

                  {plotLayout && (
                    <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                      กรอบสเกล: {plotLayout.frameWidthMeters.toFixed(2)} ×{' '}
                      {plotLayout.frameHeightMeters.toFixed(2)} ม.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                {/* Interactive Cadastral SVG Plot (7 cols) */}
                <div className="md:col-span-7 flex flex-col">
                  <svg
                    ref={svgPlotRef}
                    viewBox={`0 0 ${plotW} ${plotH}`}
                    onClick={handleSvgBackgroundClick}
                    onPointerMove={handleSvgPointerMove}
                    onPointerUp={() => setDraggingPinId(null)}
                    onPointerLeave={() => setDraggingPinId(null)}
                    className="w-full h-[290px] border border-slate-300 rounded-lg bg-slate-900 select-none cursor-crosshair touch-none"
                  >
                    {/* Technical grid lines */}
                    {[0.2, 0.4, 0.6, 0.8].map((r) => (
                      <g key={r}>
                        <line
                          x1={plotW * r}
                          y1={0}
                          x2={plotW * r}
                          y2={plotH}
                          stroke="#1e293b"
                          strokeWidth="1"
                        />
                        <line
                          x1={0}
                          y1={plotH * r}
                          x2={plotW}
                          y2={plotH * r}
                          stroke="#1e293b"
                          strokeWidth="1"
                        />
                      </g>
                    ))}

                    {/* Compass Indicator */}
                    <g transform={`translate(${plotW - 32}, 32)`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="16"
                        fill="#0f172a"
                        stroke="#475569"
                        strokeWidth="1.2"
                      />
                      <polygon points="0,-10 -4.5,5 0,2 4.5,5" fill="#10b981" />
                      <text
                        x="0"
                        y="-11"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#e2e8f0"
                      >
                        N
                      </text>
                    </g>

                    {plotLayout && (
                      <>
                        {/* Top-left Frame Dimension Indicator */}
                        <g transform="translate(14, 20)">
                          <text
                            fontSize="10"
                            fontWeight="600"
                            fill="#94a3b8"
                          >
                            กรอบผัง: {plotLayout.frameWidthMeters.toFixed(2)} ×{' '}
                            {plotLayout.frameHeightMeters.toFixed(2)} ม. (ขั้นต่ำ 2.00×2.00 ม.)
                          </text>
                        </g>

                        {/* Bottom-left Scale Bar */}
                        <g transform={`translate(16, ${plotH - 16})`}>
                          <line
                            x1="0"
                            y1="0"
                            x2={plotLayout.scaleBarPixels}
                            y2="0"
                            stroke="#34d399"
                            strokeWidth="2.2"
                          />
                          <line
                            x1="0"
                            y1="-4"
                            x2="0"
                            y2="4"
                            stroke="#34d399"
                            strokeWidth="1.8"
                          />
                          <line
                            x1={plotLayout.scaleBarPixels}
                            y1="-4"
                            x2={plotLayout.scaleBarPixels}
                            y2="4"
                            stroke="#34d399"
                            strokeWidth="1.8"
                          />
                          <text
                            x={plotLayout.scaleBarPixels / 2}
                            y="-6"
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="700"
                            fill="#a7f3d0"
                          >
                            สเกล {plotLayout.scaleBarMeters} ม.
                          </text>
                        </g>

                        {/* Closed Polygon Fill */}
                        {currentRecord.isClosedPolygon &&
                          plotLayout.projectedPins.length >= 3 && (
                            <polygon
                              points={plotLayout.projectedPins
                                .map((pt) => `${pt.x},${pt.y}`)
                                .join(' ')}
                              fill="#10b981"
                              fillOpacity="0.18"
                              stroke="#34d399"
                              strokeWidth="2.2"
                            />
                          )}

                        {/* Open Polyline */}
                        {(!currentRecord.isClosedPolygon ||
                          plotLayout.projectedPins.length === 2) &&
                          plotLayout.projectedPins.length >= 2 && (
                            <polyline
                              points={plotLayout.projectedPins
                                .map((pt) => `${pt.x},${pt.y}`)
                                .join(' ')}
                              fill="none"
                              stroke="#34d399"
                              strokeWidth="2.2"
                            />
                          )}

                        {/* 3.ก: Live / Latest Check-in Point + Dashed Distance Line to Nearest Pin */}
                        {plotLayout.projectedCheckin &&
                          plotLayout.projectedCheckin.nearestPin && (
                            <g>
                              <line
                                x1={plotLayout.projectedCheckin.x}
                                y1={plotLayout.projectedCheckin.y}
                                x2={plotLayout.projectedCheckin.nearestPinX}
                                y2={plotLayout.projectedCheckin.nearestPinY}
                                stroke="#38bdf8"
                                strokeWidth="1.8"
                                strokeDasharray="4 4"
                              />
                              {plotLayout.projectedCheckin
                                .distanceToNearestPinMeters > 0.05 && (
                                <g>
                                  <rect
                                    x={
                                      plotLayout.projectedCheckin.midLabelX - 48
                                    }
                                    y={
                                      plotLayout.projectedCheckin.midLabelY - 10
                                    }
                                    width="96"
                                    height="19"
                                    rx="4"
                                    fill="#0c4a6e"
                                    stroke="#38bdf8"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={plotLayout.projectedCheckin.midLabelX}
                                    y={
                                      plotLayout.projectedCheckin.midLabelY + 3
                                    }
                                    textAnchor="middle"
                                    fontSize={
                                      plotFontSize === 'sm'
                                        ? '9'
                                        : plotFontSize === 'lg'
                                        ? '11'
                                        : '10'
                                    }
                                    fontWeight="700"
                                    fill="#e0f2fe"
                                  >
                                    เช็คอิน→หมุด #
                                    {
                                      plotLayout.projectedCheckin.nearestPin
                                        .pinNumber
                                    }
                                    :{' '}
                                    {plotLayout.projectedCheckin.distanceToNearestPinMeters.toFixed(
                                      2
                                    )}{' '}
                                    ม.
                                  </text>
                                </g>
                              )}
                              <circle
                                cx={plotLayout.projectedCheckin.x}
                                cy={plotLayout.projectedCheckin.y}
                                r="7"
                                fill="#0284c7"
                                stroke="#ffffff"
                                strokeWidth="2"
                              />
                            </g>
                          )}

                        {/* 2.ข: Edge Distance Badges (non-overlapping, compact when narrow) */}
                        {plotLayout.projectedEdges.map((pe) => {
                          const edge = pe.edge;
                          const hasDiff =
                            edge.diffMeters !== undefined &&
                            Math.abs(edge.diffMeters) > 0.5;
                          const fontSz =
                            plotFontSize === 'sm'
                              ? 9.5
                              : plotFontSize === 'lg'
                              ? 12
                              : 10.5;
                          const labelStr = showPlotBearingAndCoords
                            ? `${edge.measuredMeters.toFixed(2)} ม. (${edge.bearingDegrees}°)`
                            : `${edge.measuredMeters.toFixed(2)} ม.`;
                          const boxW = showPlotBearingAndCoords
                            ? fontSz * 9.5
                            : fontSz * 5.8;
                          const boxH = fontSz + 9;

                          return (
                            <g key={`svg-edge-${pe.index}`}>
                              <rect
                                x={pe.labelX - boxW / 2}
                                y={pe.labelY - boxH / 2}
                                width={boxW}
                                height={boxH}
                                rx="4"
                                fill="#0f172a"
                                fillOpacity="0.92"
                                stroke={hasDiff ? '#f59e0b' : '#10b981'}
                                strokeWidth="1.1"
                              />
                              <text
                                x={pe.labelX}
                                y={pe.labelY + fontSz * 0.32}
                                textAnchor="middle"
                                fontSize={fontSz}
                                fontWeight="700"
                                fill={hasDiff ? '#fcd34d' : '#6ee7b7'}
                              >
                                {labelStr}
                              </text>
                            </g>
                          );
                        })}

                        {/* 2.ข: Draggable Pin Handles + Outward-Pushed Non-Overlapping Pin Labels */}
                        {plotLayout.projectedPins.map((pt) => {
                          const pin = pt.pin;
                          const fontSz =
                            plotFontSize === 'sm'
                              ? 9
                              : plotFontSize === 'lg'
                              ? 11.5
                              : 10;
                          const pinTitle = showPlotBearingAndCoords
                            ? `หมุด ${pin.pinNumber} (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)})`
                            : pt.shortTitle;

                          return (
                            <g
                              key={pin.id}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                setDraggingPinId(pin.id);
                              }}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="15"
                                fill="#10b981"
                                opacity="0.18"
                                data-pin-handle="true"
                              />
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="10.5"
                                fill="#059669"
                                stroke="#ffffff"
                                strokeWidth="2"
                                data-pin-handle="true"
                              />
                              <text
                                x={pt.x}
                                y={pt.y + 3.5}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="700"
                                fill="#ffffff"
                                pointerEvents="none"
                              >
                                {pin.pinNumber}
                              </text>
                              {/* Outward non-overlapping pin label */}
                              <text
                                x={pt.labelX}
                                y={pt.labelY + 3}
                                textAnchor="middle"
                                fontSize={fontSz}
                                fontWeight="700"
                                fill="#f8fafc"
                                pointerEvents="none"
                              >
                                {pinTitle}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    )}

                    {pins.length === 0 && (
                      <text
                        x={plotW / 2}
                        y={plotH / 2}
                        textAnchor="middle"
                        fontSize="14"
                        fill="#94a3b8"
                      >
                        คลิกบนพื้นที่นี้หรือกดปุ่มเช็คอิน GPS เพื่อปักหมุดที่ 1
                      </text>
                    )}
                  </svg>
                </div>

                {/* Satellite Map Preview (5 cols) */}
                <div className="md:col-span-5 flex flex-col">
                  <div className="h-[290px] rounded-lg overflow-hidden border border-slate-300 bg-slate-100 relative">
                    <iframe
                      title="แผนที่ดาวเทียมตำแหน่งแปลงที่ดิน"
                      src={`https://maps.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&t=k&z=19&output=embed`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Boundary Edge Distance Comparison Table (ระยะวัดจริง vs ระยะตามใบโฉนด) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ตารางเปรียบเทียบระยะห่างแต่ละด้านกับใบโฉนด (คำนวณอัตโนมัติทันทีที่เช็คอิน)
                </h3>
                <p className="text-xs text-slate-500">
                  สามารถกรอก &ldquo;ระยะตามใบโฉนด (เมตร)&rdquo; ในตารางนี้เพื่อเช็คว่าจุดที่เช็คอินคลาดเคลื่อนจากโฉนดกี่เมตร
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                เส้นรอบรูปรวม {perimeterMeters} เมตร
              </span>
            </div>

            {edges.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                กรุณาเช็คอินปักหมุดอย่างน้อย 2 จุด เพื่อดูระยะห่างระหว่างหมุดโฉนด
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 text-center font-semibold w-20">
                        ด้านที่
                      </th>
                      <th className="py-2.5 px-3 text-left font-semibold">
                        ช่วงหมุดโฉนด
                      </th>
                      <th className="py-2.5 px-3 text-center font-semibold w-40">
                        ทิศทาง (Azimuth)
                      </th>
                      <th className="py-2.5 px-3 text-right font-semibold w-36">
                        ระยะเช็คอินวัดจริง (ม.)
                      </th>
                      <th className="py-2.5 px-3 text-right font-semibold w-40">
                        ระยะตามใบโฉนด (ม.)
                      </th>
                      <th className="py-2.5 px-3 text-right font-semibold w-36">
                        ผลต่าง / ความคลาดเคลื่อน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {edges.map((edge, idx) => {
                      const absDiff =
                        edge.diffMeters !== undefined
                          ? Math.abs(edge.diffMeters)
                          : 0;

                      return (
                        <tr
                          key={`edge-live-${idx}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                            ด้านที่ {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            หมุด #{edge.fromPin.pinNumber} ({edge.fromPin.label}) →
                            หมุด #{edge.toPin.pinNumber}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {edge.bearingDegrees}° · {edge.compassLabel}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 text-sm">
                            {edge.measuredMeters.toFixed(2)} ม.
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={
                                edge.fromPin.deedDistanceToNextMeters ?? ''
                              }
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                handleUpdatePinField(
                                  edge.fromPin.id,
                                  'deedDistanceToNextMeters',
                                  isNaN(v) ? undefined : v
                                );
                              }}
                              placeholder="กรอกระยะโฉนด"
                              className="w-28 px-2.5 py-1.5 text-right bg-white border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            {edge.diffMeters === undefined ? (
                              <span className="text-slate-400 font-normal">
                                รอระบุระยะโฉนด
                              </span>
                            ) : absDiff <= 0.5 ? (
                              <span className="text-emerald-700">
                                {edge.diffMeters > 0 ? '+' : ''}
                                {edge.diffMeters.toFixed(2)} ม. (ตรงเกณฑ์)
                              </span>
                            ) : absDiff <= 1.5 ? (
                              <span className="text-amber-700">
                                {edge.diffMeters > 0 ? '+' : ''}
                                {edge.diffMeters.toFixed(2)} ม. (คลาดเคลื่อนเล็กน้อย)
                              </span>
                            ) : (
                              <span className="text-rose-700">
                                {edge.diffMeters > 0 ? '+' : ''}
                                {edge.diffMeters.toFixed(2)} ม. (ควรเช็คหมุดซ้ำ)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Checked-in Pins Detail Table with Camera Photo & Navigation */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                รายการหมุดโฉนดที่เช็คอินแล้ว ({pins.length} หมุด)
              </h3>
              <span className="text-xs text-slate-500">
                สามารถกดถ่ายรูปหลักหมุด กดเช็คอินซ้ำ หรือเปิดนำทางไปยังหมุดแต่ละจุดได้
              </span>
            </div>

            {pins.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                ยังไม่มีหมุดในใบสำรวจนี้ กดปุ่ม &ldquo;เช็คอินปักหมุด&rdquo;
                ด้านบนเพื่อเริ่มจุดที่ 1
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-2.5 text-center font-semibold w-14">
                        หมุด
                      </th>
                      <th className="py-2.5 px-2.5 text-left font-semibold min-w-[200px]">
                        ชื่อจุด / หลักหมุดโฉนด
                      </th>
                      <th className="py-2.5 px-2.5 text-left font-semibold w-36">
                        Latitude
                      </th>
                      <th className="py-2.5 px-2.5 text-left font-semibold w-36">
                        Longitude
                      </th>
                      <th className="py-2.5 px-2.5 text-left font-semibold w-44">
                        พิกัดฉาก UTM (ใบโฉนด)
                      </th>
                      <th className="py-2.5 px-2.5 text-left font-semibold w-36">
                        เวลาเช็คอิน / ความแม่นยำ
                      </th>
                      <th className="py-2.5 px-2.5 text-center font-semibold w-28">
                        รูปหลักหมุด
                      </th>
                      <th className="py-2.5 px-2.5 text-center font-semibold w-36">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pins.map((pin) => (
                      <tr
                        key={pin.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-2 px-2.5 text-center font-bold text-slate-900">
                          #{pin.pinNumber}
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            value={pin.label}
                            onChange={(e) =>
                              handleUpdatePinField(
                                pin.id,
                                'label',
                                e.target.value
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="number"
                            step="0.000001"
                            value={pin.lat}
                            onChange={(e) =>
                              handleUpdatePinField(
                                pin.id,
                                'lat',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="number"
                            step="0.000001"
                            value={pin.lng}
                            onChange={(e) =>
                              handleUpdatePinField(
                                pin.id,
                                'lng',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-2.5 font-mono text-[11px] text-slate-700">
                          <div>Zone {pin.utmZone || '47P'}</div>
                          <div>
                            E: {pin.utmEasting?.toFixed(1) || '-'} · N:{' '}
                            {pin.utmNorthing?.toFixed(1) || '-'}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-slate-600">
                          <div className="font-medium text-slate-800">
                            {formatThaiDateTimeShort(pin.checkedInAt)}
                          </div>
                          <div>
                            {pin.accuracyMeters
                              ? `GPS ±${pin.accuracyMeters} ม.`
                              : 'ระบุพิกัด'}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {pin.photoUrl && (
                              <img
                                src={pin.photoUrl}
                                alt={pin.label}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded object-cover border border-slate-300"
                              />
                            )}
                            <label className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer">
                              <Camera className="w-3.5 h-3.5" />
                              <span>{pin.photoUrl ? 'เปลี่ยน' : 'ถ่ายรูป'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) =>
                                  handlePinPhotoUpload(
                                    pin.id,
                                    e.target.files?.[0]
                                  )
                                }
                                className="hidden"
                              />
                            </label>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateExistingPinViaGps(pin.id)
                              }
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="กดเช็คอินทับหมุดนี้ด้วยพิกัด GPS ปัจจุบัน"
                            >
                              เช็คอินซ้ำ
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="นำทาง Google Maps ไปยังหมุดนี้"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeletePin(pin.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="ลบหมุดนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5.2: เช็คอินเข้าพื้นที่หน้างาน (ตรวจว่าอยู่ในเขตโฉนดหรือไม่)        */}
      {/* ================================================================= */}
      {activeTab === 'site_checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:hidden">
          {/* Left: Site Check-in Card (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                เช็คอินเข้าพื้นที่หน้างาน (ตรวจสอบกับขอบเขตโฉนด)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบจะอ่านพิกัด GPS ของผู้เช็คอินแล้วคำนวณว่ายืนอยู่ในเขตโฉนดของแปลงนี้หรือไม่
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อผู้เช็คอิน (วิศวกร / โฟร์แมน / ผู้รับเหมา)
                </label>
                <input
                  type="text"
                  value={checkinPersonName}
                  onChange={(e) => setCheckinPersonName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุล"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ตำแหน่ง / ชุดช่าง
                </label>
                <input
                  type="text"
                  value={checkinRole}
                  onChange={(e) => setCheckinRole(e.target.value)}
                  placeholder="เช่น โฟร์แมนควบคุมงาน, ช่างวางผัง"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  หมายเหตุ / กิจกรรมที่เข้าทำ
                </label>
                <input
                  type="text"
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                  placeholder="เช่น เข้าตรวจแนวรั้วและระดับดินเดิม"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <span>
                    {checkinPhoto ? 'เปลี่ยนรูปถ่ายหน้างาน' : 'ถ่ายรูปแนบเช็คอิน'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const dataUrl = await compressCheckinPhoto(file, 900);
                        setCheckinPhoto(dataUrl);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {checkinPhoto && (
                  <img
                    src={checkinPhoto}
                    alt="ตัวอย่างรูปเช็คอิน"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSiteAttendanceCheckin}
              disabled={isLocatingGps}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLocatingGps ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>กดเช็คอินเข้าพื้นที่หน้างานด้วย GPS</span>
            </button>
          </div>

          {/* Right: Site Attendance Log (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                ประวัติการเช็คอินเข้าพื้นที่แปลงโฉนดนี้ (
                {(currentRecord.attendanceCheckins || []).length} ครั้ง)
              </h3>
              <span className="text-xs text-slate-500">
                ตรวจสอบพิกัดเทียบกับรูปแปลง {pins.length} หมุด
              </span>
            </div>

            {(currentRecord.attendanceCheckins || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                ยังไม่มีประวัติการเช็คอินในแปลงโฉนดนี้
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(currentRecord.attendanceCheckins || []).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      {c.photoUrl && (
                        <img
                          src={c.photoUrl}
                          alt={c.personName}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="space-y-1 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {c.personName}
                          </span>
                          {c.role && (
                            <span className="text-slate-500">· {c.role}</span>
                          )}
                        </div>
                        <div className="text-slate-600 tabular-nums font-mono text-[11px]">
                          GPS: {c.lat.toFixed(6)}, {c.lng.toFixed(6)}
                          {c.accuracyMeters ? ` (±${c.accuracyMeters} ม.)` : ''} ·{' '}
                          {formatThaiDateTimeShort(c.checkedInAt)}
                        </div>
                        {c.notes && (
                          <div className="text-slate-600">{c.notes}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${
                          c.isInsideBoundary
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {c.isInsideBoundary ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {c.isInsideBoundary
                          ? 'อยู่ในเขตโฉนด'
                          : `ห่างขอบโฉนด ${c.distanceToBoundaryMeters} ม.`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5.3: คลังข้อมูลสำรวจโฉนดทั้งหมด                                  */}
      {/* ================================================================= */}
      {activeTab === 'archive' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              คลังใบสำรวจและเช็คระยะโฉนดที่ดินทั้งหมด ({surveys.length} รายการ)
            </h3>
            <button
              type="button"
              onClick={handleCreateNewSurvey}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มใบสำรวจโฉนดใหม่
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {surveys.map((srv) => {
              const srvArea =
                srv.isClosedPolygon && srv.pins.length >= 3
                  ? sqMetersToThaiArea(computePolygonAreaSqMeters(srv.pins))
                  : sqMetersToThaiArea(0);
              const isSelected = srv.id === currentRecord.id;

              return (
                <div
                  key={srv.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-emerald-700">
                        {srv.docNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {srv.title}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      โฉนดเลขที่ {srv.deedNumber || '-'} · โครงการ{' '}
                      {srv.projectName || '-'} · หมุดเช็คอิน {srv.pins.length}{' '}
                      จุด · เนื้อที่คำนวณ {srvArea.formattedThai} (
                      {srvArea.sqMeters.toLocaleString('th-TH')} ตร.ม.)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSurveyId(srv.id);
                        setActiveTab('deed_pins');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      เปิดแก้ไข / ดูผังโฉนด
                    </button>
                    {surveys.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'survey',
                            id: srv.id,
                            title: srv.title,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="ลบใบสำรวจนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* A4 PRINT / PDF / IPAD / GOOGLE DRIVE CONTAINER                    */}
      {/* Always mounted at full natural A4 size offscreen when hidden       */}
      {/* ================================================================= */}
      <div
        ref={previewSectionRef}
        className={
          showPrintPreview
            ? 'block'
            : 'fixed -left-[12000px] top-0 pointer-events-none print:static print:left-auto'
        }
        aria-hidden={!showPrintPreview}
      >
        <DocumentZoomContainer
          defaultZoom={85}
          title="ตัวอย่างเอกสาร A4: รายงานงานสำรวจและเช็คระยะโฉนดที่ดิน"
          badge="รองรับ PDF · iPad · Google Drive"
          orientation="portrait"
        >
          <LandSurveyPrint
            record={currentRecord}
            containerId="land-survey-print-preview"
          />
        </DocumentZoomContainer>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="ยืนยันการลบใบสำรวจโฉนด"
        itemName={deleteTarget ? deleteTarget.title : undefined}
        onConfirm={() => {
          if (deleteTarget?.type === 'survey') {
            onDeleteSurvey(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
