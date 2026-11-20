/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Building2,
  CalendarDays,
  ChevronDown,
  Cloud,
  UserPlus,
  Percent,
  ShieldCheck,
  ClipboardCheck,
  Database,
  BarChart2,
  Package,
  ListTodo,
  Store,
  CalendarRange,
  Compass,
} from 'lucide-react';

export type MainTab = 'receipts' | 'projects' | 'daily_report' | 'seven_eleven' | 'survey';

export type ReceiptSubTab =
  | '1.1_subcontractor'
  | '1.2_tax_0'
  | '1.4_tax_3_retention_5'
  | '1.5_handover'
  | '1.6_archive';

export type ProjectSubTab =
  | '2.1_projects_overview'
  | '2.2_tasks_kanban'
  | '2.3_material_takeoff'
  | '2.4_performance'
  | '2.5_general_workflow';

export type SevenElevenSubTab = '4.1_branch_info' | '4.2_inspection_form';

interface NavbarProps {
  activeMainTab: MainTab;
  setActiveMainTab: (tab: MainTab) => void;
  activeReceiptSubTab: ReceiptSubTab;
  setActiveReceiptSubTab: (sub: ReceiptSubTab) => void;
  activeProjectSubTab: ProjectSubTab;
  setActiveProjectSubTab: (sub: ProjectSubTab) => void;
  activeSevenElevenSubTab: SevenElevenSubTab;
  setActiveSevenElevenSubTab: (sub: SevenElevenSubTab) => void;
  onOpenGoogleWorkspace: () => void;
  isGoogleConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMainTab,
  setActiveMainTab,
  activeReceiptSubTab,
  setActiveReceiptSubTab,
  activeProjectSubTab,
  setActiveProjectSubTab,
  activeSevenElevenSubTab,
  setActiveSevenElevenSubTab,
  onOpenGoogleWorkspace,
  isGoogleConnected,
}) => {
  const [isReceiptMenuOpen, setIsReceiptMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isSevenElevenMenuOpen, setIsSevenElevenMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800 print:hidden font-sans">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setActiveMainTab('receipts')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center font-black text-xl tracking-wider text-white shadow-md">
              MYT
            </div>
            <div>
              <div className="font-bold text-base tracking-wide flex items-center space-x-2">
                <span>MYT Construction</span>
              </div>
              <p className="text-[11px] text-slate-400">
                ระบบจัดการงานก่อสร้าง & ใบเสร็จรับเงิน
              </p>
            </div>
          </div>

          {/* Main Menus Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* 1. เมนู ใบเสร็จ */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveMainTab('receipts');
                  setIsReceiptMenuOpen(!isReceiptMenuOpen);
                  setIsProjectMenuOpen(false);
                  setIsSevenElevenMenuOpen(false);
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeMainTab === 'receipts'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. เมนู ใบเสร็จ</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isReceiptMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown for Receipt Submenus */}
              {isReceiptMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsReceiptMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    เมนูย่อยระบบใบเสร็จ
                  </div>
                  <button
                    onClick={() => {
                      setActiveReceiptSubTab('1.1_subcontractor');
                      setActiveMainTab('receipts');
                      setIsReceiptMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeReceiptSubTab === '1.1_subcontractor'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span>1.1 เพิ่มข้อมูล ผรม.</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveReceiptSubTab('1.2_tax_0');
                      setActiveMainTab('receipts');
                      setIsReceiptMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeReceiptSubTab === '1.2_tax_0'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <Percent className="w-4 h-4 text-blue-500" />
                    <span>1.2 ใบเสร็จหัก 0-5%</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveReceiptSubTab('1.4_tax_3_retention_5');
                      setActiveMainTab('receipts');
                      setIsReceiptMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeReceiptSubTab === '1.4_tax_3_retention_5'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>1.3 ใบเสร็จหัก 3% + ประกันผลงาน 5%</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveReceiptSubTab('1.5_handover');
                      setActiveMainTab('receipts');
                      setIsReceiptMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeReceiptSubTab === '1.5_handover'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    <span>1.4 หนังสือส่งมอบงาน</span>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      setActiveReceiptSubTab('1.6_archive');
                      setActiveMainTab('receipts');
                      setIsReceiptMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeReceiptSubTab === '1.6_archive'
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-amber-600'
                    }`}
                  >
                    <Database className="w-4 h-4 text-amber-500" />
                    <span>1.6 คลังข้อมูล ผรม. ใบเสร็จ (Drive)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. เมนู โครงการ */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveMainTab('projects');
                  setIsProjectMenuOpen(!isProjectMenuOpen);
                  setIsReceiptMenuOpen(false);
                  setIsSevenElevenMenuOpen(false);
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeMainTab === 'projects'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>2. เมนู โครงการ</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isProjectMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown for Project Submenus */}
              {isProjectMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsProjectMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    เมนูย่อยระบบโครงการ
                  </div>
                  <button
                    onClick={() => {
                      setActiveProjectSubTab('2.1_projects_overview');
                      setActiveMainTab('projects');
                      setIsProjectMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeProjectSubTab === '2.1_projects_overview'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>2.1 ชื่อโครงการ กำหนดการเริ่ม-สิ้นสุด</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveProjectSubTab('2.2_tasks_kanban');
                      setActiveMainTab('projects');
                      setIsProjectMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeProjectSubTab === '2.2_tasks_kanban'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <ListTodo className="w-4 h-4 text-indigo-500" />
                    <span>2.2 เพิ่มกิจกรรมการทำงาน (ทาสก์/งวดงาน)</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveProjectSubTab('2.3_material_takeoff');
                      setActiveMainTab('projects');
                      setIsProjectMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeProjectSubTab === '2.3_material_takeoff'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <Package className="w-4 h-4 text-emerald-500" />
                    <span>2.3 ถอดวัสดุตามกิจกรรม</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveProjectSubTab('2.4_performance');
                      setActiveMainTab('projects');
                      setIsProjectMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-blue-50 hover:text-blue-600 ${
                      activeProjectSubTab === '2.4_performance'
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <BarChart2 className="w-4 h-4 text-purple-500" />
                    <span>2.4 กราฟแสดงผลงาน (S-Curve)</span>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      setActiveProjectSubTab('2.5_general_workflow');
                      setActiveMainTab('projects');
                      setIsProjectMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-emerald-50 hover:text-emerald-700 ${
                      activeProjectSubTab === '2.5_general_workflow'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 text-emerald-600" />
                    <span>2.5 General Workflow (ตารางแผนงาน)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. เมนูรายการงานประจำวัน */}
            <button
              onClick={() => {
                setActiveMainTab('daily_report');
                setIsReceiptMenuOpen(false);
                setIsProjectMenuOpen(false);
                setIsSevenElevenMenuOpen(false);
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                activeMainTab === 'daily_report'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>3. เมนูรายการงานประจำวัน</span>
            </button>

            {/* 4. เอกสาร 7-11 */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveMainTab('seven_eleven');
                  setIsSevenElevenMenuOpen(!isSevenElevenMenuOpen);
                  setIsReceiptMenuOpen(false);
                  setIsProjectMenuOpen(false);
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeMainTab === 'seven_eleven'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>4. เอกสาร 7-11</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isSevenElevenMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown for 7-11 Submenus */}
              {isSevenElevenMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsSevenElevenMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    เมนูย่อยระบบเอกสาร 7-11
                  </div>
                  <button
                    onClick={() => {
                      setActiveSevenElevenSubTab('4.1_branch_info');
                      setActiveMainTab('seven_eleven');
                      setIsSevenElevenMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-emerald-50 hover:text-emerald-700 ${
                      activeSevenElevenSubTab === '4.1_branch_info'
                        ? 'bg-emerald-50 text-emerald-700'
                        : ''
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>4.1 เพิ่มข้อมูลโครงการ</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSevenElevenSubTab('4.2_inspection_form');
                      setActiveMainTab('seven_eleven');
                      setIsSevenElevenMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-emerald-50 hover:text-emerald-700 ${
                      activeSevenElevenSubTab === '4.2_inspection_form'
                        ? 'bg-emerald-50 text-emerald-700'
                        : ''
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <span>4.2 ใบขออนุมัติตรวจสอบงานก่อสร้าง</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. งานสำรวจ */}
            <button
              onClick={() => {
                setActiveMainTab('survey');
                setIsReceiptMenuOpen(false);
                setIsProjectMenuOpen(false);
                setIsSevenElevenMenuOpen(false);
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                activeMainTab === 'survey'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>5. งานสำรวจ</span>
            </button>
          </nav>

          {/* Right Action: Google Workspace Connection Badge */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenGoogleWorkspace}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                isGoogleConnected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Google Drive, Sheets, Meet, Chat"
            >
              <Cloud className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Google Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submenu Quick Navigation Bar (Breadcrumb-like Subtabs) */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 py-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-2 min-w-max text-xs">
          {/* Mobile Main Menu Switcher */}
          <div className="flex md:hidden items-center space-x-1 pr-2 mr-2 border-r border-slate-800">
            <button
              onClick={() => setActiveMainTab('receipts')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                activeMainTab === 'receipts'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              1.ใบเสร็จ
            </button>
            <button
              onClick={() => setActiveMainTab('projects')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                activeMainTab === 'projects'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              2.โครงการ
            </button>
            <button
              onClick={() => setActiveMainTab('daily_report')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                activeMainTab === 'daily_report'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              3.งานประจำวัน
            </button>
            <button
              onClick={() => setActiveMainTab('seven_eleven')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                activeMainTab === 'seven_eleven'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              4.เอกสาร 7-11
            </button>
            <button
              onClick={() => setActiveMainTab('survey')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                activeMainTab === 'survey'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              5.งานสำรวจ
            </button>
          </div>

          {activeMainTab === 'receipts' && (
            <>
              <span className="text-slate-500 font-medium mr-1">เมนูใบเสร็จ:</span>
              <button
                onClick={() => setActiveReceiptSubTab('1.1_subcontractor')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeReceiptSubTab === '1.1_subcontractor'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                1.1 เพิ่มข้อมูล ผรม.
              </button>
              <button
                onClick={() => setActiveReceiptSubTab('1.2_tax_0')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeReceiptSubTab === '1.2_tax_0'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                1.2 ใบเสร็จหัก 0-5%
              </button>
              <button
                onClick={() => setActiveReceiptSubTab('1.4_tax_3_retention_5')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeReceiptSubTab === '1.4_tax_3_retention_5'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                1.3 ใบเสร็จหัก 3% + ประกันผลงาน 5%
              </button>
              <button
                onClick={() => setActiveReceiptSubTab('1.5_handover')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeReceiptSubTab === '1.5_handover'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                1.4 หนังสือส่งมอบงาน
              </button>
              <button
                onClick={() => setActiveReceiptSubTab('1.6_archive')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeReceiptSubTab === '1.6_archive'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                1.6 คลังข้อมูล ผรม. ใบเสร็จ (Drive)
              </button>
            </>
          )}

          {activeMainTab === 'projects' && (
            <>
              <span className="text-slate-500 font-medium mr-1">เมนูโครงการ:</span>
              <button
                onClick={() => setActiveProjectSubTab('2.1_projects_overview')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeProjectSubTab === '2.1_projects_overview'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                2.1 รายชื่อโครงการ & กำหนดการ
              </button>
              <button
                onClick={() => setActiveProjectSubTab('2.2_tasks_kanban')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeProjectSubTab === '2.2_tasks_kanban'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                2.2 กิจกรรมการทำงาน (ทาสก์/งวดงาน)
              </button>
              <button
                onClick={() => setActiveProjectSubTab('2.3_material_takeoff')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeProjectSubTab === '2.3_material_takeoff'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                2.3 ถอดวัสดุตามกิจกรรม
              </button>
              <button
                onClick={() => setActiveProjectSubTab('2.4_performance')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeProjectSubTab === '2.4_performance'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                2.4 กราฟแสดงผลงาน (S-Curve)
              </button>
              <button
                onClick={() => setActiveProjectSubTab('2.5_general_workflow')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                  activeProjectSubTab === '2.5_general_workflow'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>2.5 General Workflow (ตารางแผนงาน)</span>
              </button>
            </>
          )}

          {activeMainTab === 'daily_report' && (
            <>
              <span className="text-slate-500 font-medium mr-1">
                เมนูรายงานประจำวัน:
              </span>
              <span className="text-slate-300 font-medium">
                ดึงข้อมูลจาก (2.1) ชื่อโครงการ + (2.2) กิจกรรมการทำงาน + แนบรูปภาพหน้างาน + คลังรายงานแยกตามโครงการ
              </span>
            </>
          )}

          {activeMainTab === 'seven_eleven' && (
            <>
              <span className="text-slate-500 font-medium mr-1">
                เมนู 4. เอกสาร 7-11:
              </span>
              <button
                onClick={() => setActiveSevenElevenSubTab('4.1_branch_info')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeSevenElevenSubTab === '4.1_branch_info'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                4.1 เพิ่มข้อมูลโครงการ
              </button>
              <button
                onClick={() => setActiveSevenElevenSubTab('4.2_inspection_form')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeSevenElevenSubTab === '4.2_inspection_form'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                4.2 ใบขออนุมัติตรวจสอบงานก่อสร้าง
              </button>
            </>
          )}

          {activeMainTab === 'survey' && (
            <>
              <span className="text-slate-500 font-medium mr-1">
                เมนู 5. งานสำรวจ:
              </span>
              <span className="text-slate-300 font-medium">
                เช็คอินปักหมุดพิกัด GPS มือถือ · คำนวณระยะแต่ละด้านเทียบใบโฉนด · คำนวณเนื้อที่ ไร่-งาน-ตารางวา · ส่งออก PDF / Google Drive
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
