/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Subcontractor {
  id: string;
  name: string; // e.g. นายบรรเลง ร่องกล้า
  idCardNumber: string; // 13 digits: 1 1002 01884 92 0
  address: string; // e.g. 24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310
  phone: string;
  skillType: string; // e.g. งานเช่าเครื่องจักรและรถขุดดิน, งานโครงสร้าง, งานสี, งานปูกระเบื้อง
  bankName?: string;
  bankAccount?: string;
  idCardImage?: string; // Base64 data URL of the ID Card photo
  notes?: string;
  createdAt: string;
}

export type TaxWithholdingRate = 0 | 3;

export interface Receipt {
  id: string;
  receiptNumber: string; // e.g. REC-2569-001
  type: 'tax_0' | 'tax_3' | 'tax_3_retention_5';
  date: string; // YYYY-MM-DD
  subcontractorId: string;
  subcontractorName: string;
  subcontractorAddress: string;
  subcontractorIdCard: string;
  payerCompanyName: string; // default: บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด
  payerCompanyAddress: string; // default: 27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900
  paymentFor: string; // e.g. ค่าบริการเช่าเครื่องจักรและรถขุดดิน (หักภาษี 5%)
  projectId?: string;
  projectName?: string;
  
  // Financial calculation fields
  amount: number; // จำนวนเงิน (Gross amount)
  depositAdvance: number; // หักเงินมัดจำ/เบิกเงินล่วงหน้า
  amountBeforeTax: number; // จำนวนเงินก่อนภาษีหัก ณ ที่จ่าย
  taxRate: number; // 0, 3, etc.
  taxWithheld: number; // หักภาษี ณ ที่จ่าย
  amountAfterTax: number; // จำนวนเงินสุทธิหลังหักภาษี ณ ที่จ่าย
  
  // Retention fields (For 1.4)
  retentionRate: number; // e.g. 5%
  retentionAmount: number; // หัก Retention
  otherDeductions: number; // หักค่าสินค้า/ค่าใช้จ่ายอื่นๆ
  otherDeductionsNote?: string;
  netPayable: number; // จำนวนเงินสุทธิหลังหัก Retention/ค่าใช้จ่ายอื่นๆ
  
  amountThaiText: string; // จำนวนเงินตัวอักษร เช่น สี่หมื่นสามพันห้าร้อยห้าสิบบาทถ้วน
  
  signeeName: string;
  notes?: string;
  googleDriveFileId?: string;
  googleDriveLink?: string;
  createdAt: string;
}

export interface HandoverItem {
  id: string;
  description: string; // เช่น งวดที่ 1 งานโครงสร้างเทท็อปปิ้งแล้วเสร็จ
  unitPrice: number; // จำนวน/ราคาต่อหน่วย
  totalPrice: number; // รวมส่งมอบ
}

export interface HandoverDocument {
  id: string;
  docNumber: string; // e.g. HOD-2569-001
  date: string; // YYYY-MM-DD
  subject: string; // default: ขอส่งมอบงาน
  toRecipient: string; // default: กรรมการผู้จัดการ
  
  subcontractorId: string;
  subcontractorName: string;
  contractWorkType: string; // เช่น งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง
  
  projectId: string;
  projectName: string; // เช่น 7-11 ลาดกระบัง (สนามชัยเขต)
  poNumber: string; // เลขที่ใบสั่งซื้อ เช่น 2606-045
  poDate: string; // ลงวันที่
  completionDate: string; // แล้วเสร็จตั้งแต่วันที่
  periodNumber: number; // งวดที่ เช่น 1
  
  items: HandoverItem[];
  totalAmount: number;
  totalAmountThaiText: string;
  
  supervisorName: string; // นายปรวิทย์ นวลนาค
  supervisorCompany: string; // บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด
  supervisorConfirmedDate: string;
  
  engineerName?: string;
  approverName?: string;
  
  googleDriveFileId?: string;
  googleDriveLink?: string;
  createdAt: string;
}

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type MaterialOrderStatus = 'not_ordered' | 'ordered' | 'delivered';

export interface TaskMaterialItem {
  id: string;
  name: string; // ชื่อวัสดุ เช่น ปูนซีเมนต์ปอร์ตแลนด์, เหล็กข้ออ้อย DB12
  spec: string; // รายละเอียด / สเปค / ขนาด
  quantity: number; // จำนวน
  unit: string; // หน่วย เช่น ถุง, คิว, เส้น, แผ่น
  requiredDate?: string; // YYYY-MM-DD วันที่ต้องใช้หน้างาน
  status: MaterialOrderStatus; // ยังไม่สั่ง / สั่งแล้ว / ถึงหน้างานแล้ว
  notes?: string; // หมายเหตุ
}

export interface ProjectTask {
  id: string;
  projectId: string;
  groupName: string; // e.g. งานงวดที่ 1, งานงวดที่ 2, งานงวดที่ 3, SomJai Phase 2
  title: string; // e.g. 4.งานพื้น คสล. ชั้น 1, Install Fire Alarm system
  priority: TaskPriority;
  status: TaskStatus;
  completed: boolean;
  progressPercent?: number; // 0 - 100 (% ความคืบหน้าของกิจกรรม)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  completionDate?: string;
  ratingStars?: number; // 1-5 or 1-7
  commentsCount?: number;
  assignedTo?: string;
  teamCount?: number; // e.g. +4, +7, +2, +3
  workflowBadge?: string; // e.g. 'งานเสร็จเรียบร้อย', 'Completed', 'Pending', 'To do', 'ทีมออกแบบ เตรียมแบบ'
  hasSubArrow?: boolean; // e.g. true for Building 2, Building 1
  weightPercent?: number; // Weight in project (0-100)
  materials?: TaskMaterialItem[]; // รายการถอดวัสดุที่ใช้ในกิจกรรมนี้
}

export interface ProjectGroup {
  id: string;
  name: string; // เช่น งานงวดที่ 1, งานงวดที่ 2, SomJai Phase 2, SomJai Phase 1
  color?: string;
  weightPercent?: number; // % น้ำหนักของงวดงานเทียบทั้งโครงการ (0-100, รวมทุกงวด = 100%)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  assignedTo?: string;
  teamCount?: number; // e.g. +5, +6
  workflowBadge?: string; // e.g. 'ทีมขายติดต่อลูกค้า', 'To do', 'Completed', 'Pending'
}

export type ProjectStatus = 'in_progress' | 'completed' | 'delayed' | 'planned';

export interface Project {
  id: string;
  code: string; // e.g. PRJ-711-01
  name: string; // e.g. Project SomJai, 7-11 ไสวประชาราษฎร์ ซอย3 96.90%
  location?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  budget: number;
  status: ProjectStatus;
  supervisorName: string; // เช่น นายปรวิทย์ นวลนาค
  clientName?: string; // เช่น CP ALL
  isFollowed?: boolean; // โปรเจคที่ติดตาม vs โปรเจคที่เกี่ยวข้อง
  progress: number; // 0 - 100%
  teamCount?: number; // e.g. +12
  workflowBadge?: string; // e.g. 'ทีมออกแบบ เตรียมแบบ'
  groups: ProjectGroup[];
  groupsInitialized?: boolean;
  tasks: ProjectTask[];
  createdAt: string;
}

export interface LaborEntry {
  type: string; // เช่น ช่างไม้, ช่างปูน, ช่างเหล็ก, กรรมกร, ช่างเชื่อม, ช่างไฟฟ้า
  count: number;
}

export interface MachineryEntry {
  type: string; // เช่น รถแบคโฮ PC200, รถขุดเล็ก, รถบด, รถบรรทุกดิน 10 ล้อ, เครน, เครื่องปั่นไฟ
  count: number;
  status: 'working' | 'maintenance' | 'standby';
}

export interface DailyReportPhoto {
  id: string;
  url: string; // Base64 or image URL
  caption?: string; // คำอธิบายภาพถ่ายหน้างาน
}

export type DailyReportPhotoLayout = 'grid-2' | 'grid-3' | 'grid-4';

export interface DailyReport {
  id: string;
  reportNumber: string; // e.g. DLR-2569-001
  date: string; // YYYY-MM-DD
  projectId: string;
  projectName: string;
  weather: 'sunny' | 'cloudy' | 'rain' | 'heavy_rain';
  temperature?: string;
  
  // Selected project activities completed today
  selectedTaskIds: string[];
  activitiesDescription: string;
  
  // Labor count
  labors: LaborEntry[];
  totalLaborCount: number;
  
  // Machinery count
  machineries: MachineryEntry[];
  totalMachineryCount: number;
  
  // Progress & Notes
  todayProgressPercent: number;
  accumulatedProgressPercent: number;
  problemsAndIssues?: string;
  solutions?: string;
  safetyNotes?: string;
  reporterName: string;
  
  photos?: string[];
  photoItems?: DailyReportPhoto[];
  photoLayout?: DailyReportPhotoLayout;
  createdAt: string;
}

export type SevenElevenWeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'light_rain'
  | 'rain'
  | 'thunderstorm';

export interface SevenElevenDailyWeatherItem {
  dayOffset: number; // -3, -2, -1, 0 (วันนัดหมายตรวจตรงกลาง), +1, +2, +3
  dateLabel: string; // เช่น "12/9", "13/9", "14/9", "15/9", "16/9", "17/9", "18/9"
  dayNameShort: string; // เช่น "ศ.", "ส.", "อา.", "จ.", "อ.", "พ.", "พฤ."
  isInspectionDay?: boolean; // true สำหรับช่องตรงกลาง (dayOffset === 0)
  isRainy: boolean; // true = รูปเมฆฝน (วันที่ฝนตก), false = รูปเมฆพระอาทิตย์ (วันที่ไม่มีฝน)
  condition: SevenElevenWeatherCondition;
  rainProbability: number; // โอกาส/ปริมาณฝน (%)
  tempMin: number; // อุณหภูมิต่ำสุด (°C)
  tempMax: number; // อุณหภูมิสูงสุด (°C)
}

export interface SevenElevenWeatherForecast {
  enabled: boolean;
  province: string; // เช่น กรุงเทพมหานคร, ระยอง, ชลบุรี
  forecastDate: string; // วันที่นัดหมายตรวจ เช่น 15/9/69
  condition: SevenElevenWeatherCondition;
  conditionLabel: string; // เช่น แดดจัด / ท้องฟ้าแจ่มใส, มีเมฆบางส่วน, ฝนตก
  tempMax: number; // อุณหภูมิสูงสุด (°C)
  tempMin: number; // อุณหภูมิต่ำสุด (°C)
  rainProbability: number; // โอกาสเกิดฝน (%)
  dailyForecasts?: SevenElevenDailyWeatherItem[]; // พยากรณ์ 7 วัน (วันนัดหมายตรวจอยู่ตรงกลาง Index 3)
}

export interface SevenElevenBranch {
  id: string;
  branchName: string; // เช่น 7-11 สุขุมวิท66 จุด3
  branchCode: string; // เช่น 24045
  area: string; // เช่น BS
  province?: string; // เช่น กรุงเทพมหานคร, ระยอง
  contractorCompany: string; // เช่น ไม้ยืนต้น คอนสตรัคชั่น
  defaultSupervisor: string; // เช่น ปรวิทย์ นวลนาค
  defaultSupervisorSignature?: string; // Base64 PNG/JPG ลายเซ็นหัวหน้างานผู้รับผิดชอบเริ่มต้น
  notes?: string;
  createdAt: string;
}

export interface SevenElevenInspectionItem {
  itemNumber: number; // 1 - 10
  title: string;
  checked: boolean;
  details: string; // รายละเอียด (เช่น ตำแหน่ง , ปริมาณ หรือ จำนวน)
  responsiblePerson: string; // หัวหน้างานผู้รับผิดชอบ (โฟร์แมน หรือ วิศวกร ผรม.)
  inspectionDate: string; // วันที่นัดหมายตรวจ เช่น 15/9/69
  // Sub-options for item 4: งานโครงสร้าง พื้น คสล. / พื้น Topping / พื้น SV
  slabRc?: boolean;
  slabTopping?: boolean;
  slabSv?: boolean;
  // Sub-options for item 7: งานโครงสร้าง พื้น GS / พื้น Asphant ครั้งที่ ....
  groundGs?: boolean;
  groundAsphalt?: boolean;
  groundTimeNo?: string;
}

export type SevenElevenPhotoLayout =
  | 'layout-1'
  | 'layout-2'
  | 'layout-4'
  | 'layout-6';

export interface SevenElevenInspectionPhoto {
  id: string;
  url: string; // Base64 or image URL
  caption?: string; // คำอธิบายรูปภาพ / จุดที่ขออนุมัติ
  linkedItemNumber?: number | 'ALL'; // ผูกกับรายการอนุมัติข้อ 1-10 หรือ 'ALL' (รวมทุกรายการที่เลือก)
}

export interface SevenElevenInspectionDoc {
  id: string;
  docNumber: string; // e.g. B4-2569-001
  branchId: string;
  branchName: string;
  branchCode: string;
  area: string;
  contractorCompany: string;
  defaultSupervisor?: string; // หัวหน้างานผู้รับผิดชอบ (โฟร์แมน หรือ วิศวกร ผรม.) ค่าเริ่มต้น
  supervisorSignature?: string; // ลายเซ็นหัวหน้างานผู้รับผิดชอบ (ผู้ขออนุมัติ)
  items: SevenElevenInspectionItem[];
  weatherForecast?: SevenElevenWeatherForecast;
  photoItems?: SevenElevenInspectionPhoto[];
  photoLayout?: SevenElevenPhotoLayout;
  fullPagePhotoItems?: SevenElevenInspectionPhoto[];
  createdAt: string;
}

export interface LandSurveyPin {
  id: string;
  pinNumber: number; // 1, 2, 3, 4...
  label: string; // เช่น หมุดโฉนดที่ 1 (ทิศเหนือ), หลักเขต น.1234
  lat: number;
  lng: number;
  utmZone?: string; // เช่น 47P หรือ 48P
  utmEasting?: number; // พิกัดฉาก ตะวันออก (E)
  utmNorthing?: number; // พิกัดฉาก เหนือ (N)
  accuracyMeters?: number; // ความแม่นยำ GPS (± เมตร)
  checkedInBy: string; // ชื่อผู้เช็คอินปักหมุด
  checkedInAt: string; // ISO string หรือ วันเวลาที่เช็คอิน
  deedDistanceToNextMeters?: number; // ระยะตามใบโฉนดจากหมุดนี้ไปยังหมุดถัดไป (เมตร)
  photoUrl?: string; // รูปถ่ายหลักหมุด / สภาพหน้างาน ณ จุดเช็คอิน
  notes?: string;
}

export interface SiteAttendanceCheckin {
  id: string;
  personName: string; // ชื่อช่าง / โฟร์แมน / ผู้รับเหมา
  role?: string; // ตำแหน่ง / ทีมงาน
  lat: number;
  lng: number;
  accuracyMeters?: number;
  checkedInAt: string;
  isInsideBoundary: boolean; // ยืนอยู่ในเขตโฉนดหรือไม่
  distanceToBoundaryMeters: number; // ระยะห่างจากขอบแปลงที่ดิน (เมตร)
  photoUrl?: string;
  notes?: string;
}

export interface LandSurveyRecord {
  id: string;
  docNumber: string; // เช่น SRV-2569-001
  title: string; // ชื่อแปลงสำรวจ เช่น สำรวจโฉนดที่ดิน 7-11 ลาดกระบัง
  projectId?: string;
  projectName?: string;
  deedNumber: string; // เลขที่โฉนด เช่น 45892
  parcelNumber?: string; // เลขที่ดิน / หน้าสำรวจ
  location: string; // ตำบล/อำเภอ/จังหวัด
  surveyDate: string; // YYYY-MM-DD
  surveyorName: string; // ผู้สำรวจหลัก
  deedAreaRai?: number; // เนื้อที่ตามโฉนด (ไร่)
  deedAreaNgan?: number; // เนื้อที่ตามโฉนด (งาน)
  deedAreaSqWah?: number; // เนื้อที่ตามโฉนด (ตารางวา)
  isClosedPolygon: boolean; // ปิดรูปแปลงโฉนด (เชื่อมหมุดสุดท้ายกลับหมุดที่ 1)
  pins: LandSurveyPin[];
  attendanceCheckins?: SiteAttendanceCheckin[];
  notes?: string;
  createdAt: string;
}





