/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SevenElevenBranch,
  SevenElevenDailyWeatherItem,
  SevenElevenInspectionDoc,
  SevenElevenInspectionItem,
  SevenElevenInspectionPhoto,
  SevenElevenPhotoLayout,
  SevenElevenWeatherCondition,
  SevenElevenWeatherForecast,
} from '../../types/types.ts';
import { createDefault711InspectionItems } from '../../utils/storage.ts';
import {
  THAI_PROVINCES,
  WEATHER_CONDITION_OPTIONS,
  detectProvinceFromText,
  fetchProvinceWeatherForecast,
  createDefaultWeatherForecast,
  ensureSevenDayForecast,
  buildSevenDayForecastCentered,
  isConditionRainy,
} from '../../utils/thaiProvincesWeather.ts';
import {
  SevenElevenInspectionPrint,
  formatApprovalItemFullTitle,
  DailyWeatherIconSvg,
} from './SevenElevenInspectionPrint.tsx';
import { DocumentActionButtons } from '../receipts/DocumentActionButtons.tsx';
import { DocumentZoomContainer } from '../common/DocumentZoomContainer.tsx';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal.tsx';
import { SignatureInput } from '../common/SignatureInput.tsx';
import {
  ClipboardCheck,
  Store,
  CheckCircle2,
  FolderOpen,
  Folder,
  Search,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  CloudSun,
  RefreshCw,
  ImagePlus,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  FileImage,
  Maximize2,
} from 'lucide-react';

interface SevenElevenInspectionFormProps {
  branches: SevenElevenBranch[];
  inspections: SevenElevenInspectionDoc[];
  selectedBranch: SevenElevenBranch | null;
  onSaveInspection: (doc: SevenElevenInspectionDoc) => void;
  onDeleteInspection: (id: string) => void;
  onNavigateToBranchList: () => void;
}

const PHOTO_LAYOUT_OPTIONS: {
  id: SevenElevenPhotoLayout;
  label: string;
  desc: string;
  perPage: number;
}[] = [
  {
    id: 'layout-2',
    label: '2 รูปต่อหน้า (1×2)',
    desc: 'วางคู่ซ้าย-ขวา ขนาดใหญ่ชัดเจน (2 รูป/หน้า)',
    perPage: 2,
  },
  {
    id: 'layout-4',
    label: '4 รูปต่อหน้า (2×2)',
    desc: 'ตาราง 4 ช่อง มาตรฐานดูง่าย (4 รูป/หน้า)',
    perPage: 4,
  },
  {
    id: 'layout-6',
    label: '6 รูปต่อหน้า (3×2)',
    desc: 'ตาราง 6 ช่อง ประหยัดหน้ากระดาษ (6 รูป/หน้า)',
    perPage: 6,
  },
];

function compressImageFileToDataUrl(
  file: File,
  maxDim = 1200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const SevenElevenInspectionForm: React.FC<
  SevenElevenInspectionFormProps
> = ({
  branches,
  inspections,
  selectedBranch,
  onSaveInspection,
  onDeleteInspection,
  onNavigateToBranchList,
}) => {
  const [activeMode, setActiveMode] = useState<'form' | 'archive'>('form');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState<string>(
    `B4-2569-${Math.floor(100 + Math.random() * 900)}`
  );

  const initialBranch = selectedBranch || branches[0] || null;
  const [branchId, setBranchId] = useState<string>(initialBranch?.id || '');
  const [branchName, setBranchName] = useState<string>(
    initialBranch?.branchName || '7-11 สุขุมวิท66 จุด3'
  );
  const [branchCode, setBranchCode] = useState<string>(
    initialBranch?.branchCode || '24045'
  );
  const [area, setArea] = useState<string>(initialBranch?.area || 'BS');
  const [contractorCompany, setContractorCompany] = useState<string>(
    initialBranch?.contractorCompany || 'ไม้ยืนต้น คอนสตรัคชั่น'
  );
  const [defaultSupervisor, setDefaultSupervisor] = useState<string>(
    initialBranch?.defaultSupervisor || 'ปรวิทย์ นวลนาค'
  );
  const [supervisorSignature, setSupervisorSignature] = useState<string>(
    initialBranch?.defaultSupervisorSignature || ''
  );

  // Initialize items (with item 9 pre-filled like the example on initial load)
  const [items, setItems] = useState<SevenElevenInspectionItem[]>(() =>
    createDefault711InspectionItems().map((it) =>
      it.itemNumber === 9
        ? {
            ...it,
            checked: true,
            details: 'คอนกรีต 240Cu. จำนวน 3ลบ.ม.',
            responsiblePerson:
              initialBranch?.defaultSupervisor || 'ปรวิทย์ นวลนาค',
            inspectionDate: '15/9/69',
          }
        : it
    )
  );

  // Weather forecast state
  const [weatherForecast, setWeatherForecast] =
    useState<SevenElevenWeatherForecast>(() =>
      createDefaultWeatherForecast(
        initialBranch?.branchName || '7-11 สุขุมวิท66 จุด3',
        initialBranch?.area || 'BS',
        '15/9/69'
      )
    );
  const [isFetchingWeather, setIsFetchingWeather] = useState<boolean>(false);

  // Section 3: Multi-photo attachments state (2, 4, 6 per page)
  const [photoItems, setPhotoItems] = useState<SevenElevenInspectionPhoto[]>(
    []
  );
  const [photoLayout, setPhotoLayout] =
    useState<SevenElevenPhotoLayout>('layout-4');
  const [defaultLinkedItemForNewPhotos, setDefaultLinkedItemForNewPhotos] =
    useState<number | 'ALL'>('ALL');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Section 4: Dedicated Full-Page 1 Photo per page state
  const [fullPagePhotoItems, setFullPagePhotoItems] = useState<
    SevenElevenInspectionPhoto[]
  >([]);
  const [
    defaultLinkedItemForFullPagePhotos,
    setDefaultLinkedItemForFullPagePhotos,
  ] = useState<number | 'ALL'>('ALL');
  const fullPageFileInputRef = useRef<HTMLInputElement | null>(null);

  const [saveBannerMessage, setSaveBannerMessage] = useState<string | null>(
    null
  );
  const [viewingArchiveDoc, setViewingArchiveDoc] =
    useState<SevenElevenInspectionDoc | null>(null);
  const [docToDelete, setDocToDelete] =
    useState<SevenElevenInspectionDoc | null>(null);

  // Archive filter states
  const [archiveBranchFilter, setArchiveBranchFilter] = useState<string>('ALL');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');

  // Auto-fetch weather on mount
  useEffect(() => {
    let mounted = true;
    const initialDate =
      items.find((i) => i.checked && i.inspectionDate)?.inspectionDate ||
      weatherForecast.forecastDate ||
      '15/9/69';
    setIsFetchingWeather(true);
    fetchProvinceWeatherForecast(weatherForecast.province, initialDate)
      .then((res) => {
        if (mounted) {
          setWeatherForecast((prev) => ({
            ...prev,
            ...res,
            forecastDate: initialDate,
          }));
        }
      })
      .finally(() => {
        if (mounted) setIsFetchingWeather(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync when selectedBranch prop changes from 4.1
  useEffect(() => {
    if (selectedBranch) {
      setBranchId(selectedBranch.id);
      setBranchName(selectedBranch.branchName);
      setBranchCode(selectedBranch.branchCode);
      setArea(selectedBranch.area);
      setContractorCompany(selectedBranch.contractorCompany);
      setDefaultSupervisor(selectedBranch.defaultSupervisor || 'ปรวิทย์ นวลนาค');
      setSupervisorSignature(selectedBranch.defaultSupervisorSignature || '');

      const detectedProv =
        selectedBranch.province ||
        detectProvinceFromText(
          `${selectedBranch.branchName} ${selectedBranch.area} ${selectedBranch.notes || ''}`
        );
      handleFetchWeatherForProvince(
        detectedProv,
        weatherForecast.forecastDate
      );
    }
  }, [selectedBranch]);

  const handleFetchWeatherForProvince = async (
    targetProvince: string,
    targetDateStr: string
  ) => {
    setIsFetchingWeather(true);
    try {
      const res = await fetchProvinceWeatherForecast(
        targetProvince,
        targetDateStr
      );
      setWeatherForecast((prev) => ({
        ...prev,
        ...res,
        province: targetProvince,
        forecastDate: targetDateStr || prev.forecastDate,
      }));
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const handleBranchSelectChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const found = branches.find((b) => b.id === newBranchId);
    if (found) {
      setBranchName(found.branchName);
      setBranchCode(found.branchCode);
      setArea(found.area);
      setContractorCompany(found.contractorCompany);
      setDefaultSupervisor(found.defaultSupervisor || 'ปรวิทย์ นวลนาค');
      setSupervisorSignature(found.defaultSupervisorSignature || '');

      const detectedProv =
        found.province ||
        detectProvinceFromText(
          `${found.branchName} ${found.area} ${found.notes || ''}`
        );
      handleFetchWeatherForProvince(
        detectedProv,
        weatherForecast.forecastDate
      );
    }
  };

  // Toggle main checkbox for item 1..10
  const handleToggleItemCheck = (itemNumber: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.itemNumber !== itemNumber) return it;
        const nextChecked = !it.checked;
        return {
          ...it,
          checked: nextChecked,
          responsiblePerson:
            nextChecked && !it.responsiblePerson
              ? defaultSupervisor
              : it.responsiblePerson,
        };
      })
    );
  };

  const handleUpdateItemField = (
    itemNumber: number,
    field: keyof SevenElevenInspectionItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((it) =>
        it.itemNumber === itemNumber ? { ...it, [field]: value } : it
      )
    );

    if (
      field === 'inspectionDate' &&
      typeof value === 'string' &&
      value.trim()
    ) {
      const nextDate = value.trim();
      setWeatherForecast((prev) => {
        const nextDaily = ensureSevenDayForecast({
          ...prev,
          forecastDate: nextDate,
        });
        return {
          ...prev,
          forecastDate: nextDate,
          dailyForecasts: nextDaily,
        };
      });
    }
  };

  const handleWeatherConditionSelect = (cond: SevenElevenWeatherCondition) => {
    const preset = WEATHER_CONDITION_OPTIONS.find((o) => o.value === cond);
    setWeatherForecast((prev) => {
      const nextRain = preset ? preset.defaultRainProb : prev.rainProbability;
      const nextMax = preset ? preset.defaultTempMax : prev.tempMax;
      const nextMin = preset ? preset.defaultTempMin : prev.tempMin;
      const baseDaily = ensureSevenDayForecast(prev);
      const nextDaily = baseDaily.map((d, idx) =>
        idx === 3
          ? {
              ...d,
              condition: cond,
              isRainy: isConditionRainy(cond, nextRain),
              rainProbability: nextRain,
              tempMin: nextMin,
              tempMax: nextMax,
            }
          : d
      );
      return {
        ...prev,
        condition: cond,
        conditionLabel: preset ? preset.label : prev.conditionLabel,
        rainProbability: nextRain,
        tempMax: nextMax,
        tempMin: nextMin,
        dailyForecasts: nextDaily,
      };
    });
  };

  const handleUpdateDailyForecastDay = (
    dayIndex: number,
    patch: Partial<SevenElevenDailyWeatherItem>
  ) => {
    setWeatherForecast((prev) => {
      const baseDaily = ensureSevenDayForecast(prev);
      const nextDaily = baseDaily.map((d, idx) =>
        idx === dayIndex ? { ...d, ...patch } : d
      );
      const centerDay = nextDaily[3];
      return {
        ...prev,
        tempMin: centerDay.tempMin,
        tempMax: centerDay.tempMax,
        rainProbability: centerDay.rainProbability,
        condition: centerDay.condition,
        dailyForecasts: nextDaily,
      };
    });
  };

  // Section 3 Photo handlers (2, 4, 6 per page)
  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: SevenElevenInspectionPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      try {
        const dataUrl = await compressImageFileToDataUrl(f);
        const cleanFileName = f.name.replace(/\.[^/.]+$/, '');
        newPhotos.push({
          id: `ph711-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url: dataUrl,
          caption: cleanFileName,
          linkedItemNumber: defaultLinkedItemForNewPhotos,
        });
      } catch {
        // skip invalid image
      }
    }

    if (newPhotos.length > 0) {
      setPhotoItems((prev) => [...prev, ...newPhotos]);
    }
    e.target.value = '';
  };

  const handleUpdatePhoto = (
    photoId: string,
    patch: Partial<SevenElevenInspectionPhoto>
  ) => {
    setPhotoItems((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ...patch } : p))
    );
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    setPhotoItems((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotoItems((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Section 4 Photo handlers (Dedicated Full-Page 1 Photo per page)
  const handleUploadFullPagePhotos = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: SevenElevenInspectionPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      try {
        const dataUrl = await compressImageFileToDataUrl(f, 1800);
        const cleanFileName = f.name.replace(/\.[^/.]+$/, '');
        newPhotos.push({
          id: `ph711-full-${Date.now()}-${i}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          url: dataUrl,
          caption: cleanFileName,
          linkedItemNumber: defaultLinkedItemForFullPagePhotos,
        });
      } catch {
        // skip
      }
    }

    if (newPhotos.length > 0) {
      setFullPagePhotoItems((prev) => [...prev, ...newPhotos]);
    }
    e.target.value = '';
  };

  const handleUpdateFullPagePhoto = (
    photoId: string,
    patch: Partial<SevenElevenInspectionPhoto>
  ) => {
    setFullPagePhotoItems((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ...patch } : p))
    );
  };

  const handleMoveFullPagePhoto = (
    index: number,
    direction: 'up' | 'down'
  ) => {
    setFullPagePhotoItems((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleRemoveFullPagePhoto = (photoId: string) => {
    setFullPagePhotoItems((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleClearAllItems = () => {
    setEditingDocId(null);
    setDocNumber(`B4-2569-${Math.floor(100 + Math.random() * 900)}`);
    setItems(createDefault711InspectionItems());
    setPhotoItems([]);
    setFullPagePhotoItems([]);
  };

  const currentDoc: SevenElevenInspectionDoc = {
    id: editingDocId || `insp711-${Date.now()}`,
    docNumber,
    branchId: branchId || 'custom',
    branchName,
    branchCode,
    area,
    contractorCompany,
    defaultSupervisor,
    supervisorSignature: supervisorSignature || undefined,
    items,
    weatherForecast,
    photoItems,
    photoLayout,
    fullPagePhotoItems,
    createdAt: new Date().toISOString(),
  };

  const handleSaveToArchive = () => {
    onSaveInspection(currentDoc);
    setSaveBannerMessage(
      `บันทึกใบขออนุมัติตรวจสอบงานก่อสร้างของสาขา "${branchName}" เข้าสู่คลังประวัติเรียบร้อยแล้ว!`
    );
    setEditingDocId(null);
    setDocNumber(`B4-2569-${Math.floor(100 + Math.random() * 900)}`);
    setTimeout(() => setSaveBannerMessage(null), 6000);
  };

  const handleLoadDocForEdit = (doc: SevenElevenInspectionDoc) => {
    setEditingDocId(doc.id);
    setDocNumber(doc.docNumber);
    setBranchId(doc.branchId);
    setBranchName(doc.branchName);
    setBranchCode(doc.branchCode);
    setArea(doc.area);
    setContractorCompany(doc.contractorCompany);
    const matchedBranch = branches.find((b) => b.id === doc.branchId);
    setDefaultSupervisor(
      doc.defaultSupervisor ||
        matchedBranch?.defaultSupervisor ||
        doc.items.find((i) => i.checked && i.responsiblePerson)
          ?.responsiblePerson ||
        'ปรวิทย์ นวลนาค'
    );
    setSupervisorSignature(
      doc.supervisorSignature ||
        matchedBranch?.defaultSupervisorSignature ||
        ''
    );
    setItems(doc.items);
    setPhotoItems(doc.photoItems || []);
    setPhotoLayout(
      doc.photoLayout && doc.photoLayout !== 'layout-1'
        ? doc.photoLayout
        : 'layout-4'
    );
    setFullPagePhotoItems(doc.fullPagePhotoItems || []);
    if (doc.weatherForecast) {
      setWeatherForecast(doc.weatherForecast);
    } else {
      const firstDate =
        doc.items.find((i) => i.checked && i.inspectionDate)?.inspectionDate ||
        '15/9/69';
      setWeatherForecast(
        createDefaultWeatherForecast(doc.branchName, doc.area, firstDate)
      );
    }
    setActiveMode('form');
  };

  // Group saved inspection documents by 7-11 branch
  const branchArchiveGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        branchId: string;
        branchName: string;
        branchCode: string;
        area: string;
        contractorCompany: string;
        docs: SevenElevenInspectionDoc[];
      }
    >();

    branches.forEach((b) => {
      map.set(b.id, {
        branchId: b.id,
        branchName: b.branchName,
        branchCode: b.branchCode,
        area: b.area,
        contractorCompany: b.contractorCompany,
        docs: [],
      });
    });

    inspections.forEach((doc) => {
      const key = doc.branchId || doc.branchName;
      if (!map.has(key)) {
        map.set(key, {
          branchId: key,
          branchName: doc.branchName,
          branchCode: doc.branchCode,
          area: doc.area,
          contractorCompany: doc.contractorCompany,
          docs: [],
        });
      }
      map.get(key)!.docs.push(doc);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.docs.length - a.docs.length
    );
  }, [branches, inspections]);

  const visibleArchiveGroups = useMemo(() => {
    const q = archiveSearchQuery.trim().toLowerCase();
    return branchArchiveGroups
      .filter(
        (grp) =>
          archiveBranchFilter === 'ALL' || grp.branchId === archiveBranchFilter
      )
      .map((grp) => {
        if (!q) return grp;
        const filteredDocs = grp.docs.filter((d) => {
          const checkedText = d.items
            .filter((i) => i.checked)
            .map(
              (i) =>
                `${i.title} ${i.details} ${i.responsiblePerson} ${i.inspectionDate}`
            )
            .join(' ')
            .toLowerCase();
          return (
            d.branchName.toLowerCase().includes(q) ||
            d.branchCode.toLowerCase().includes(q) ||
            d.docNumber.toLowerCase().includes(q) ||
            checkedText.includes(q)
          );
        });
        return { ...grp, docs: filteredDocs };
      })
      .filter(
        (grp) =>
          archiveBranchFilter !== 'ALL' ||
          !q ||
          grp.docs.length > 0 ||
          grp.branchName.toLowerCase().includes(q)
      );
  }, [branchArchiveGroups, archiveBranchFilter, archiveSearchQuery]);

  const checkedItems = items.filter((i) => i.checked);
  const checkedCount = checkedItems.length;

  const selectedLayoutConfig =
    PHOTO_LAYOUT_OPTIONS.find((o) => o.id === photoLayout) ||
    PHOTO_LAYOUT_OPTIONS[1];
  const section3PagesCount =
    photoItems.length > 0
      ? Math.ceil(photoItems.length / selectedLayoutConfig.perPage)
      : 0;
  const section4PagesCount = fullPagePhotoItems.length;
  const totalDocumentPages = 1 + section3PagesCount + section4PagesCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 mb-1">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
            4. เอกสาร 7-11 • เมนูย่อย 4.2 (รหัสเอกสาร B4-FM-04-01-19)
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            4.2 ใบขออนุมัติตรวจสอบงานก่อสร้าง โดยผู้รับเหมา
          </h2>
          <p className="text-sm text-slate-500">
            เลือกรายการอนุมัติทำเครื่องหมายเช็คถูก กรอกรายละเอียด แนบรูปภาพ/แบบแปลนเพิ่มหน้ากระดาษอัตโนมัติ และพยากรณ์อากาศตามจังหวัด
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('form')}
            className={`px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'form'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>
              {editingDocId
                ? 'กำลังแก้ไขใบขออนุมัติ'
                : 'สร้างใบขออนุมัติ (B4-FM-04-01-19)'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('archive')}
            className={`px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'archive'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>ประวัติใบขออนุมัติแยกตามสาขา ({inspections.length})</span>
          </button>
        </div>
      </div>

      {/* Save Success In-App Banner */}
      {saveBannerMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveBannerMessage}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setArchiveBranchFilter(currentDoc.branchId);
                setActiveMode('archive');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              เปิดดูในคลังประวัติสาขานี้ →
            </button>
            <button
              type="button"
              onClick={() => setSaveBannerMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {activeMode === 'form' && (
        <>
          {/* Action Toolbar: Print, Save PNG, Save PDF, Save to System */}
          <DocumentActionButtons
            elementId="seven-eleven-inspection-preview"
            documentTitle={`ใบขออนุมัติตรวจสอบงานก่อสร้าง_${branchName}_${branchCode}`}
            fileName={`B4-FM-04-01-19_${branchName}_${branchCode}`}
            onSaveToSystem={handleSaveToArchive}
            documentData={currentDoc}
          />

          {/* Top Grid: Branch + Weather Settings (Left) + Checklist & Photo Forms (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Branch Selection + Weather Forecast Settings (4 cols) */}
            <div className="xl:col-span-4 space-y-5">
              {/* Card 1: Branch Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center">
                    <Store className="w-4 h-4 mr-1.5 text-emerald-600" />
                    1. ข้อมูลโครงการสาขา 7-11
                  </h3>
                  <button
                    type="button"
                    onClick={onNavigateToBranchList}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    + จัดการสาขา (4.1)
                  </button>
                </div>

                {/* Select from 4.1 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ดึงข้อมูลสาขาจากเมนู 4.1 เพิ่มข้อมูลโครงการ
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => handleBranchSelectChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchName} (รหัส {b.branchCode} • พื้นที่ {b.area})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Editable Header Fields */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ชื่อสาขา
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-blue-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        รหัสสาขา
                      </label>
                      <input
                        type="text"
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        พื้นที่
                      </label>
                      <input
                        type="text"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-blue-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ชื่อผรม. บริษัท
                    </label>
                    <input
                      type="text"
                      value={contractorCompany}
                      onChange={(e) => setContractorCompany(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      หัวหน้างานผู้รับผิดชอบ (โฟร์แมน หรือ วิศวกร ผรม.) ค่าเริ่มต้น
                    </label>
                    <input
                      type="text"
                      value={defaultSupervisor}
                      onChange={(e) => setDefaultSupervisor(e.target.value)}
                      placeholder="เช่น ปรวิทย์ นวลนาค"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-emerald-800"
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      ดึงไปใส่ในวงเล็บ ( {defaultSupervisor || 'ผู้รับเหมาก่อสร้าง'} ) ใต้ลายเซ็นผู้ขออนุมัติอัตโนมัติ
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <SignatureInput
                      value={supervisorSignature}
                      onChange={setSupervisorSignature}
                      signerName={defaultSupervisor}
                      label="ลายเซ็น หัวหน้างานผู้รับผิดชอบ (ผู้ขออนุมัติ)"
                      helperText="ดึงจากค่าเริ่มต้นของสาขา (4.1) อัตโนมัติ และสามารถวาดใหม่หรืออัปโหลดรูปเฉพาะใบนี้ได้"
                      compact
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Weather Forecast Settings */}
              <div className="bg-white p-5 rounded-2xl border border-sky-200/90 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <CloudSun className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                        พยากรณ์อากาศ ณ วันที่นัดหมายตรวจ
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        แสดงรูปภาพสภาพอากาศด้านล่างหมายเหตุข้อ 4
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={weatherForecast.enabled}
                      onChange={(e) =>
                        setWeatherForecast((prev) => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                    />
                    <span>แสดงในใบขออนุมัติ</span>
                  </label>
                </div>

                {weatherForecast.enabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          จังหวัดที่ตั้งสาขา
                        </label>
                        <select
                          value={weatherForecast.province}
                          onChange={(e) => {
                            const newProv = e.target.value;
                            handleFetchWeatherForProvince(
                              newProv,
                              weatherForecast.forecastDate
                            );
                          }}
                          className="w-full px-2.5 py-1.5 bg-sky-50/60 border border-sky-300 rounded-lg text-xs font-bold text-sky-950 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                        >
                          {THAI_PROVINCES.map((p) => (
                            <option key={p.name} value={p.name}>
                              จ.{p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          วันที่นัดหมายตรวจ (อยู่ตรงกลางของ 7 วัน)
                        </label>
                        <input
                          type="text"
                          value={weatherForecast.forecastDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWeatherForecast((prev) => {
                              const nextDaily = ensureSevenDayForecast({
                                ...prev,
                                forecastDate: val,
                              });
                              return {
                                ...prev,
                                forecastDate: val,
                                dailyForecasts: nextDaily,
                              };
                            });
                          }}
                          placeholder="เช่น 15/9/69"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isFetchingWeather}
                      onClick={() =>
                        handleFetchWeatherForProvince(
                          weatherForecast.province,
                          weatherForecast.forecastDate
                        )
                      }
                      className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isFetchingWeather ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {isFetchingWeather
                          ? 'กำลังดึงพยากรณ์อากาศ 7 วัน...'
                          : `ดึงพยากรณ์อากาศ 7 วันอัตโนมัติ (จ.${weatherForecast.province})`}
                      </span>
                    </button>

                    {/* Manual Override Controls for Inspection Day & 7-Day Forecast */}
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          สภาพอากาศวันนัดตรวจ (ช่องตรงกลาง)
                        </label>
                        <select
                          value={weatherForecast.condition}
                          onChange={(e) =>
                            handleWeatherConditionSelect(
                              e.target.value as SevenElevenWeatherCondition
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          {WEATHER_CONDITION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          คำบรรยายสภาพอากาศวันนัดตรวจ
                        </label>
                        <input
                          type="text"
                          value={weatherForecast.conditionLabel}
                          onChange={(e) =>
                            setWeatherForecast((prev) => ({
                              ...prev,
                              conditionLabel: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>

                      {/* 7-Day Individual Day Editor */}
                      <div className="pt-2 border-t border-sky-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-sky-900">
                            ปรับแก้พยากรณ์ 7 วัน (วันนัดตรวจอยู่ตรงกลาง)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setWeatherForecast((prev) => ({
                                ...prev,
                                dailyForecasts: buildSevenDayForecastCentered(
                                  prev.forecastDate,
                                  prev.condition,
                                  prev.rainProbability,
                                  prev.tempMin,
                                  prev.tempMax,
                                  prev.province
                                ),
                              }))
                            }
                            className="text-[10.5px] font-semibold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                          >
                            รีเซ็ตค่า 7 วัน
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                          {ensureSevenDayForecast(weatherForecast).map(
                            (day, dIdx) => {
                              const isCenter =
                                dIdx === 3 || !!day.isInspectionDay;
                              return (
                                <div
                                  key={`edit-day-${day.dayOffset}-${dIdx}`}
                                  className={`p-2 rounded-xl border text-xs transition-all ${
                                    isCenter
                                      ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300 shadow-2xs'
                                      : 'bg-slate-50/70 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`font-bold tabular-nums ${
                                          isCenter
                                            ? 'text-sky-950'
                                            : 'text-slate-700'
                                        }`}
                                      >
                                        {day.dayNameShort} {day.dateLabel}
                                      </span>
                                      {isCenter ? (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-400/90 text-slate-950 text-[10px] font-extrabold">
                                          ★ วันนัดตรวจ (ตรงกลาง)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-500">
                                          ({day.dayOffset > 0 ? `+${day.dayOffset}` : day.dayOffset} วัน)
                                        </span>
                                      )}
                                    </div>

                                    {/* Toggle Rain Cloud vs Sun Cloud */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextRainy = !day.isRainy;
                                        const nextCond: SevenElevenWeatherCondition =
                                          nextRainy ? 'rain' : 'partly_cloudy';
                                        const nextProb = nextRainy
                                          ? Math.max(50, day.rainProbability)
                                          : Math.min(20, day.rainProbability);
                                        handleUpdateDailyForecastDay(dIdx, {
                                          isRainy: nextRainy,
                                          condition: nextCond,
                                          rainProbability: nextProb,
                                        });
                                      }}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10.5px] font-bold cursor-pointer transition-colors ${
                                        day.isRainy
                                          ? 'bg-sky-600 text-white border-sky-700'
                                          : 'bg-amber-50 text-amber-900 border-amber-300'
                                      }`}
                                      title="คลิกเพื่อสลับรูปเมฆฝน / รูปเมฆพระอาทิตย์"
                                    >
                                      <DailyWeatherIconSvg
                                        isRainy={day.isRainy}
                                        sizeClass="w-4 h-4"
                                      />
                                      <span>
                                        {day.isRainy
                                          ? 'เมฆฝน (ฝนตก)'
                                          : 'เมฆพระอาทิตย์ (ไม่มีฝน)'}
                                      </span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div>
                                      <label className="block text-[9.5px] text-slate-500 mb-0.5">
                                        โอกาสฝน (%)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={day.rainProbability}
                                        onChange={(e) => {
                                          const prob = Math.min(
                                            100,
                                            Math.max(
                                              0,
                                              Number(e.target.value) || 0
                                            )
                                          );
                                          handleUpdateDailyForecastDay(dIdx, {
                                            rainProbability: prob,
                                            isRainy: prob >= 40,
                                            condition:
                                              prob >= 40
                                                ? 'rain'
                                                : 'partly_cloudy',
                                          });
                                        }}
                                        className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-bold text-center text-sky-700 tabular-nums"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9.5px] text-slate-500 mb-0.5">
                                        ต่ำสุด (°C)
                                      </label>
                                      <input
                                        type="number"
                                        value={day.tempMin}
                                        onChange={(e) =>
                                          handleUpdateDailyForecastDay(dIdx, {
                                            tempMin:
                                              Number(e.target.value) || 0,
                                          })
                                        }
                                        className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-bold text-center tabular-nums"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9.5px] text-slate-500 mb-0.5">
                                        สูงสุด (°C)
                                      </label>
                                      <input
                                        type="number"
                                        value={day.tempMax}
                                        onChange={(e) =>
                                          handleUpdateDailyForecastDay(dIdx, {
                                            tempMax:
                                              Number(e.target.value) || 0,
                                          })
                                        }
                                        className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-bold text-center tabular-nums"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveToArchive}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกใบขออนุมัติเข้าคลังสาขานี้</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllItems}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างข้อมูลเริ่มต้นใหม่</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: 2. Approval Items + 3. Multi-Photo + 4. Full-Page 1 Photo (8 cols) */}
            <div className="xl:col-span-8 space-y-5">
              {/* Section 2: 10 Approval Items */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      2. เลือกรายการอนุมัติ (ส่วนที่ 1 : ผู้รับเหมา Request for Inspection)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ติ๊กเช็คถูกในช่อง &ldquo;เลือกหัวข้อ&rdquo; เพื่อกรอก รายละเอียด, หัวหน้างานผู้รับผิดชอบ และวันที่นัดหมายตรวจ
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg shrink-0">
                    เลือกแล้ว {checkedCount} / 10 หัวข้อ
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.itemNumber}
                      className={`rounded-xl border p-3 transition-all ${
                        item.checked
                          ? 'border-emerald-500 bg-emerald-50/30 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                      }`}
                    >
                      {/* Top Row: Checkbox + Item Title + Sub-Checkboxes for Item 4 & Item 7 */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() =>
                              handleToggleItemCheck(item.itemNumber)
                            }
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              item.checked ? 'text-emerald-950' : 'text-slate-700'
                            }`}
                          >
                            {item.itemNumber}. {item.title}
                          </span>
                        </label>

                        {/* Sub-options for Item 4 */}
                        {item.itemNumber === 4 && (
                          <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-3 py-1 rounded-lg border border-slate-200">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.slabRc}
                                onChange={(e) => {
                                  handleUpdateItemField(
                                    4,
                                    'slabRc',
                                    e.target.checked
                                  );
                                  if (e.target.checked && !item.checked) {
                                    handleToggleItemCheck(4);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-600"
                              />
                              <span>พื้น คสล.</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.slabTopping}
                                onChange={(e) => {
                                  handleUpdateItemField(
                                    4,
                                    'slabTopping',
                                    e.target.checked
                                  );
                                  if (e.target.checked && !item.checked) {
                                    handleToggleItemCheck(4);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-600"
                              />
                              <span>พื้น Topping</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.slabSv}
                                onChange={(e) => {
                                  handleUpdateItemField(
                                    4,
                                    'slabSv',
                                    e.target.checked
                                  );
                                  if (e.target.checked && !item.checked) {
                                    handleToggleItemCheck(4);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-600"
                              />
                              <span>พื้น SV</span>
                            </label>
                          </div>
                        )}

                        {/* Sub-options for Item 7 */}
                        {item.itemNumber === 7 && (
                          <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-3 py-1 rounded-lg border border-slate-200">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.groundGs}
                                onChange={(e) => {
                                  handleUpdateItemField(
                                    7,
                                    'groundGs',
                                    e.target.checked
                                  );
                                  if (e.target.checked && !item.checked) {
                                    handleToggleItemCheck(7);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-600"
                              />
                              <span>พื้น GS</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.groundAsphalt}
                                onChange={(e) => {
                                  handleUpdateItemField(
                                    7,
                                    'groundAsphalt',
                                    e.target.checked
                                  );
                                  if (e.target.checked && !item.checked) {
                                    handleToggleItemCheck(7);
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-emerald-600"
                              />
                              <span>พื้น Asphant</span>
                            </label>
                            <div className="inline-flex items-center gap-1">
                              <span>ครั้งที่:</span>
                              <input
                                type="text"
                                value={item.groundTimeNo || ''}
                                onChange={(e) =>
                                  handleUpdateItemField(
                                    7,
                                    'groundTimeNo',
                                    e.target.value
                                  )
                                }
                                placeholder="1"
                                className="w-12 px-1.5 py-0.5 border border-slate-300 rounded text-center text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Fields when Item is Checked */}
                      {item.checked && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mt-3 pt-2.5 border-t border-emerald-200/70">
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              รายละเอียด (เช่น ตำแหน่ง, ปริมาณ หรือ จำนวน)
                            </label>
                            <input
                              type="text"
                              value={item.details}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  item.itemNumber,
                                  'details',
                                  e.target.value
                                )
                              }
                              placeholder="เช่น คอนกรีต 240Cu. จำนวน 3ลบ.ม."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              หัวหน้างานผู้รับผิดชอบ (โฟร์แมน/วิศวกร ผรม.)
                            </label>
                            <input
                              type="text"
                              value={item.responsiblePerson}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  item.itemNumber,
                                  'responsiblePerson',
                                  e.target.value
                                )
                              }
                              placeholder="เช่น ปรวิทย์ นวลนาค"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              วันที่ นัดหมายตรวจ
                            </label>
                            <input
                              type="text"
                              value={item.inspectionDate}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  item.itemNumber,
                                  'inspectionDate',
                                  e.target.value
                                )
                              }
                              placeholder="เช่น 15/9/69"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Multi-Photo Attachments (2, 4, 6 per page) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center">
                      <FileImage className="w-4 h-4 mr-1.5 text-emerald-600" />
                      3. แนบรูปภาพ / แบบแสดงจุดที่จะขออนุมัติ (เพิ่มหน้ากระดาษอัตโนมัติ)
                    </h3>
                    <p className="text-xs text-slate-500">
                      จัดเรียงรูปภาพแบบหลายรูปต่อหน้า (2, 4 หรือ 6 รูป/หน้า) ดึงหัวข้อรายการอนุมัติขึ้นหัวกระดาษอัตโนมัติ
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg">
                      {photoItems.length} รูป ({section3PagesCount} หน้า)
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadPhotos}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                      <span>+ เพิ่มรูปภาพ (ข้อ 3)</span>
                    </button>
                  </div>
                </div>

                {/* Layout Selector (2, 4, 6) & Default Linked Approval Item */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="lg:col-span-7">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                      <LayoutGrid className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      เลือกรูปแบบการจัดเรียงรูปภาพต่อ 1 หน้ากระดาษ (ข้อ 3)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PHOTO_LAYOUT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPhotoLayout(opt.id)}
                          className={`px-2.5 py-2 rounded-lg text-xs font-bold border text-left transition-all cursor-pointer ${
                            photoLayout === opt.id
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div>{opt.label}</div>
                          <div
                            className={`text-[10px] font-normal mt-0.5 ${
                              photoLayout === opt.id
                                ? 'text-emerald-100'
                                : 'text-slate-400'
                            }`}
                          >
                            {opt.perPage} รูป/หน้า
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      หัวข้อรายการอนุมัติสำหรับรูปที่เพิ่มใหม่ (แสดงบนหัวกระดาษ)
                    </label>
                    <select
                      value={defaultLinkedItemForNewPhotos}
                      onChange={(e) => {
                        const val =
                          e.target.value === 'ALL'
                            ? 'ALL'
                            : Number(e.target.value);
                        setDefaultLinkedItemForNewPhotos(val);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="ALL">
                        แสดงรวมทุกรายการอนุมัติที่ติ๊กเลือก ({checkedCount} รายการ)
                      </option>
                      {checkedItems.map((ci) => (
                        <option key={ci.itemNumber} value={ci.itemNumber}>
                          เฉพาะหัวข้อ: {formatApprovalItemFullTitle(ci)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Uploaded Photos List for Section 3 */}
                {photoItems.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-5 text-center cursor-pointer bg-slate-50/40 hover:bg-emerald-50/20 transition-colors"
                  >
                    <ImagePlus className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">
                      คลิกเพื่อเลือกรูปภาพประกอบแบบหลายรูปต่อหน้า (2, 4 หรือ 6 รูป/หน้า)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ระบบจะสร้างหน้ากระดาษเพิ่มต่อจากใบขออนุมัติให้อัตโนมัติ
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {photoItems.map((photo, idx) => {
                      const pageOfPhoto =
                        Math.floor(idx / selectedLayoutConfig.perPage) + 2;
                      return (
                        <div
                          key={photo.id}
                          className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 flex gap-3 items-start"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `รูปที่ ${idx + 1}`}
                            className="w-24 h-20 object-cover rounded-lg border border-slate-300 bg-white shrink-0"
                          />

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                รูปที่ {idx + 1} (แผ่นที่ {pageOfPhoto}/
                                {totalDocumentPages})
                              </span>

                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMovePhoto(idx, 'up')}
                                  className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                                  title="เลื่อนขึ้น"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === photoItems.length - 1}
                                  onClick={() => handleMovePhoto(idx, 'down')}
                                  className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                                  title="เลื่อนลง"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(photo.id)}
                                  className="p-1 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="ลบรูปภาพ"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <select
                                value={photo.linkedItemNumber || 'ALL'}
                                onChange={(e) => {
                                  const val =
                                    e.target.value === 'ALL'
                                      ? 'ALL'
                                      : Number(e.target.value);
                                  handleUpdatePhoto(photo.id, {
                                    linkedItemNumber: val,
                                  });
                                }}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-blue-900"
                              >
                                <option value="ALL">
                                  หัวกระดาษ: รวมทุกรายการอนุมัติที่เลือก
                                </option>
                                {checkedItems.map((ci) => (
                                  <option
                                    key={ci.itemNumber}
                                    value={ci.itemNumber}
                                  >
                                    หัวกระดาษ: {formatApprovalItemFullTitle(ci)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={photo.caption || ''}
                                onChange={(e) =>
                                  handleUpdatePhoto(photo.id, {
                                    caption: e.target.value,
                                  })
                                }
                                placeholder="คำอธิบายใต้ภาพ / จุดที่ขออนุมัติ..."
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4: Dedicated Full-Page 1 Photo Attachment (4. แนบรูปภาพแบบเต็มหน้า 1 รูป) */}
              <div className="bg-white p-5 rounded-2xl border border-indigo-200/90 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center">
                      <Maximize2 className="w-4 h-4 mr-1.5 text-indigo-600" />
                      4. แนบรูปภาพแบบเต็มหน้า 1 รูป (เพิ่มหน้ากระดาษอัตโนมัติ)
                    </h3>
                    <p className="text-xs text-slate-500">
                      แยกหน้าสำหรับแสดงรูปภาพหรือแบบแปลนขนาดใหญ่เต็มหน้ากระดาษ A4 แนวนอน (1 รูปต่อ 1 หน้ากระดาษ) พร้อมดึงหัวข้อรายการอนุมัติขึ้นหัวกระดาษอัตโนมัติ
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg">
                      {fullPagePhotoItems.length} รูปเต็มหน้า ({section4PagesCount} หน้า)
                    </span>
                    <input
                      ref={fullPageFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadFullPagePhotos}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fullPageFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                      <span>+ เพิ่มรูปเต็มหน้า 1 รูป (ข้อ 4)</span>
                    </button>
                  </div>
                </div>

                {/* Default Linked Approval Item for Section 4 */}
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-indigo-950 font-semibold">
                    รูปแบบ: <strong className="text-indigo-700">1 รูปใหญ่เต็มหน้ากระดาษ A4 แนวนอน (1 รูป/แผ่น)</strong> • เรียงต่อท้ายหน้าเอกสารอัตโนมัติ
                  </div>
                  <div className="w-full sm:w-80">
                    <select
                      value={defaultLinkedItemForFullPagePhotos}
                      onChange={(e) => {
                        const val =
                          e.target.value === 'ALL'
                            ? 'ALL'
                            : Number(e.target.value);
                        setDefaultLinkedItemForFullPagePhotos(val);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="ALL">
                        หัวกระดาษ: แสดงรวมทุกรายการอนุมัติที่ติ๊กเลือก ({checkedCount} รายการ)
                      </option>
                      {checkedItems.map((ci) => (
                        <option key={ci.itemNumber} value={ci.itemNumber}>
                          เฉพาะหัวข้อ: {formatApprovalItemFullTitle(ci)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Uploaded Full-Page Photos List for Section 4 */}
                {fullPagePhotoItems.length === 0 ? (
                  <div
                    onClick={() => fullPageFileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-5 text-center cursor-pointer bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors"
                  >
                    <Maximize2 className="w-7 h-7 text-indigo-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">
                      คลิกเพื่อเลือกรูปภาพแบบเต็มหน้า 1 รูป (เช่น ผังบริเวณ / แบบแปลนจุดขออนุมัติ / ภาพหน้างานเต็มแผ่น)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      แต่ละรูปจะถูกสร้างเป็นหน้ากระดาษ A4 แนวนอนเต็มหน้า (1 รูปต่อ 1 หน้า) ต่อท้ายให้อัตโนมัติ
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {fullPagePhotoItems.map((photo, idx) => {
                      const pageOfFullPhoto = 1 + section3PagesCount + idx + 1;
                      return (
                        <div
                          key={photo.id}
                          className="border border-indigo-200 rounded-xl p-3 bg-indigo-50/30 flex gap-3 items-start"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `ภาพเต็มหน้าที่ ${idx + 1}`}
                            className="w-24 h-20 object-contain rounded-lg border border-indigo-300 bg-white shrink-0"
                          />

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                                เต็มหน้าที่ {idx + 1} (แผ่นที่ {pageOfFullPhoto}/
                                {totalDocumentPages})
                              </span>

                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() =>
                                    handleMoveFullPagePhoto(idx, 'up')
                                  }
                                  className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                                  title="เลื่อนขึ้น"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    idx === fullPagePhotoItems.length - 1
                                  }
                                  onClick={() =>
                                    handleMoveFullPagePhoto(idx, 'down')
                                  }
                                  className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                                  title="เลื่อนลง"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveFullPagePhoto(photo.id)
                                  }
                                  className="p-1 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="ลบรูปภาพ"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <select
                                value={photo.linkedItemNumber || 'ALL'}
                                onChange={(e) => {
                                  const val =
                                    e.target.value === 'ALL'
                                      ? 'ALL'
                                      : Number(e.target.value);
                                  handleUpdateFullPagePhoto(photo.id, {
                                    linkedItemNumber: val,
                                  });
                                }}
                                className="w-full px-2 py-1 bg-white border border-indigo-300 rounded text-[11px] font-semibold text-indigo-950"
                              >
                                <option value="ALL">
                                  หัวกระดาษ: รวมทุกรายการอนุมัติที่เลือก
                                </option>
                                {checkedItems.map((ci) => (
                                  <option
                                    key={ci.itemNumber}
                                    value={ci.itemNumber}
                                  >
                                    หัวกระดาษ: {formatApprovalItemFullTitle(ci)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={photo.caption || ''}
                                onChange={(e) =>
                                  handleUpdateFullPagePhoto(photo.id, {
                                    caption: e.target.value,
                                  })
                                }
                                placeholder="คำอธิบายใต้ภาพเต็มหน้า / จุดที่ขออนุมัติ..."
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-Width Live A4 Landscape Document Preview */}
          <DocumentZoomContainer
            defaultZoom={85}
            orientation="landscape"
            title={`ตัวอย่างแบบฟอร์มการขออนุมัติตรวจสอบงานก่อสร้าง (B4-FM-04-01-19) • ทั้งหมด ${totalDocumentPages} หน้า`}
            badge={
              section3PagesCount + section4PagesCount > 0
                ? `ฟอร์มหลัก 1 หน้า + ข้อ 3 (${section3PagesCount} หน้า) + ข้อ 4 เต็มหน้า (${section4PagesCount} หน้า)`
                : 'ตรงตามต้นฉบับ 100%'
            }
          >
            <SevenElevenInspectionPrint
              doc={currentDoc}
              containerId="seven-eleven-inspection-preview"
            />
          </DocumentZoomContainer>
        </>
      )}

      {/* Archive Mode: Grouped by 7-11 Branch */}
      {activeMode === 'archive' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2 text-emerald-600" />
                  คลังประวัติใบขออนุมัติตรวจสอบงานก่อสร้าง (แยกตามสาขา 7-11)
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกแฟ้มสาขาเพื่อเปิดดู พิมพ์ซ้ำ ส่งออก PNG/PDF หรือแก้ไขย้อนหลัง
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={archiveSearchQuery}
                  onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อสาขา, รหัสสาขา, รายการตรวจ..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Branch Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setArchiveBranchFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  archiveBranchFilter === 'ALL'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ทุกสาขา ({inspections.length} ฉบับ)
              </button>
              {branchArchiveGroups.map((grp) => (
                <button
                  key={grp.branchId}
                  type="button"
                  onClick={() => setArchiveBranchFilter(grp.branchId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    archiveBranchFilter === grp.branchId
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {grp.branchName} ({grp.docs.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Branch Sections */}
          <div className="space-y-6">
            {visibleArchiveGroups.map((grp) => (
              <div
                key={grp.branchId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base">
                          {grp.branchName}
                        </h4>
                        <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-mono">
                          รหัสสาขา: {grp.branchCode}
                        </span>
                        <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded">
                          พื้นที่: {grp.area}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ผรม. บริษัท: {grp.contractorCompany} • เอกสารที่บันทึกไว้:{' '}
                        <strong className="text-white">
                          {grp.docs.length} ฉบับ
                        </strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleBranchSelectChange(grp.branchId);
                      handleClearAllItems();
                      setActiveMode('form');
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    สร้างใบขออนุมัติเพิ่มในสาขานี้
                  </button>
                </div>

                {grp.docs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/40">
                    ยังไม่มีใบขออนุมัติตรวจสอบงานก่อสร้างที่บันทึกไว้ในสาขานี้
                  </div>
                ) : (
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grp.docs.map((doc) => {
                      const docChecked = doc.items.filter((i) => i.checked);
                      const docPhotosCount =
                        (doc.photoItems?.length || 0) +
                        (doc.fullPagePhotoItems?.length || 0);
                      return (
                        <div
                          key={doc.id}
                          className="rounded-xl border border-slate-200 hover:border-emerald-400 bg-white p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                                {doc.docNumber}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {docPhotosCount > 0 && (
                                  <span className="text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                                    แนบรูป {docPhotosCount} ภาพ
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400">
                                  เลือก {docChecked.length} รายการ
                                </span>
                              </div>
                            </div>

                            {doc.weatherForecast?.enabled && (
                              <div className="mb-2 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg text-[11px] text-sky-900 flex items-center justify-between">
                                <span className="font-semibold">
                                  จ.{doc.weatherForecast.province} •{' '}
                                  {doc.weatherForecast.conditionLabel}
                                </span>
                                <span className="font-bold text-sky-700">
                                  ฝน {doc.weatherForecast.rainProbability}%
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5 my-3">
                              {docChecked.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  ยังไม่ได้ติ๊กเลือกรายการ
                                </p>
                              ) : (
                                docChecked.map((ci) => (
                                  <div
                                    key={ci.itemNumber}
                                    className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100"
                                  >
                                    <div className="font-bold text-slate-800">
                                      ☑ {formatApprovalItemFullTitle(ci)}
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                      รายละเอียด: {ci.details || '-'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center justify-between mt-0.5">
                                      <span>
                                        ผู้รับผิดชอบ: {ci.responsiblePerson || '-'}
                                      </span>
                                      <span className="font-semibold text-blue-700">
                                        นัดตรวจ: {ci.inspectionDate || '-'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setViewingArchiveDoc(doc)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>เปิดดู / พิมพ์ / PDF</span>
                            </button>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleLoadDocForEdit(doc)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="แก้ไขใบขออนุมัติ"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDocToDelete(doc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="ลบใบขออนุมัติ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Viewing/Printing Saved Archive Document */}
      {viewingArchiveDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  ใบขออนุมัติตรวจสอบงานก่อสร้าง ({viewingArchiveDoc.docNumber}) —{' '}
                  {viewingArchiveDoc.branchName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  รหัสสาขา: {viewingArchiveDoc.branchCode} • พื้นที่:{' '}
                  {viewingArchiveDoc.area}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const doc = viewingArchiveDoc;
                    setViewingArchiveDoc(null);
                    handleLoadDocForEdit(doc);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  แก้ไขเอกสารนี้
                </button>
                <button
                  type="button"
                  onClick={() => setViewingArchiveDoc(null)}
                  className="text-slate-400 hover:text-white px-2 py-1 text-sm font-medium cursor-pointer"
                >
                  ✕ ปิดหน้าต่าง
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <DocumentActionButtons
                elementId="modal-seven-eleven-inspection-print"
                documentTitle={`B4-FM-04-01-19_${viewingArchiveDoc.branchName}`}
                fileName={`B4-FM-04-01-19_${viewingArchiveDoc.branchName}_${viewingArchiveDoc.docNumber}`}
                documentData={viewingArchiveDoc}
              />
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <DocumentZoomContainer
                defaultZoom={80}
                orientation="landscape"
                title={`ใบขออนุมัติตรวจสอบงานก่อสร้าง ${viewingArchiveDoc.branchName}`}
                badge="พร้อมพิมพ์ & ส่งออก"
                containerClassName="w-full"
              >
                <SevenElevenInspectionPrint
                  doc={viewingArchiveDoc}
                  containerId="modal-seven-eleven-inspection-print"
                />
              </DocumentZoomContainer>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!docToDelete}
        title="ยืนยันการลบใบขออนุมัติตรวจสอบงานก่อสร้าง"
        itemName={
          docToDelete
            ? `${docToDelete.docNumber} - สาขา ${docToDelete.branchName}`
            : undefined
        }
        description="คุณต้องการลบใบขออนุมัติฉบับนี้ใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้"
        confirmLabel="ลบเอกสาร"
        cancelLabel="ยกเลิก"
        onConfirm={() => {
          if (docToDelete) {
            onDeleteInspection(docToDelete.id);
            setDocToDelete(null);
          }
        }}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
};
