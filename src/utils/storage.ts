/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Subcontractor,
  Receipt,
  HandoverDocument,
  Project,
  DailyReport,
  SevenElevenBranch,
  SevenElevenInspectionDoc,
  SevenElevenInspectionItem,
  LandSurveyRecord,
} from '../types/types.ts';

const STORAGE_KEYS = {
  SUBCONTRACTORS: 'myt_subcontractors_v1',
  RECEIPTS: 'myt_receipts_v1',
  HANDOVERS: 'myt_handovers_v1',
  PROJECTS: 'myt_projects_v1',
  DAILY_REPORTS: 'myt_daily_reports_v1',
  SEVEN_ELEVEN_BRANCHES: 'myt_711_branches_v1',
  SEVEN_ELEVEN_INSPECTIONS: 'myt_711_inspections_v1',
  LAND_SURVEYS: 'myt_land_surveys_v1',
};

import { generateSampleIdCardDataUrl } from './sampleIdCard.ts';

// Initial Seed Data reflecting the user's screenshots
const INITIAL_SUBCONTRACTORS: Subcontractor[] = [
  {
    id: 'sub-banchuen',
    name: 'น.ส.บานชื่น แก้วพรหมตา',
    idCardNumber: '3 1898 00026 81 2',
    address: '145 หมู่ที่ 1 ต.ชัยนาท อ.เมืองชัยนาท จ.ชัยนาท',
    phone: '082-198-4455',
    skillType: 'จ้างเหมา ขัดหน้าปูน พื้นบ้าน',
    bankName: 'ธนาคารกรุงไทย',
    bankAccount: '124-0-55678-9',
    idCardImage: '/assets/aistudio/sample_id_card_banchuen.png',
    notes: 'ช่างขัดหน้าปูน ขัดมัน พื้นบ้าน และงานเทคอนกรีต',
    createdAt: '2026-07-31T09:00:00Z',
  },
  {
    id: 'sub-1',
    name: 'นายบรรเลง ร่องกล้า',
    idCardNumber: '1 1002 01884 92 0',
    address: '24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310',
    phone: '081-456-7890',
    skillType: 'ค่าบริการเช่าเครื่องจักรและรถขุดดิน (หักภาษี 5%)',
    bankName: 'ธนาคารกสิกรไทย',
    bankAccount: '023-2-89412-3',
    idCardImage: generateSampleIdCardDataUrl('นายบรรเลง ร่องกล้า', '1 1002 01884 92 0', '24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310'),
    notes: 'ชำนาญงานขุดดิน งานปรับพื้นที่ และเครื่องจักรกลหนัก',
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: 'sub-2',
    name: 'นายสมคิด ช่างก่อสร้าง',
    idCardNumber: '3 1012 00543 21 8',
    address: '15/4 หมู่ 3 ต.บางบัวทอง อ.บางบัวทอง จ.นนทบุรี 11110',
    phone: '089-987-6543',
    skillType: 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง',
    bankName: 'ธนาคารไทยพาณิชย์',
    bankAccount: '145-8-76543-1',
    idCardImage: generateSampleIdCardDataUrl('นายสมคิด ช่างก่อสร้าง', '3 1012 00543 21 8', '15/4 หมู่ 3 ต.บางบัวทอง อ.บางบัวทอง จ.นนทบุรี 11110'),
    notes: 'ทีมงานโครงสร้าง เทพื้น เสาคาน คสล.',
    createdAt: '2026-07-01T09:00:00Z',
  },
  {
    id: 'sub-3',
    name: 'นายอดุลย์ สีสวยงาม',
    idCardNumber: '1 4099 00123 45 6',
    address: '88/12 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กทม. 10260',
    phone: '086-333-2211',
    skillType: 'งานทาสี งานฝ้าเพดาน และงานปูกระเบื้อง',
    bankName: 'ธนาคารกรุงเทพ',
    bankAccount: '201-4-55566-7',
    idCardImage: generateSampleIdCardDataUrl('นายอดุลย์ สีสวยงาม', '1 4099 00123 45 6', '88/12 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กทม. 10260'),
    notes: 'งานสถาปัตย์ ตกแต่งผิว เก็บความเรียบร้อย',
    createdAt: '2026-08-15T14:30:00Z',
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'prj-1',
    code: '2606-045',
    name: '7-11 ลาดกระบัง (สนามชัยเขต)',
    location: 'ถ.ลาดกระบัง เขตลาดกระบัง กรุงเทพมหานคร',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    budget: 1850000,
    status: 'in_progress',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    clientName: 'บมจ. ซีพี ออลล์ (CP ALL)',
    isFollowed: true,
    progress: 75.5,
    teamCount: 12,
    workflowBadge: 'ทีมออกแบบ เตรียมแบบ',
    groups: [
      {
        id: 'grp-1',
        name: 'งานงวดที่ 1',
        weightPercent: 30,
        startDate: '2026-06-01',
        endDate: '2026-06-12',
        teamCount: 5,
        workflowBadge: 'งานเสร็จเรียบร้อย',
      },
      {
        id: 'grp-2',
        name: 'งานงวดที่ 2',
        weightPercent: 40,
        startDate: '2026-06-08',
        endDate: '2026-06-22',
        teamCount: 6,
        workflowBadge: 'Completed',
      },
      {
        id: 'grp-3',
        name: 'งานงวดที่ 3',
        weightPercent: 30,
        startDate: '2026-06-15',
        endDate: '2026-06-30',
        teamCount: 4,
        workflowBadge: 'To do',
      },
      {
        id: 'grp-4',
        name: 'งานเครื่องจักร',
        weightPercent: 0,
        startDate: '2026-06-02',
        endDate: '2026-06-18',
        teamCount: 3,
        workflowBadge: 'Pending',
      },
      {
        id: 'grp-5',
        name: 'คอนกรีต',
        weightPercent: 0,
        startDate: '2026-06-05',
        endDate: '2026-06-25',
        teamCount: 4,
        workflowBadge: 'In Progress',
      },
    ],
    tasks: [
      {
        id: 'tsk-1',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 1',
        title: '3.งานฐานราก-ตอม่อ-คาน (เตรียมเหล็กเสริมและคอนกรีต)',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        completionDate: '20 พ.ย. 2566',
        ratingStars: 5,
        commentsCount: 2,
        teamCount: 4,
        workflowBadge: 'งานเสร็จเรียบร้อย',
        weightPercent: 30,
      },
      {
        id: 'tsk-2',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 1',
        title: '4.งานพื้น คสล. ชั้น 1',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-05',
        endDate: '2026-06-10',
        completionDate: '28 พ.ย. 2566',
        ratingStars: 5,
        commentsCount: 2,
        teamCount: 7,
        workflowBadge: 'Completed',
        weightPercent: 40,
      },
      {
        id: 'tsk-3',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 1',
        title: '5.งานระบบประปาภายใน',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-07',
        endDate: '2026-06-12',
        completionDate: '27 พ.ย. 2566',
        ratingStars: 4,
        teamCount: 2,
        workflowBadge: 'Completed',
        weightPercent: 30,
      },
      {
        id: 'tsk-4',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 2',
        title: '9.งานผนังสำเร็จรูป I-SO Wall / งานก่ออิฐฉาบปูน+เสาเอ็นทับหลัง',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-08',
        endDate: '2026-06-16',
        completionDate: '19 ธ.ค. 2566',
        ratingStars: 5,
        teamCount: 5,
        workflowBadge: 'Completed',
        weightPercent: 30,
      },
      {
        id: 'tsk-5',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 2',
        title: '10.งานปูกระเบื้อง',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-12',
        endDate: '2026-06-19',
        completionDate: '19 ธ.ค. 2566',
        ratingStars: 4,
        teamCount: 3,
        workflowBadge: 'Completed',
        weightPercent: 25,
      },
      {
        id: 'tsk-6',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 2',
        title: '11.งานฝ้าเพดาน',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-14',
        endDate: '2026-06-21',
        completionDate: '19 ธ.ค. 2566',
        ratingStars: 4,
        teamCount: 3,
        workflowBadge: 'Completed',
        weightPercent: 25,
      },
      {
        id: 'tsk-7',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 2',
        title: '12.งานเฟรมกระจก พร้อมกระจก',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-16',
        endDate: '2026-06-22',
        completionDate: '19 ธ.ค. 2566',
        ratingStars: 4,
        teamCount: 4,
        workflowBadge: 'Completed',
        weightPercent: 20,
      },
      {
        id: 'tsk-8',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 3',
        title: '15.งานสุขภัณฑ์ ผนังห้องน้ำ',
        priority: 'Medium',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-15',
        endDate: '2026-06-23',
        completionDate: '16 ม.ค. 2567',
        ratingStars: 4,
        teamCount: 2,
        workflowBadge: 'Completed',
        weightPercent: 35,
      },
      {
        id: 'tsk-9',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 3',
        title: '19.งานเก็บทำความสะอาด',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-20',
        endDate: '2026-06-26',
        completionDate: '16 ม.ค. 2567',
        ratingStars: 5,
        teamCount: 3,
        workflowBadge: 'Completed',
        weightPercent: 25,
      },
      {
        id: 'tsk-10',
        projectId: 'prj-1',
        groupName: 'งานงวดที่ 3',
        title: '20.ส่งมอบงาน CQA',
        priority: 'High',
        status: 'in_progress',
        completed: false,
        progressPercent: 50,
        startDate: '2026-06-22',
        endDate: '2026-06-30',
        teamCount: 3,
        workflowBadge: 'Pending',
        weightPercent: 40,
      },
    ],
    createdAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'prj-somjai',
    code: 'PRJ-SOMJAI-01',
    name: 'Project SomJai',
    location: 'กรุงเทพมหานคร',
    startDate: '2026-05-27',
    endDate: '2026-06-30',
    budget: 4500000,
    status: 'in_progress',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    clientName: 'SomJai Development',
    isFollowed: true,
    progress: 60,
    teamCount: 12,
    workflowBadge: 'ทีมออกแบบ เตรียมแบบ',
    groupsInitialized: true,
    groups: [
      {
        id: 'sj-grp-2',
        name: 'SomJai Phase 2',
        weightPercent: 60,
        startDate: '2026-06-25',
        endDate: '2026-07-15',
        teamCount: 5,
        workflowBadge: 'ทีมขายติดต่อลูกค้า',
      },
      {
        id: 'sj-grp-1',
        name: 'SomJai Phase 1',
        weightPercent: 40,
        startDate: '2026-05-27',
        endDate: '2026-06-30',
        teamCount: 6,
        workflowBadge: 'To do',
      },
    ],
    tasks: [
      {
        id: 'sj-tsk-1',
        projectId: 'prj-somjai',
        groupName: 'SomJai Phase 2',
        title: 'Install Fire Alarm system',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-25',
        endDate: '2026-07-05',
        assignedTo: 'นายปรวิทย์ นวลนาค',
        teamCount: 4,
        workflowBadge: 'งานเสร็จเรียบร้อย',
        weightPercent: 30,
      },
      {
        id: 'sj-tsk-2',
        projectId: 'prj-somjai',
        groupName: 'SomJai Phase 2',
        title: 'Install Prestressed Concrete Stub',
        priority: 'High',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-06-28',
        endDate: '2026-07-10',
        assignedTo: 'นายปรวิทย์ นวลนาค',
        teamCount: 7,
        workflowBadge: 'Completed',
        weightPercent: 40,
      },
      {
        id: 'sj-tsk-3',
        projectId: 'prj-somjai',
        groupName: 'SomJai Phase 2',
        title: 'Production Prestressed Concrete Stub',
        priority: 'Medium',
        status: 'completed',
        completed: true,
        progressPercent: 100,
        startDate: '2026-07-01',
        endDate: '2026-07-15',
        assignedTo: 'นายปรวิทย์ นวลนาค',
        teamCount: 2,
        workflowBadge: 'Completed',
        weightPercent: 30,
      },
      {
        id: 'sj-tsk-4',
        projectId: 'prj-somjai',
        groupName: 'SomJai Phase 1',
        title: 'Building 2',
        priority: 'High',
        status: 'pending',
        completed: false,
        progressPercent: 30,
        startDate: '2026-06-05',
        endDate: '2026-06-30',
        assignedTo: 'นายปรวิทย์ นวลนาค',
        teamCount: 0,
        workflowBadge: 'Pending',
        hasSubArrow: true,
        weightPercent: 50,
      },
      {
        id: 'sj-tsk-5',
        projectId: 'prj-somjai',
        groupName: 'SomJai Phase 1',
        title: 'Building 1',
        priority: 'High',
        status: 'pending',
        completed: false,
        progressPercent: 45,
        startDate: '2026-05-27',
        endDate: '2026-06-30',
        assignedTo: 'นายปรวิทย์ นวลนาค',
        teamCount: 3,
        workflowBadge: 'Pending',
        hasSubArrow: true,
        weightPercent: 50,
      },
    ],
    createdAt: '2026-10-05T08:00:00Z',
  },
  {
    id: 'prj-2',
    code: 'PRJ-711-SW',
    name: '7-11 ไสวประชาราษฎร์ ซอย3 96.90%',
    location: 'ซอยไสวประชาราษฎร์ 3 ลำลูกกา ปทุมธานี',
    startDate: '2026-08-01',
    endDate: '2026-11-20',
    budget: 2100000,
    status: 'in_progress',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    clientName: 'บมจ. ซีพี ออลล์',
    isFollowed: true,
    progress: 96.9,
    groups: [
      { id: 'g1', name: 'งานงวดที่ 1' },
      { id: 'g2', name: 'งานงวดที่ 2' },
      { id: 'g3', name: 'งานงวดที่ 3' },
    ],
    tasks: [],
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'prj-3',
    code: 'PRJ-711-PK',
    name: '7-11 เพชรเกษมธานี คะแนน97.72%',
    location: 'ถ.เพชรเกษม กรุงเทพมหานคร',
    startDate: '2026-07-10',
    endDate: '2026-10-25',
    budget: 1950000,
    status: 'completed',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    isFollowed: false,
    progress: 100,
    groups: [],
    tasks: [],
    createdAt: '2026-07-10T08:00:00Z',
  },
  {
    id: 'prj-4',
    code: 'PRJ-711-NK',
    name: '7-11 เลียบฯใต้หนองแขม 96.27%',
    location: 'เลียบคลองภาษีเจริญฝั่งใต้ หนองแขม',
    startDate: '2026-07-20',
    endDate: '2026-10-30',
    budget: 1800000,
    status: 'completed',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    isFollowed: false,
    progress: 100,
    groups: [],
    tasks: [],
    createdAt: '2026-07-20T08:00:00Z',
  },
  {
    id: 'prj-5',
    code: 'PRJ-BLN-SK',
    name: 'เบลลินี่ สระแก้ว 96%',
    location: 'อ.เมือง จ.สระแก้ว',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    budget: 1650000,
    status: 'in_progress',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    isFollowed: false,
    progress: 96.0,
    groups: [],
    tasks: [],
    createdAt: '2026-09-01T08:00:00Z',
  },
];

const INITIAL_RECEIPTS: Receipt[] = [
  {
    id: 'rec-banchuen-1',
    receiptNumber: 'REC-2569-018',
    type: 'tax_3',
    date: '2026-07-31',
    subcontractorId: 'sub-banchuen',
    subcontractorName: 'น.ส.บานชื่น แก้วพรหมตา',
    subcontractorAddress: '145 หมู่ที่ 1 ต.ชัยนาท อ.เมืองชัยนาท จ.ชัยนาท',
    subcontractorIdCard: '3 1898 00026 81 2',
    payerCompanyName: 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด',
    payerCompanyAddress: '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900',
    paymentFor: 'จ้างเหมา ขัดหน้าปูน พื้นบ้าน',
    amount: 4000,
    depositAdvance: 0,
    amountBeforeTax: 4000,
    taxRate: 3,
    taxWithheld: 120,
    amountAfterTax: 3880,
    retentionRate: 0,
    retentionAmount: 0,
    otherDeductions: 0,
    netPayable: 3880,
    amountThaiText: 'สามพันแปดร้อยแปดสิบบาทถ้วน',
    signeeName: 'น.ส.บานชื่น แก้วพรหมตา',
    createdAt: '2026-07-31T10:00:00Z',
  },
  {
    id: 'rec-1',
    receiptNumber: 'REC-2569-001',
    type: 'tax_0',
    date: '2026-06-25',
    subcontractorId: 'sub-1',
    subcontractorName: 'นายบรรเลง ร่องกล้า',
    subcontractorAddress: '24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310',
    subcontractorIdCard: '1 1002 01884 92 0',
    payerCompanyName: 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด',
    payerCompanyAddress: '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900',
    paymentFor: 'ค่าบริการเช่าเครื่องจักรและรถขุดดิน (หักภาษี 0%)',
    amount: 45000,
    depositAdvance: 0,
    amountBeforeTax: 45000,
    taxRate: 0,
    taxWithheld: 0,
    amountAfterTax: 45000,
    retentionRate: 0,
    retentionAmount: 0,
    otherDeductions: 0,
    netPayable: 45000,
    amountThaiText: 'สี่หมื่นห้าพันบาทถ้วน',
    signeeName: 'นายบรรเลง ร่องกล้า',
    createdAt: '2026-06-25T11:00:00Z',
  },
  {
    id: 'rec-2',
    receiptNumber: 'REC-2569-002',
    type: 'tax_3',
    date: '2026-06-25',
    subcontractorId: 'sub-1',
    subcontractorName: 'นายบรรเลง ร่องกล้า',
    subcontractorAddress: '24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310',
    subcontractorIdCard: '1 1002 01884 92 0',
    payerCompanyName: 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด',
    payerCompanyAddress: '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900',
    paymentFor: 'ค่าบริการเช่าเครื่องจักรและรถขุดดิน (หักภาษี 3%)',
    amount: 45000,
    depositAdvance: 0,
    amountBeforeTax: 45000,
    taxRate: 3,
    taxWithheld: 1350,
    amountAfterTax: 43650,
    retentionRate: 0,
    retentionAmount: 0,
    otherDeductions: 0,
    netPayable: 43650,
    amountThaiText: 'สี่หมื่นสามพันห้าร้อยห้าสิบบาทถ้วน',
    signeeName: 'นายบรรเลง ร่องกล้า',
    createdAt: '2026-06-25T14:00:00Z',
  },
  {
    id: 'rec-3',
    receiptNumber: 'REC-2569-003',
    type: 'tax_3_retention_5',
    date: '2026-06-25',
    subcontractorId: 'sub-1',
    subcontractorName: 'นายบรรเลง ร่องกล้า',
    subcontractorAddress: '24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310',
    subcontractorIdCard: '1 1002 01884 92 0',
    payerCompanyName: 'บริษัท ไม้ยืนต้น คอนสตรัคชั่น จำกัด',
    payerCompanyAddress: '27/2 ซอยพหลโยธิน 24 แยก 2-1 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม.10900',
    paymentFor: 'ค่าบริการเช่าเครื่องจักรและรถขุดดิน (หักภาษี 3% พร้อมหัก Retention 5%)',
    amount: 45000,
    depositAdvance: 0,
    amountBeforeTax: 45000,
    taxRate: 3,
    taxWithheld: 1350,
    amountAfterTax: 43650,
    retentionRate: 5,
    retentionAmount: 2250,
    otherDeductions: 0,
    netPayable: 41400,
    amountThaiText: 'สี่หมื่นหนึ่งพันสี่ร้อยบาทถ้วน',
    signeeName: 'นายบรรเลง ร่องกล้า',
    createdAt: '2026-06-25T16:00:00Z',
  },
];

const INITIAL_HANDOVERS: HandoverDocument[] = [
  {
    id: 'hod-1',
    docNumber: 'HOD-2569-001',
    date: '2026-11-10',
    subject: 'ขอส่งมอบงาน',
    toRecipient: 'กรรมการผู้จัดการ',
    subcontractorId: 'sub-2',
    subcontractorName: 'นายสมคิด ช่างก่อสร้าง',
    contractWorkType: 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง',
    projectId: 'prj-1',
    projectName: '7-11 ลาดกระบัง (สนามชัยเขต)',
    poNumber: '2606-045',
    poDate: '2026-11-10',
    completionDate: '2026-11-10',
    periodNumber: 1,
    items: [
      {
        id: 'itm-1',
        description: 'งวดที่ 1 งานโครงสร้างเทท็อปปิ้งแล้วเสร็จ',
        unitPrice: 51546.39,
        totalPrice: 51546.39,
      },
    ],
    totalAmount: 51546.39,
    totalAmountThaiText: 'ห้าหมื่นหนึ่งพันห้าร้อยสี่สิบหกบาทสามสิบเก้าสตางค์',
    supervisorName: 'นายปรวิทย์ นวลนาค',
    supervisorCompany: 'บริษัท ไม้ยืนต้นคอนสตรัคชั่น จำกัด',
    supervisorConfirmedDate: '2026-11-10',
    engineerName: 'นายช่างวิศวกรโยธา',
    approverName: 'กรรมการผู้จัดการ',
    createdAt: '2026-11-10T11:00:00Z',
  },
];

const INITIAL_DAILY_REPORTS: DailyReport[] = [
  {
    id: 'dlr-1',
    reportNumber: 'DLR-2569-001',
    date: '2026-11-10',
    projectId: 'prj-1',
    projectName: '7-11 ลาดกระบัง (สนามชัยเขต)',
    weather: 'sunny',
    temperature: '33°C',
    selectedTaskIds: ['tsk-1', 'tsk-2'],
    activitiesDescription: 'เทคอนกรีตพื้น คสล. ชั้น 1 และเตรียมเหล็กเสริมฐานราก',
    labors: [
      { type: 'ช่างปูน/เทคอนกรีต', count: 6 },
      { type: 'ช่างเหล็ก/ผูกเหล็ก', count: 4 },
      { type: 'ช่างไม้/แบบหล่อ', count: 3 },
      { type: 'กรรมกรทั่วไป', count: 5 },
    ],
    totalLaborCount: 18,
    machineries: [
      { type: 'รถโม่ปูนคอนกรีตผสมเสร็จ', count: 4, status: 'working' },
      { type: 'รถปั๊มคอนกรีตบูมยาว', count: 1, status: 'working' },
      { type: 'เครื่องจี้คอนกรีต (Vibrator)', count: 3, status: 'working' },
      { type: 'รถขุดดิน PC30', count: 1, status: 'standby' },
    ],
    totalMachineryCount: 9,
    todayProgressPercent: 5.5,
    accumulatedProgressPercent: 75.5,
    problemsAndIssues: 'การจราจรหน้าหน่วยงานติดขัดเล็กน้อยช่วงรถโม่เข้า แต่ประสานงานเจ้าหน้าที่เรียบร้อย',
    solutions: 'จัดเจ้าหน้าที่โบกธงจราจรหน้าทางเข้าโครงการ',
    safetyNotes: 'สวมใส่อุปกรณ์ PPE ครบถ้วน 100% ไม่มีอุบัติเหตุ',
    reporterName: 'นายปรวิทย์ นวลนาค',
    createdAt: '2026-11-10T17:00:00Z',
  },
];

// Helper functions for persistent local storage
export function getSubcontractors(): Subcontractor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBCONTRACTORS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBCONTRACTORS, JSON.stringify(INITIAL_SUBCONTRACTORS));
      return INITIAL_SUBCONTRACTORS;
    }
    const parsed: Subcontractor[] = JSON.parse(raw);
    let updated = false;

    // Ensure น.ส.บานชื่น แก้วพรหมตา is present
    const banchuenIdx = parsed.findIndex((s) => s.id === 'sub-banchuen' || s.name.includes('บานชื่น'));
    if (banchuenIdx === -1) {
      parsed.unshift(INITIAL_SUBCONTRACTORS[0]);
      updated = true;
    } else {
      if (!parsed[banchuenIdx].idCardImage || parsed[banchuenIdx].idCardImage.startsWith('data:image/svg')) {
        parsed[banchuenIdx].idCardImage = '/assets/aistudio/sample_id_card_banchuen.png';
        updated = true;
      }
    }

    const enriched = parsed.map((sub) => {
      if (!sub.idCardImage && sub.name) {
        updated = true;
        return {
          ...sub,
          idCardImage: generateSampleIdCardDataUrl(sub.name, sub.idCardNumber || '1 1002 01884 92 0', sub.address || 'กทม.'),
        };
      }
      return sub;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.SUBCONTRACTORS, JSON.stringify(enriched));
    }
    return enriched;
  } catch {
    return INITIAL_SUBCONTRACTORS;
  }
}

export function saveSubcontractors(data: Subcontractor[]): void {
  localStorage.setItem(STORAGE_KEYS.SUBCONTRACTORS, JSON.stringify(data));
}

export function getReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(INITIAL_RECEIPTS));
      return INITIAL_RECEIPTS;
    }
    const parsed: Receipt[] = JSON.parse(raw);
    const hasBanchuenRec = parsed.some((r) => r.id === 'rec-banchuen-1' || r.subcontractorName.includes('บานชื่น'));
    if (!hasBanchuenRec) {
      parsed.unshift(INITIAL_RECEIPTS[0]);
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_RECEIPTS;
  }
}

export function saveReceipts(data: Receipt[]): void {
  localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(data));
}

function normalizeLegacySupervisorSpelling(key: string, raw: string): string {
  if (raw.includes('ปริวิทย์')) {
    const fixed = raw.replace(/ปริวิทย์/g, 'ปรวิทย์');
    localStorage.setItem(key, fixed);
    return fixed;
  }
  return raw;
}

export function getHandovers(): HandoverDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HANDOVERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.HANDOVERS, JSON.stringify(INITIAL_HANDOVERS));
      return INITIAL_HANDOVERS;
    }
    return JSON.parse(normalizeLegacySupervisorSpelling(STORAGE_KEYS.HANDOVERS, raw));
  } catch {
    return INITIAL_HANDOVERS;
  }
}

export function saveHandovers(data: HandoverDocument[]): void {
  localStorage.setItem(STORAGE_KEYS.HANDOVERS, JSON.stringify(data));
}

export function getProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    let parsed: Project[] = JSON.parse(
      normalizeLegacySupervisorSpelling(STORAGE_KEYS.PROJECTS, raw)
    );
    let updated = false;

    const somjaiSample = INITIAL_PROJECTS.find((p) => p.id === 'prj-somjai');
    if (somjaiSample && !parsed.some((p) => p.id === 'prj-somjai')) {
      parsed.unshift(somjaiSample);
      updated = true;
    }

    // Backfill default group weights and missing startDate/endDate on seed projects
    parsed = parsed.map((proj) => {
      const seed = INITIAL_PROJECTS.find((ip) => ip.id === proj.id);
      if (!seed) return proj;

      let projChanged = false;
      let nextStartDate = proj.startDate;
      let nextEndDate = proj.endDate;

      if (!nextStartDate || nextStartDate.startsWith('2023-')) {
        nextStartDate = seed.startDate;
        nextEndDate = seed.endDate;
        projChanged = true;
      }

      const allGroupsMissingWeights =
        proj.groups &&
        proj.groups.length > 0 &&
        proj.groups.every((g) => g.weightPercent === undefined);

      const nextGroups = (proj.groups || seed.groups || []).map((g) => {
        const sg = seed.groups.find((x) => x.id === g.id || x.name === g.name);
        if (!sg) return g;
        let gUpdated = { ...g };
        if (allGroupsMissingWeights && gUpdated.weightPercent === undefined) {
          gUpdated.weightPercent = sg.weightPercent;
          projChanged = true;
        }
        if (!gUpdated.startDate && sg.startDate) {
          gUpdated.startDate = sg.startDate;
          projChanged = true;
        }
        if (!gUpdated.endDate && sg.endDate) {
          gUpdated.endDate = sg.endDate;
          projChanged = true;
        }
        return gUpdated;
      });

      const nextTasks = (proj.tasks || []).map((t) => {
        const st = seed.tasks.find((x) => x.id === t.id || x.title === t.title);
        if (!st) return t;
        let tUpdated = { ...t };
        if (allGroupsMissingWeights && tUpdated.weightPercent === undefined) {
          tUpdated.weightPercent = st.weightPercent;
          projChanged = true;
        }
        if (!tUpdated.startDate && st.startDate) {
          tUpdated.startDate = st.startDate;
          projChanged = true;
        }
        if (!tUpdated.endDate && st.endDate) {
          tUpdated.endDate = st.endDate;
          projChanged = true;
        }
        return tUpdated;
      });

      if (projChanged) {
        updated = true;
        return {
          ...proj,
          startDate: nextStartDate,
          endDate: nextEndDate,
          groups: nextGroups,
          tasks: nextTasks,
        };
      }
      return proj;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveProjects(data: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(data));
}

export function getDailyReports(): DailyReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_REPORTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DAILY_REPORTS, JSON.stringify(INITIAL_DAILY_REPORTS));
      return INITIAL_DAILY_REPORTS;
    }
    return JSON.parse(normalizeLegacySupervisorSpelling(STORAGE_KEYS.DAILY_REPORTS, raw));
  } catch {
    return INITIAL_DAILY_REPORTS;
  }
}

export function saveDailyReports(data: DailyReport[]): void {
  localStorage.setItem(STORAGE_KEYS.DAILY_REPORTS, JSON.stringify(data));
}

export function createDefault711InspectionItems(): SevenElevenInspectionItem[] {
  return [
    {
      itemNumber: 1,
      title: 'งานเสาเข็มเยื้องศูนย์',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 2,
      title: 'งานโครงสร้างฐานราก หรืองานฐานรากสำเร็จรูป',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 3,
      title: 'งานโครงสร้างคานคอดิน หรืองาน Precast Beam',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 4,
      title: 'งานโครงสร้าง',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
      slabRc: false,
      slabTopping: false,
      slabSv: false,
    },
    {
      itemNumber: 5,
      title: 'งานโครงสร้างคานรับผนัง',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 6,
      title: 'งานโครงเหล็กหลังคา (ก่อนติดตั้ง)',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 7,
      title: 'งานโครงสร้าง',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
      groundGs: false,
      groundAsphalt: false,
      groundTimeNo: '',
    },
    {
      itemNumber: 8,
      title: 'สมอบก',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 9,
      title: 'ฐานเสา Pole Sign',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
    {
      itemNumber: 10,
      title: 'คานกำแพงกันดิน',
      checked: false,
      details: '',
      responsiblePerson: '',
      inspectionDate: '',
    },
  ];
}

const INITIAL_711_BRANCHES: SevenElevenBranch[] = [
  {
    id: 'br711-1',
    branchName: '7-11 สุขุมวิท66 จุด3',
    branchCode: '24045',
    area: 'BS',
    contractorCompany: 'ไม้ยืนต้น คอนสตรัคชั่น',
    defaultSupervisor: 'ปรวิทย์ นวลนาค',
    notes: 'โครงการก่อสร้างสาขา 7-11 สุขุมวิท 66 จุด 3',
    createdAt: '2026-09-01T08:00:00Z',
  },
];

const INITIAL_711_INSPECTIONS: SevenElevenInspectionDoc[] = [
  {
    id: 'insp711-1',
    docNumber: 'B4-2569-001',
    branchId: 'br711-1',
    branchName: '7-11 สุขุมวิท66 จุด3',
    branchCode: '24045',
    area: 'BS',
    contractorCompany: 'ไม้ยืนต้น คอนสตรัคชั่น',
    defaultSupervisor: 'ปรวิทย์ นวลนาค',
    items: createDefault711InspectionItems().map((it) =>
      it.itemNumber === 9
        ? {
            ...it,
            checked: true,
            details: 'คอนกรีต 240Cu. จำนวน 3ลบ.ม.',
            responsiblePerson: 'ปรวิทย์ นวลนาค',
            inspectionDate: '15/9/69',
          }
        : it
    ),
    createdAt: '2026-09-15T09:00:00Z',
  },
];

export function getSevenElevenBranches(): SevenElevenBranch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEVEN_ELEVEN_BRANCHES);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.SEVEN_ELEVEN_BRANCHES,
        JSON.stringify(INITIAL_711_BRANCHES)
      );
      return INITIAL_711_BRANCHES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_711_BRANCHES;
  }
}

export function saveSevenElevenBranches(data: SevenElevenBranch[]): void {
  localStorage.setItem(STORAGE_KEYS.SEVEN_ELEVEN_BRANCHES, JSON.stringify(data));
}

export function getSevenElevenInspections(): SevenElevenInspectionDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEVEN_ELEVEN_INSPECTIONS);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.SEVEN_ELEVEN_INSPECTIONS,
        JSON.stringify(INITIAL_711_INSPECTIONS)
      );
      return INITIAL_711_INSPECTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_711_INSPECTIONS;
  }
}

export function saveSevenElevenInspections(data: SevenElevenInspectionDoc[]): void {
  localStorage.setItem(
    STORAGE_KEYS.SEVEN_ELEVEN_INSPECTIONS,
    JSON.stringify(data)
  );
}

const INITIAL_LAND_SURVEYS: LandSurveyRecord[] = [
  {
    id: 'srv-1',
    docNumber: 'SRV-2569-001',
    title: 'สำรวจเช็คระยะโฉนด 7-11 ลาดกระบัง (สนามชัยเขต)',
    projectId: 'prj-1',
    projectName: '7-11 ลาดกระบัง (สนามชัยเขต)',
    deedNumber: '58412',
    parcelNumber: 'เลขที่ดิน 114 หน้าสำรวจ 4820',
    location: 'ถ.ลาดกระบัง เขตลาดกระบัง กรุงเทพมหานคร',
    surveyDate: '2026-11-19',
    surveyorName: 'นายปรวิทย์ นวลนาค',
    deedAreaRai: 0,
    deedAreaNgan: 2,
    deedAreaSqWah: 25,
    isClosedPolygon: true,
    pins: [
      {
        id: 'pin-1',
        pinNumber: 1,
        label: 'หมุดที่ 1 (มุมทิศตะวันตกเฉียงเหนือ - ติดถนนลาดกระบัง)',
        lat: 13.72795,
        lng: 100.74815,
        utmZone: '47P',
        utmEasting: 689051.4,
        utmNorthing: 1518224.2,
        accuracyMeters: 2.4,
        checkedInBy: 'นายปรวิทย์ นวลนาค',
        checkedInAt: '2026-11-19T08:45:00Z',
        deedDistanceToNextMeters: 30.0,
        notes: 'พบหลักหมุดคอนกรีตกรมที่ดินชัดเจน',
      },
      {
        id: 'pin-2',
        pinNumber: 2,
        label: 'หมุดที่ 2 (มุมทิศตะวันออกเฉียงเหนือ - ติดถนนลาดกระบัง)',
        lat: 13.72795,
        lng: 100.748428,
        utmZone: '47P',
        utmEasting: 689081.5,
        utmNorthing: 1518224.4,
        accuracyMeters: 2.1,
        checkedInBy: 'นายปรวิทย์ นวลนาค',
        checkedInAt: '2026-11-19T08:52:00Z',
        deedDistanceToNextMeters: 30.0,
        notes: 'หลักหมุดอยู่ชิดเสาไฟฟ้าด้านหน้า',
      },
      {
        id: 'pin-3',
        pinNumber: 3,
        label: 'หมุดที่ 3 (มุมทิศตะวันออกเฉียงใต้ - ด้านหลังแปลง)',
        lat: 13.727679,
        lng: 100.748428,
        utmZone: '47P',
        utmEasting: 689081.7,
        utmNorthing: 1518194.4,
        accuracyMeters: 2.8,
        checkedInBy: 'นายปรวิทย์ นวลนาค',
        checkedInAt: '2026-11-19T09:01:00Z',
        deedDistanceToNextMeters: 30.0,
        notes: 'แนวรั้วเดิมข้างเคียงตรงตามระยะโฉนด',
      },
      {
        id: 'pin-4',
        pinNumber: 4,
        label: 'หมุดที่ 4 (มุมทิศตะวันตกเฉียงใต้ - ด้านหลังแปลง)',
        lat: 13.727679,
        lng: 100.74815,
        utmZone: '47P',
        utmEasting: 689051.6,
        utmNorthing: 1518194.2,
        accuracyMeters: 2.5,
        checkedInBy: 'นายปรวิทย์ นวลนาค',
        checkedInAt: '2026-11-19T09:10:00Z',
        deedDistanceToNextMeters: 30.0,
        notes: 'หลักหมุดเสมอผิวดินเดิม',
      },
    ],
    attendanceCheckins: [
      {
        id: 'att-1',
        personName: 'นายปรวิทย์ นวลนาค',
        role: 'วิศวกรผู้ควบคุมงาน',
        lat: 13.727815,
        lng: 100.748289,
        accuracyMeters: 2.2,
        checkedInAt: '2026-11-19T08:40:00Z',
        isInsideBoundary: true,
        distanceToBoundaryMeters: 0,
        notes: 'เช็คอินเริ่มงานสำรวจวางผังบริเวณกลางแปลงที่ดิน',
      },
    ],
    notes: 'ตรวจสอบระยะทั้ง 4 ด้านเทียบกับโฉนดเลขที่ 58412 อยู่ในเกณฑ์ปกติ',
    createdAt: '2026-11-19T09:15:00Z',
  },
];

export function getLandSurveys(): LandSurveyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAND_SURVEYS);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.LAND_SURVEYS,
        JSON.stringify(INITIAL_LAND_SURVEYS)
      );
      return INITIAL_LAND_SURVEYS;
    }
    return JSON.parse(normalizeLegacySupervisorSpelling(STORAGE_KEYS.LAND_SURVEYS, raw));
  } catch {
    return INITIAL_LAND_SURVEYS;
  }
}

export function saveLandSurveys(data: LandSurveyRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.LAND_SURVEYS, JSON.stringify(data));
}


