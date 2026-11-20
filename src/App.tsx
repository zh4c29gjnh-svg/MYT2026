/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Navbar,
  MainTab,
  ReceiptSubTab,
  ProjectSubTab,
  SevenElevenSubTab,
} from './components/Navbar.tsx';
import { SubcontractorList } from './components/subcontractor/SubcontractorList.tsx';
import { ReceiptForm } from './components/receipts/ReceiptForm.tsx';
import { HandoverForm } from './components/receipts/HandoverForm.tsx';
import { ReceiptArchive } from './components/receipts/ReceiptArchive.tsx';
import { ProjectDashboard } from './components/projects/ProjectDashboard.tsx';
import { ProjectKanban } from './components/projects/ProjectKanban.tsx';
import { MaterialTakeoffView } from './components/projects/MaterialTakeoffView.tsx';
import { PerformanceChart } from './components/projects/PerformanceChart.tsx';
import { GeneralWorkflowView } from './components/projects/GeneralWorkflowView.tsx';
import { DailyReportForm } from './components/daily-report/DailyReportForm.tsx';
import { SevenElevenBranchList } from './components/seven-eleven/SevenElevenBranchList.tsx';
import { SevenElevenInspectionForm } from './components/seven-eleven/SevenElevenInspectionForm.tsx';
import { LandSurveyView } from './components/survey/LandSurveyView.tsx';
import { GoogleWorkspaceModal } from './components/workspace/GoogleWorkspaceModal.tsx';
import {
  getSubcontractors,
  saveSubcontractors,
  getReceipts,
  saveReceipts,
  getHandovers,
  saveHandovers,
  getProjects,
  saveProjects,
  getDailyReports,
  saveDailyReports,
  getSevenElevenBranches,
  saveSevenElevenBranches,
  getSevenElevenInspections,
  saveSevenElevenInspections,
  getLandSurveys,
  saveLandSurveys,
} from './utils/storage.ts';
import {
  Subcontractor,
  Receipt,
  HandoverDocument,
  Project,
  DailyReport,
  SevenElevenBranch,
  SevenElevenInspectionDoc,
  LandSurveyRecord,
} from './types/types.ts';
import { initAuth } from './services/googleAuth.ts';

export default function App() {
  // Navigation State
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('receipts');
  const [activeReceiptSubTab, setActiveReceiptSubTab] =
    useState<ReceiptSubTab>('1.2_tax_0');
  const [activeProjectSubTab, setActiveProjectSubTab] =
    useState<ProjectSubTab>('2.1_projects_overview');
  const [activeSevenElevenSubTab, setActiveSevenElevenSubTab] =
    useState<SevenElevenSubTab>('4.2_inspection_form');

  // Core Data States
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [handovers, setHandovers] = useState<HandoverDocument[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [sevenElevenBranches, setSevenElevenBranches] = useState<
    SevenElevenBranch[]
  >([]);
  const [sevenElevenInspections, setSevenElevenInspections] = useState<
    SevenElevenInspectionDoc[]
  >([]);
  const [landSurveys, setLandSurveys] = useState<LandSurveyRecord[]>([]);

  // Selected entities
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSubcontractor, setSelectedSubcontractor] =
    useState<Subcontractor | null>(null);
  const [selectedSevenElevenBranch, setSelectedSevenElevenBranch] =
    useState<SevenElevenBranch | null>(null);

  // Recall-to-edit entities from 1.6 Archive
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editingHandover, setEditingHandover] =
    useState<HandoverDocument | null>(null);
  const [editingSubcontractor, setEditingSubcontractor] =
    useState<Subcontractor | null>(null);

  // Google Workspace Modal
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Load from local storage
  useEffect(() => {
    const subs = getSubcontractors();
    const recs = getReceipts();
    const hand = getHandovers();
    const projs = getProjects();
    const reports = getDailyReports();
    const branches711 = getSevenElevenBranches();
    const inspections711 = getSevenElevenInspections();
    const surveys = getLandSurveys();

    setSubcontractors(subs);
    setReceipts(recs);
    setHandovers(hand);
    setProjects(projs);
    setDailyReports(reports);
    setSevenElevenBranches(branches711);
    setSevenElevenInspections(inspections711);
    setLandSurveys(surveys);

    if (projs.length > 0) {
      setSelectedProject(projs[0]);
    }
    if (branches711.length > 0) {
      setSelectedSevenElevenBranch(branches711[0]);
    }
  }, []);

  // Listen to Google Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      () => setIsGoogleConnected(true),
      () => setIsGoogleConnected(false)
    );
    return () => unsubscribe();
  }, []);

  // Subcontractor handlers
  const handleSaveSubcontractor = (sub: Subcontractor) => {
    const existingIndex = subcontractors.findIndex((s) => s.id === sub.id);
    let updated: Subcontractor[];
    if (existingIndex >= 0) {
      updated = [...subcontractors];
      updated[existingIndex] = sub;
    } else {
      updated = [sub, ...subcontractors];
    }
    setSubcontractors(updated);
    saveSubcontractors(updated);
  };

  const handleDeleteSubcontractor = (id: string) => {
    const updated = subcontractors.filter((s) => s.id !== id);
    setSubcontractors(updated);
    saveSubcontractors(updated);
  };

  // Receipt handlers
  const handleSaveReceipt = (receipt: Receipt) => {
    const existingIndex = receipts.findIndex((r) => r.id === receipt.id);
    let updated: Receipt[];
    if (existingIndex >= 0) {
      updated = [...receipts];
      updated[existingIndex] = receipt;
    } else {
      updated = [receipt, ...receipts];
    }
    setReceipts(updated);
    saveReceipts(updated);
    if (editingReceipt?.id === receipt.id) {
      setEditingReceipt(receipt);
    }
  };

  const handleDeleteReceipt = (id: string) => {
    const updated = receipts.filter((r) => r.id !== id);
    setReceipts(updated);
    saveReceipts(updated);
    if (editingReceipt?.id === id) {
      setEditingReceipt(null);
    }
  };

  // Handover handlers
  const handleSaveHandover = (doc: HandoverDocument) => {
    const existingIndex = handovers.findIndex((h) => h.id === doc.id);
    let updated: HandoverDocument[];
    if (existingIndex >= 0) {
      updated = [...handovers];
      updated[existingIndex] = doc;
    } else {
      updated = [doc, ...handovers];
    }
    setHandovers(updated);
    saveHandovers(updated);
    if (editingHandover?.id === doc.id) {
      setEditingHandover(doc);
    }
  };

  const handleDeleteHandover = (id: string) => {
    const updated = handovers.filter((h) => h.id !== id);
    setHandovers(updated);
    saveHandovers(updated);
    if (editingHandover?.id === id) {
      setEditingHandover(null);
    }
  };

  // Project handlers
  const handleSaveProject = (proj: Project) => {
    const existingIndex = projects.findIndex((p) => p.id === proj.id);
    let updated: Project[];
    if (existingIndex >= 0) {
      updated = [...projects];
      updated[existingIndex] = proj;
    } else {
      updated = [proj, ...projects];
    }
    setProjects(updated);
    saveProjects(updated);

    if (selectedProject?.id === proj.id) {
      setSelectedProject(proj);
    }
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
    if (selectedProject?.id === id) {
      setSelectedProject(updated[0] || null);
    }
  };

  // Daily Report handlers
  const handleSaveDailyReport = (report: DailyReport) => {
    const existingIndex = dailyReports.findIndex((d) => d.id === report.id);
    let updated: DailyReport[];
    if (existingIndex >= 0) {
      updated = [...dailyReports];
      updated[existingIndex] = report;
    } else {
      updated = [report, ...dailyReports];
    }
    setDailyReports(updated);
    saveDailyReports(updated);
  };

  const handleDeleteDailyReport = (id: string) => {
    const updated = dailyReports.filter((d) => d.id !== id);
    setDailyReports(updated);
    saveDailyReports(updated);
  };

  // 7-11 Branch handlers
  const handleSaveSevenElevenBranch = (branch: SevenElevenBranch) => {
    const existingIndex = sevenElevenBranches.findIndex(
      (b) => b.id === branch.id
    );
    let updated: SevenElevenBranch[];
    if (existingIndex >= 0) {
      updated = [...sevenElevenBranches];
      updated[existingIndex] = branch;
    } else {
      updated = [branch, ...sevenElevenBranches];
    }
    setSevenElevenBranches(updated);
    saveSevenElevenBranches(updated);

    if (selectedSevenElevenBranch?.id === branch.id) {
      setSelectedSevenElevenBranch(branch);
    } else if (!selectedSevenElevenBranch) {
      setSelectedSevenElevenBranch(branch);
    }
  };

  const handleDeleteSevenElevenBranch = (id: string) => {
    const updated = sevenElevenBranches.filter((b) => b.id !== id);
    setSevenElevenBranches(updated);
    saveSevenElevenBranches(updated);
    if (selectedSevenElevenBranch?.id === id) {
      setSelectedSevenElevenBranch(updated[0] || null);
    }
  };

  // 7-11 Inspection Document handlers
  const handleSaveSevenElevenInspection = (doc: SevenElevenInspectionDoc) => {
    const existingIndex = sevenElevenInspections.findIndex(
      (i) => i.id === doc.id
    );
    let updated: SevenElevenInspectionDoc[];
    if (existingIndex >= 0) {
      updated = [...sevenElevenInspections];
      updated[existingIndex] = doc;
    } else {
      updated = [doc, ...sevenElevenInspections];
    }
    setSevenElevenInspections(updated);
    saveSevenElevenInspections(updated);
  };

  const handleDeleteSevenElevenInspection = (id: string) => {
    const updated = sevenElevenInspections.filter((i) => i.id !== id);
    setSevenElevenInspections(updated);
    saveSevenElevenInspections(updated);
  };

  // Land Survey (5. งานสำรวจ) handlers
  const handleSaveLandSurvey = (record: LandSurveyRecord) => {
    const existingIndex = landSurveys.findIndex((s) => s.id === record.id);
    let updated: LandSurveyRecord[];
    if (existingIndex >= 0) {
      updated = [...landSurveys];
      updated[existingIndex] = record;
    } else {
      updated = [record, ...landSurveys];
    }
    setLandSurveys(updated);
    saveLandSurveys(updated);
  };

  const handleDeleteLandSurvey = (id: string) => {
    const updated = landSurveys.filter((s) => s.id !== id);
    setLandSurveys(updated);
    saveLandSurveys(updated);
  };

  const handleSelectBranchForInspection = (branch: SevenElevenBranch) => {
    setSelectedSevenElevenBranch(branch);
    setActiveSevenElevenSubTab('4.2_inspection_form');
  };

  const handleSelectSubcontractorForReceipt = (sub: Subcontractor) => {
    setEditingReceipt(null);
    setSelectedSubcontractor(sub);
    setActiveReceiptSubTab('1.2_tax_0');
  };

  // Recall-to-edit handlers from 1.6 Archive
  const handleEditReceiptFromArchive = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setActiveMainTab('receipts');
    if (receipt.type === 'tax_3_retention_5') {
      setActiveReceiptSubTab('1.4_tax_3_retention_5');
    } else {
      setActiveReceiptSubTab('1.2_tax_0');
    }
  };

  const handleEditHandoverFromArchive = (doc: HandoverDocument) => {
    setEditingHandover(doc);
    setActiveMainTab('receipts');
    setActiveReceiptSubTab('1.5_handover');
  };

  const handleEditSubcontractorFromArchive = (sub: Subcontractor) => {
    setEditingSubcontractor(sub);
    setActiveMainTab('receipts');
    setActiveReceiptSubTab('1.1_subcontractor');
  };

  const handleSelectProjectFromDashboard = (proj: Project) => {
    setSelectedProject(proj);
    setActiveProjectSubTab('2.2_tasks_kanban');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        activeReceiptSubTab={activeReceiptSubTab}
        setActiveReceiptSubTab={setActiveReceiptSubTab}
        activeProjectSubTab={activeProjectSubTab}
        setActiveProjectSubTab={setActiveProjectSubTab}
        activeSevenElevenSubTab={activeSevenElevenSubTab}
        setActiveSevenElevenSubTab={setActiveSevenElevenSubTab}
        onOpenGoogleWorkspace={() => setIsGoogleModalOpen(true)}
        isGoogleConnected={isGoogleConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ==================================================== */}
        {/* 1. เมนู ใบเสร็จ */}
        {/* ==================================================== */}
        {activeMainTab === 'receipts' && (
          <div>
            {/* 1.1 เพิ่มข้อมูล ผรม. */}
            {activeReceiptSubTab === '1.1_subcontractor' && (
              <SubcontractorList
                subcontractors={subcontractors}
                onSaveSubcontractor={handleSaveSubcontractor}
                onDeleteSubcontractor={handleDeleteSubcontractor}
                onSelectForReceipt={handleSelectSubcontractorForReceipt}
                initialEditSubcontractor={editingSubcontractor}
                onClearInitialEdit={() => setEditingSubcontractor(null)}
              />
            )}

            {/* 1.2 ใบเสร็จหัก 0-5% */}
            {activeReceiptSubTab === '1.2_tax_0' && (
              <ReceiptForm
                key="receipt_tax_0"
                receiptType="tax_0"
                subcontractors={subcontractors}
                projects={projects}
                onSaveReceipt={handleSaveReceipt}
                onSaveSubcontractor={handleSaveSubcontractor}
                selectedSubcontractor={selectedSubcontractor}
                initialReceipt={
                  editingReceipt && editingReceipt.type !== 'tax_3_retention_5'
                    ? editingReceipt
                    : null
                }
                onClearEditReceipt={() => setEditingReceipt(null)}
              />
            )}

            {/* 1.3 ใบเสร็จหัก 3% + ประกันผลงาน 5% */}
            {activeReceiptSubTab === '1.4_tax_3_retention_5' && (
              <ReceiptForm
                key="receipt_tax_3_retention_5"
                receiptType="tax_3_retention_5"
                subcontractors={subcontractors}
                projects={projects}
                onSaveReceipt={handleSaveReceipt}
                onSaveSubcontractor={handleSaveSubcontractor}
                selectedSubcontractor={selectedSubcontractor}
                initialReceipt={
                  editingReceipt && editingReceipt.type === 'tax_3_retention_5'
                    ? editingReceipt
                    : null
                }
                onClearEditReceipt={() => setEditingReceipt(null)}
              />
            )}

            {/* 1.4 หนังสือส่งมอบงาน (ผู้รับเหมา) */}
            {activeReceiptSubTab === '1.5_handover' && (
              <HandoverForm
                subcontractors={subcontractors}
                projects={projects}
                onSaveHandover={handleSaveHandover}
                onSaveSubcontractor={handleSaveSubcontractor}
                initialDoc={editingHandover}
                onClearEditDoc={() => setEditingHandover(null)}
              />
            )}

            {/* 1.6 คลังข้อมูล ผรม. ใบเสร็จ (Drive) */}
            {activeReceiptSubTab === '1.6_archive' && (
              <ReceiptArchive
                receipts={receipts}
                handovers={handovers}
                subcontractors={subcontractors}
                projects={projects}
                onDeleteReceipt={handleDeleteReceipt}
                onDeleteHandover={handleDeleteHandover}
                onEditReceipt={handleEditReceiptFromArchive}
                onEditHandover={handleEditHandoverFromArchive}
                onEditSubcontractor={handleEditSubcontractorFromArchive}
              />
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. เมนู โครงการ */}
        {/* ==================================================== */}
        {activeMainTab === 'projects' && (
          <div>
            {/* 2.1 ภาพรวมโครงการ */}
            {activeProjectSubTab === '2.1_projects_overview' && (
              <ProjectDashboard
                projects={projects}
                onSelectProject={handleSelectProjectFromDashboard}
                onSaveProject={handleSaveProject}
                onDeleteProject={handleDeleteProject}
              />
            )}

            {/* Sub-tabs 2.2, 2.3, 2.4, 2.5 share single-project context (separated per project) */}
            {activeProjectSubTab !== '2.1_projects_overview' && (
              <div className="space-y-6">
                {/* Project Selector Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setActiveProjectSubTab('2.1_projects_overview')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      ← กลับหน้ารวมโครงการ
                    </button>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">
                        โครงการที่เลือก (แยกแต่ละโครงการ):
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">
                        {selectedProject?.name || 'กรุณาเลือกโครงการ'}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500">
                      สลับโครงการ:
                    </span>
                    <select
                      value={selectedProject?.id || ''}
                      onChange={(e) => {
                        const p = projects.find((proj) => proj.id === e.target.value);
                        if (p) setSelectedProject(p);
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-slate-50"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2.2 กิจกรรมการทำงาน (ทาสก์/งวดงาน) */}
                {activeProjectSubTab === '2.2_tasks_kanban' && selectedProject && (
                  <ProjectKanban
                    project={selectedProject}
                    onUpdateProject={handleSaveProject}
                  />
                )}

                {/* 2.3 ถอดวัสดุตามกิจกรรม */}
                {activeProjectSubTab === '2.3_material_takeoff' && selectedProject && (
                  <MaterialTakeoffView
                    project={selectedProject}
                    onUpdateProject={handleSaveProject}
                    onNavigateToKanban={() =>
                      setActiveProjectSubTab('2.2_tasks_kanban')
                    }
                  />
                )}

                {/* 2.4 กราฟแสดงผลงาน */}
                {activeProjectSubTab === '2.4_performance' && selectedProject && (
                  <PerformanceChart project={selectedProject} />
                )}

                {/* 2.5 General Workflow (แยกตามโครงการที่เลือก) */}
                {activeProjectSubTab === '2.5_general_workflow' && selectedProject && (
                  <GeneralWorkflowView
                    project={selectedProject}
                    projects={projects}
                    onUpdateProject={handleSaveProject}
                    onDeleteProject={handleDeleteProject}
                    onSelectProject={setSelectedProject}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. เมนูรายการงานประจำวัน */}
        {/* ==================================================== */}
        {activeMainTab === 'daily_report' && (
          <DailyReportForm
            projects={projects}
            dailyReports={dailyReports}
            onSaveReport={handleSaveDailyReport}
            onDeleteReport={handleDeleteDailyReport}
          />
        )}

        {/* ==================================================== */}
        {/* 4. เมนู เอกสาร 7-11 */}
        {/* ==================================================== */}
        {activeMainTab === 'seven_eleven' && (
          <div>
            {/* 4.1 เพิ่มข้อมูลโครงการ (สาขา 7-11) */}
            {activeSevenElevenSubTab === '4.1_branch_info' && (
              <SevenElevenBranchList
                branches={sevenElevenBranches}
                onSaveBranch={handleSaveSevenElevenBranch}
                onDeleteBranch={handleDeleteSevenElevenBranch}
                onSelectBranchForInspection={handleSelectBranchForInspection}
              />
            )}

            {/* 4.2 ใบขออนุมัติตรวจสอบงานก่อสร้าง */}
            {activeSevenElevenSubTab === '4.2_inspection_form' && (
              <SevenElevenInspectionForm
                branches={sevenElevenBranches}
                inspections={sevenElevenInspections}
                selectedBranch={selectedSevenElevenBranch}
                onSaveInspection={handleSaveSevenElevenInspection}
                onDeleteInspection={handleDeleteSevenElevenInspection}
                onNavigateToBranchList={() =>
                  setActiveSevenElevenSubTab('4.1_branch_info')
                }
              />
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 5. เมนู งานสำรวจ (เช็คอินปักหมุดพิกัด & เช็คระยะโฉนด) */}
        {/* ==================================================== */}
        {activeMainTab === 'survey' && (
          <LandSurveyView
            projects={projects}
            surveys={landSurveys}
            onSaveSurvey={handleSaveLandSurvey}
            onDeleteSurvey={handleDeleteLandSurvey}
          />
        )}
      </main>

      {/* Google Workspace Integration Hub Modal */}
      <GoogleWorkspaceModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        allData={{
          subcontractors,
          receipts,
          handovers,
          projects,
          dailyReports,
        }}
      />
    </div>
  );
}
