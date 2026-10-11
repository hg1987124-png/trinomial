import React, { useState, useEffect } from 'react';
import { CivicIssue, ActionPlan, Stakeholder, RagQueryResponse, CivicEvent, EventRecommendation, AirQualityReading } from '../types/civic';
import { api } from '../services/api';
import { AirQualityStationReadings } from '../components/AirQualityStationReadings';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  ShieldAlert,
  MapPin,
  Calendar,
  Building2,
  Sparkles,
  HelpCircle,
  Users,
  CheckCircle2,
  Send,
  AlertCircle,
  Download,
  BookOpen,
  Layers,
  ChevronRight,
  PlusCircle,
  Share2,
  Check,
  Shield,
  Clock,
  Wrench,
} from 'lucide-react';

interface IssueDetailViewProps {
  issue: CivicIssue;
  onBack: () => void;
  onIssueUpdated?: () => void;
  onOpenCollaborationModal: (issue: CivicIssue, stakeholder?: Stakeholder) => void;
  onSelectEvent?: (eventId: string) => void;
  onOpenCreateEventModal?: (issue: CivicIssue, recommendation?: EventRecommendation) => void;
}

export const IssueDetailView: React.FC<IssueDetailViewProps> = ({
  issue,
  onBack,
  onIssueUpdated,
  onOpenCollaborationModal,
  onSelectEvent,
  onOpenCreateEventModal,
}) => {
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);

  // Coordinator Issue Status state
  const [selectedStatus, setSelectedStatus] = useState<CivicIssue['status']>(issue.status);
  const [coordinatorNotes, setCoordinatorNotes] = useState<string>(issue.coordinator_notes || '');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);

  // Civic Events connected to this issue
  const [issueEvents, setIssueEvents] = useState<CivicEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [aiRecommendation, setAiRecommendation] = useState<EventRecommendation | null>(null);
  const [loadingAiRec, setLoadingAiRec] = useState(false);
  const [aiRecError, setAiRecError] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Air Quality Monitoring Stations (CPCB OGD Dataset)
  const [airQualityStations, setAirQualityStations] = useState<AirQualityReading[]>([]);
  const [loadingAirQuality, setLoadingAirQuality] = useState(false);

  // Embedded RAG assistant state
  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResponse, setRagResponse] = useState<RagQueryResponse | null>(null);

  // Quick collaboration inline form state
  const [collabName, setCollabName] = useState('');
  const [collabEmail, setCollabEmail] = useState('');
  const [collabOrg, setCollabOrg] = useState('');
  const [collabType, setCollabType] = useState('Volunteer support');
  const [collabMsg, setCollabMsg] = useState('');
  const [collabSubmitting, setCollabSubmitting] = useState(false);
  const [collabSuccess, setCollabSuccess] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);

  const fetchIssueEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await api.getEvents({ issue_id: issue.id });
      setIssueEvents(res.events);
    } catch (e) {
      console.warn('Failed to fetch events for issue:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    // Load Action Plan & Stakeholders & Events
    const loadDetails = async () => {
      setLoadingPlan(true);
      try {
        const planRes = await api.getActionPlan(issue.id);
        if (planRes.success && planRes.plan) {
          setActionPlan(planRes.plan);
        }
      } catch (e) {
        console.warn('Action plan load error:', e);
      } finally {
        setLoadingPlan(false);
      }

      try {
        const stkRes = await api.getStakeholders();
        setStakeholders(stkRes.stakeholders);
      } catch (e) {
        console.warn('Stakeholders load error:', e);
      }

      // Fetch CPCB Air Quality Monitoring Stations related to this issue
      setLoadingAirQuality(true);
      try {
        const aqRes = await api.getAirQualityForIssue(issue.id);
        if (aqRes && aqRes.stations) {
          setAirQualityStations(aqRes.stations);
        }
      } catch (e) {
        console.warn('Failed to load air quality stations for issue:', e);
      } finally {
        setLoadingAirQuality(false);
      }
    };

    loadDetails();
    fetchIssueEvents();
    setAiRecommendation(null);
    setSelectedStatus(issue.status);
    setCoordinatorNotes(issue.coordinator_notes || '');
    setStatusUpdateMessage(null);
  }, [issue.id]);

  const handleUpdateIssueStatus = async () => {
    setUpdatingStatus(true);
    setStatusUpdateMessage(null);
    try {
      const res = await api.updateIssueStatus(issue.id, selectedStatus, coordinatorNotes);
      setStatusUpdateMessage(res.message);
      if (onIssueUpdated) {
        onIssueUpdated();
      }
    } catch (err: any) {
      setStatusUpdateMessage(err?.message || 'Failed to update issue status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFetchAiRecommendation = async () => {
    setLoadingAiRec(true);
    setAiRecError(null);
    try {
      const res = await api.getAiEventRecommendation(issue.id);
      if (res.success && res.recommendation) {
        setAiRecommendation(res.recommendation);
      }
    } catch (err: any) {
      setAiRecError(err?.message || 'Failed to generate AI event recommendation.');
    } finally {
      setLoadingAiRec(false);
    }
  };

  const handleCopyEventLink = (evt: CivicEvent) => {
    const url = `${window.location.origin}${window.location.pathname}#event=${evt.id}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedEventId(evt.id);
      setTimeout(() => setCopiedEventId(null), 3000);
    }
  };

  const handleAskRag = async (q?: string) => {
    const questionText = (q || ragQuery).trim();
    if (!questionText) return;

    setRagLoading(true);
    try {
      const res = await api.queryRag(questionText, issue.id);
      setRagResponse(res);
      setRagQuery(questionText);
    } catch (e: any) {
      console.error('RAG query error:', e);
    } finally {
      setRagLoading(false);
    }
  };

  const handleSubmitInlineCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabName || !collabEmail || !collabMsg) {
      setCollabError('Please provide your name, email, and proposed contribution.');
      return;
    }

    setCollabSubmitting(true);
    setCollabError(null);
    try {
      await api.submitCollaborationRequest({
        issue_id: issue.id,
        issue_title: issue.title,
        requester_name: collabName,
        requester_email: collabEmail,
        organization: collabOrg,
        assistance_type: collabType,
        message: collabMsg,
      });
      setCollabSuccess(true);
      setCollabMsg('');
    } catch (err: any) {
      setCollabError(err?.message || 'Failed to submit collaboration request.');
    } finally {
      setCollabSubmitting(false);
    }
  };

  // Matched stakeholders for this issue category
  const relevantStakeholders = stakeholders.filter((stk) => {
    if (stk.id === 'stk-bmc-mcgm' || stk.id === 'stk-praja-found') return true;
    if (issue.category === 'Water Supply' && stk.id === 'stk-water-rights-mumbai') return true;
    if (issue.category === 'Solid Waste Management' && stk.id === 'stk-swachh-mumbai') return true;
    if (issue.category === 'Air Quality & Pollution' && stk.id === 'stk-mpcb') return true;
    return false;
  });

  const technicalDisclaimerText =
    issue.technical_repair_disclaimer ||
    (issue.category === 'Water Supply' || issue.category === 'Sewerage & Drainage'
      ? 'Technical repairs of burst water pipelines, pressurized trunk mains, valves, and sewage infrastructure must be handled exclusively by authorized Brihanmumbai Municipal Corporation (BMC) Hydraulic Engineering utilities or qualified professionals. Citizen volunteers must never attempt infrastructure repairs.'
      : null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-white border border-[#047857]/20 hover:border-[#047857] text-[#047857] text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Discovery Feed</span>
          </button>
          <span className="text-xs text-[#047857]/50 font-mono">/ {issue.id}</span>
        </div>

        <a
          href={issue.source_resource_url}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-white border border-[#047857]/30 hover:border-[#047857] text-[#047857] text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-[#F97316]" />
          <span>View Original Source Article / Record ({issue.publisher})</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Main Issue Header Card */}
      <div className="bg-white border border-[#047857]/20 rounded-xs p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#047857]/10 text-[#047857] rounded-xs">
              {issue.category}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-xs">
              {issue.priority} Priority
            </span>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {issue.report_distinction_label || 'Documented in May 2025 Praja Audit'}
            </span>
            <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xs">
              Status: {selectedStatus}
            </span>
          </div>

          <span className="font-mono text-xs text-[#047857]/60">{issue.id}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight leading-tight">
          {issue.title}
        </h1>

        <p className="text-xs sm:text-sm text-[#047857]/80 leading-relaxed max-w-4xl">
          {issue.description}
        </p>

        {/* Official Confirmation & Source Support Assessment Banner */}
        {issue.official_confirmation_summary && (
          <div className="p-3.5 bg-[#fcfdfc] border border-[#047857]/25 rounded-xs text-xs space-y-1.5">
            <div className="font-bold text-[#047857] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#F97316]" />
              <span>
                Source Confirmation &amp; Verification Distinction ({issue.report_distinction_label}):
              </span>
            </div>
            <p className="text-[#047857]/90 leading-relaxed">
              {issue.official_confirmation_summary}
            </p>
            {issue.evidence_support_explanation && (
              <p className="text-[11px] text-[#047857]/75">
                <strong>Location &amp; Incident Support Check:</strong>{' '}
                {issue.evidence_support_explanation}
              </p>
            )}
          </div>
        )}

        {/* Mandatory Technical Repair Safety Boundary */}
        {technicalDisclaimerText && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xs text-xs text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <Wrench className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Authorized Utility Repair Boundary (Non-Volunteer Technical Scope):</span>
            </div>
            <p className="text-[11px] leading-relaxed">{technicalDisclaimerText}</p>
          </div>
        )}

        {/* Priority Reason Callout */}
        <div className="p-3 bg-red-50/50 border border-red-200/60 rounded-xs text-xs text-red-900 space-y-1">
          <strong>Priority Assessment Rationale:</strong>
          <p className="text-[11px] text-red-800 leading-relaxed">{issue.priority_reason}</p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#047857]/15 text-xs text-[#047857]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
            <div>
              <span className="text-[10px] text-[#047857]/60 block font-semibold">Location / Wards</span>
              <span className="font-semibold">{issue.location_text}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#047857]/70 shrink-0" />
            <div>
              <span className="text-[10px] text-[#047857]/60 block font-semibold">Assigned Authority</span>
              <span className="font-semibold">{issue.assigned_authority || 'BMC'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#047857]/70 shrink-0" />
            <div>
              <span className="text-[10px] text-[#047857]/60 block font-semibold">Publication Date</span>
              <span className="font-semibold">{issue.publication_date}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#047857]/70 shrink-0" />
            <div>
              <span className="text-[10px] text-[#047857]/60 block font-semibold">Attributed Source</span>
              <span className="font-semibold">{issue.publisher || issue.source_platform}</span>
            </div>
          </div>
        </div>

        {/* Coordinator Issue Status & Progress Control Bar */}
        <div className="pt-3 border-t border-[#047857]/15 bg-[#f4f7f5] -mx-6 -mb-6 p-4 rounded-b-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F97316] block">
              Coordinator Progress &amp; Issue Status Management
            </span>
            <span className="font-bold text-[#047857]">
              Update issue resolution stage &amp; log field coordination notes:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as CivicIssue['status'])}
              className="px-3 py-1.5 bg-white border border-[#047857]/25 rounded-xs text-xs font-semibold text-[#047857]"
            >
              <option value="Documented">Documented</option>
              <option value="Citizen Action Active">Citizen Action Active</option>
              <option value="Under Authority Review">Under Authority Review</option>
              <option value="Solution Proposed">Solution Proposed</option>
            </select>

            <input
              type="text"
              value={coordinatorNotes}
              onChange={(e) => setCoordinatorNotes(e.target.value)}
              placeholder="Optional coordinator status note (e.g., Tanker queue volunteers deployed)..."
              className="w-64 px-3 py-1.5 bg-white border border-[#047857]/25 rounded-xs text-xs text-[#047857]"
            />

            <button
              type="button"
              onClick={handleUpdateIssueStatus}
              disabled={updatingStatus}
              className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white font-bold text-xs rounded-xs cursor-pointer shadow-2xs"
            >
              {updatingStatus ? 'Saving...' : 'Update Status'}
            </button>

            {statusUpdateMessage && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xs">
                {statusUpdateMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Evidence Inspection & RAG Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence Inspector */}
        <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#047857]/15">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F97316]" />
              <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider">
                Documented Evidence & Source Provenance
              </h3>
            </div>
            <a
              href={issue.source_resource_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-[#047857] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open Original Source</span>
            </a>
          </div>

          <div className="space-y-3">
            {issue.evidence.map((ev) => (
              <div
                key={ev.id}
                className="p-4 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#047857]">
                  <span className="font-bold bg-[#047857]/10 px-2 py-0.5 rounded-xs">
                    Page {ev.page_number}
                  </span>
                  <span className="text-[#047857]/70">{ev.section_heading}</span>
                </div>

                <p className="text-xs text-[#047857]/90 italic leading-relaxed">
                  "{ev.evidence_excerpt}"
                </p>

                {ev.metric_value && (
                  <div className="p-2 bg-white border border-[#047857]/20 rounded-xs text-[11px] font-bold text-[#F97316]">
                    Documented Finding: {ev.metric_value}
                  </div>
                )}

                <div className="pt-2 border-t border-[#047857]/10 flex items-center justify-between text-[10px] text-[#047857]/60">
                  <span>Resource: {ev.document_title}</span>
                  <a
                    href={ev.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#047857] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View on OpenCity</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-neutral-50 rounded-xs border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
            <strong>Historical Integrity Note:</strong>
            <p>
              Data is drawn from municipal CCRS records and statutory testing dockets for the May 2025 reporting period.
              Kartavya does not portray past audit backlogs as newly detected real-time emergencies.
            </p>
          </div>
        </div>

        {/* Interactive RAG Q&A Assistant */}
        <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#047857]/15">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F97316]" />
              <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider">
                Ask RAG About This Documented Issue
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-xs border border-emerald-200">
              Grounded Model
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about transmission losses, ward ratios, or test results..."
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskRag()}
                className="flex-1 px-3 py-1.5 text-xs bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857] text-[#047857]"
              />
              <button
                onClick={() => handleAskRag()}
                disabled={ragLoading || !ragQuery.trim()}
                className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                {ragLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Query</span>
                )}
              </button>
            </div>

            {/* Quick suggested chips */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <button
                onClick={() => handleAskRag('What specific data is cited in the tables for this issue?')}
                className="px-2 py-1 bg-[#f4f7f5] hover:bg-[#e6ece8] text-[#047857] rounded-xs border border-[#047857]/15 cursor-pointer font-medium"
              >
                Table Data Summary
              </button>
              <button
                onClick={() => handleAskRag('Which specific wards are highlighted as having the highest deficit?')}
                className="px-2 py-1 bg-[#f4f7f5] hover:bg-[#e6ece8] text-[#047857] rounded-xs border border-[#047857]/15 cursor-pointer font-medium"
              >
                Ward Breakdown
              </button>
              <button
                onClick={() => handleAskRag("What is the mayor's personal phone number?")}
                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xs border border-amber-200 cursor-pointer font-medium"
                title="Tests Acceptance Test 7 (Insufficient Evidence)"
              >
                Test Insufficient Evidence
              </button>
            </div>

            {/* RAG Query Result */}
            {ragResponse && (
              <div className="p-4 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs space-y-3 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#047857]">Grounded Answer</span>
                  {ragResponse.evidence_sufficient ? (
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-xs border border-emerald-200">
                      Sufficient Evidence
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200">
                      Insufficient Evidence
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#047857] leading-relaxed whitespace-pre-wrap">
                  {ragResponse.answer}
                </p>

                {ragResponse.citations.length > 0 && (
                  <div className="pt-2 border-t border-[#047857]/10 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#047857]/70 block">
                      Retrieved Citations:
                    </span>
                    {ragResponse.citations.map((c, i) => (
                      <div key={i} className="text-[10px] text-[#047857]/80 flex items-center gap-1.5">
                        <span className="font-bold bg-[#047857]/10 px-1 rounded-xs">
                          Page {c.page_number}
                        </span>
                        <span className="truncate">{c.section}: "{c.excerpt.slice(0, 80)}..."</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CPCB CAAQMS Real-Time Air Quality Monitoring Stations Section */}
      {airQualityStations.length > 0 && (
        <AirQualityStationReadings
          stations={airQualityStations}
          title={
            issue.category === 'Air Quality & Pollution'
              ? 'Nearby CPCB CAAQMS Air Quality Monitoring Station Readings'
              : `Continuous Air Quality Index (AQI) Telemetry for ${issue.ward || issue.location_text.split(',')[0]}`
          }
          subtitle="Physical ambient pollutant measurements retrieved via Central Pollution Control Board (CPCB) on India's Open Government Data (OGD) Platform. Measured readings are strictly separate from citizen grievances."
          issueContextTitle={issue.title}
        />
      )}

      {/* AI Solution Studio & Action Plan (10 Structured Sections) */}
      <div className="bg-white border border-[#047857]/20 rounded-xs p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#047857]/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F97316]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
                AI SOLUTION STUDIO & CIVIC ACTION PLAN
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#047857]">
              Multi-Stage Intervention Framework
            </h2>
            <p className="text-xs text-[#047857]/70">
              10 structured operational dimensions converting documentary evidence into lawful community action.
            </p>
          </div>

          <div className="text-xs text-[#047857]/60">
            {loadingPlan && <span>Loading action framework...</span>}
          </div>
        </div>

        {actionPlan ? (
          <div className="space-y-6">
            {/* 1. Problem Understanding */}
            <div className="p-4 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#047857]">
                1. Problem Understanding (Source Baseline)
              </h4>
              <p className="text-xs text-[#047857]/80 leading-relaxed">
                {actionPlan.summary}
              </p>
            </div>

            {/* 2. Potential Causes: Sourced Facts vs Plausible Hypotheses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/40 border border-emerald-200/60 rounded-xs space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2A. Sourced Facts (Documented in Report)</span>
                </h4>
                <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside">
                  {actionPlan.potential_causes.sourced_facts.map((fact, idx) => (
                    <li key={idx} className="leading-relaxed">{fact}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-xs space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>2B. Plausible Hypotheses (To Validate)</span>
                </h4>
                <ul className="text-xs text-amber-950 space-y-1.5 list-disc list-inside">
                  {actionPlan.potential_causes.plausible_hypotheses.map((hyp, idx) => (
                    <li key={idx} className="leading-relaxed">{hyp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3, 4, 5. Step Phases: Immediate, Medium-Term, Long-Term */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-[#047857]/15 rounded-xs space-y-2 bg-white">
                <div className="text-[11px] font-bold uppercase text-[#F97316] tracking-wider">
                  3. Immediate Steps (0–30 Days)
                </div>
                <ul className="text-xs text-[#047857]/80 space-y-2">
                  {actionPlan.immediate_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#F97316] shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 border border-[#047857]/15 rounded-xs space-y-2 bg-white">
                <div className="text-[11px] font-bold uppercase text-[#047857] tracking-wider">
                  4. Medium-Term (1–6 Months)
                </div>
                <ul className="text-xs text-[#047857]/80 space-y-2">
                  {actionPlan.medium_term_interventions.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#047857] shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 border border-[#047857]/15 rounded-xs space-y-2 bg-white">
                <div className="text-[11px] font-bold uppercase text-[#047857] tracking-wider">
                  5. Long-Term Systemic Reform
                </div>
                <ul className="text-xs text-[#047857]/80 space-y-2">
                  {actionPlan.long_term_recommendations.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#047857] shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 6, 7, 8, 9, 10. Stakeholders, Collaborators, Resources, Outcome, Evidence & Limitations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-2">
                <h4 className="font-bold text-[#047857] uppercase tracking-wider">
                  6 & 7. Responsible Stakeholders & Collaborators
                </h4>
                <div className="space-y-1 text-[#047857]/80">
                  <div><strong>Authorities to Investigate:</strong> {actionPlan.potential_stakeholders.join(', ')}</div>
                  <div><strong>Civic Collaborators:</strong> {actionPlan.potential_collaborators.join(', ')}</div>
                  <div><strong>Resources Needed:</strong> {actionPlan.resources_needed.join(', ')}</div>
                </div>
              </div>

              <div className="p-4 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-2">
                <h4 className="font-bold text-[#047857] uppercase tracking-wider">
                  9 & 10. Expected Outcome & Evidence Limitations
                </h4>
                <div className="space-y-1 text-[#047857]/80">
                  <div><strong>Expected Qualitative Outcome:</strong> {actionPlan.expected_outcome}</div>
                  <div>
                    <strong>Evidence Citations:</strong>{' '}
                    {actionPlan.evidence_and_limitations.supporting_evidence.join(', ')}
                  </div>
                  <div className="text-[11px] text-amber-800">
                    <strong>Assumptions Needing Ground Validation:</strong>{' '}
                    {actionPlan.evidence_and_limitations.unvalidated_assumptions.join('; ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-[#047857]/70">
            Loading action framework...
          </div>
        )}
      </div>

      {/* TAKE ACTION SECTION: Connected Civic Action Events & Community Mobilization */}
      <div className="bg-white border-2 border-[#047857] rounded-xs p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#047857]/20">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F97316]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
                COMMUNITY ACTION & VOLUNTEERING
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#047857] tracking-tight">
              Take Action: Civic Events & Volunteer Registration
            </h2>
            <p className="text-xs text-[#047857]/80 leading-relaxed max-w-3xl">
              Connect this documented civic problem to ground action. Join upcoming volunteer drives, conduct citizen audits, or schedule a community event as an authorized organizer.
            </p>
          </div>

          {onOpenCreateEventModal && (
            <button
              onClick={() => onOpenCreateEventModal(issue)}
              className="px-3.5 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Civic Event</span>
            </button>
          )}
        </div>

        {/* Existing Scheduled Events for this issue */}
        {loadingEvents ? (
          <div className="py-6 text-center text-xs text-[#047857]/60">
            Checking upcoming civic events for this issue...
          </div>
        ) : issueEvents.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#047857] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{issueEvents.length} Active Community Event{issueEvents.length > 1 ? 's' : ''} Scheduled</span>
              </span>
              <span className="text-[11px] text-[#047857]/70">Open for citizen participation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issueEvents.map((evt) => {
                const slotsRemaining = Math.max(0, evt.max_volunteers - evt.registered_volunteers_count);
                const isFull = evt.status === 'Full' || slotsRemaining <= 0;
                const isCancelled = evt.status === 'Cancelled';
                const percent = Math.min(
                  100,
                  Math.round((evt.registered_volunteers_count / evt.max_volunteers) * 100)
                );

                return (
                  <div
                    key={evt.id}
                    className="p-4 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs flex flex-col justify-between space-y-3 hover:border-[#047857] transition-all shadow-2xs text-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#047857]/10 text-[#047857] rounded-xs">
                          {evt.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase ${
                            evt.status === 'Open for Registration' && !isFull
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isFull
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isCancelled
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isFull && evt.status === 'Open for Registration' ? 'Full' : evt.status}
                        </span>
                      </div>

                      <h3
                        onClick={() => onSelectEvent && onSelectEvent(evt.id)}
                        className="font-bold text-[#047857] text-sm leading-snug hover:underline cursor-pointer"
                      >
                        {evt.title}
                      </h3>

                      <p className="text-[11px] text-[#047857]/80 line-clamp-2">
                        {evt.description}
                      </p>

                      <div className="p-2 bg-white border border-[#047857]/10 rounded-xs space-y-1 text-[11px] text-[#047857]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                          <span>{evt.date} • {evt.start_time} ({evt.duration_hours}h)</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                          <span className="truncate">{evt.location_name} • {evt.meeting_point}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#047857]/70">
                          <Shield className="w-3.5 h-3.5 text-[#047857]" />
                          <span className="truncate">{evt.organizer_organization} ({evt.organizer_name})</span>
                        </div>
                      </div>

                      {/* Capacity progress */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#047857]/70 font-semibold">Capacity</span>
                          <span className="font-mono font-bold text-[#047857]">
                            {evt.registered_volunteers_count} / {evt.max_volunteers} ({slotsRemaining} slots remaining)
                          </span>
                        </div>
                        <div className="w-full bg-[#047857]/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${percent >= 100 ? 'bg-amber-600' : 'bg-[#047857]'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#047857]/10">
                      <button
                        onClick={() => handleCopyEventLink(evt)}
                        className="px-2 py-1 bg-white border border-[#047857]/20 hover:border-[#047857] text-[#047857] text-[11px] font-semibold rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy shareable link"
                      >
                        {copiedEventId === evt.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3 text-[#F97316]" />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      {onSelectEvent && (
                        <button
                          onClick={() => onSelectEvent(evt.id)}
                          className={`px-3 py-1 font-bold text-xs rounded-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs ${
                            isFull
                              ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                              : 'bg-[#047857] hover:bg-[#035f44] text-white'
                          }`}
                        >
                          <span>{isFull ? 'View Event Details (Full)' : 'Register as Volunteer'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Honest No Event Scheduled State */
          <div className="p-5 bg-[#fcfdfc] border border-dashed border-[#047857]/30 rounded-xs space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#047857]/50 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-[#047857] text-sm">
                  No Civic Action Event Scheduled Yet
                </h4>
                <p className="text-xs text-[#047857]/80 leading-relaxed">
                  No community drive or field audit is currently active for this specific issue. To ensure genuine accountability, events are never fabricated; an authorized organizer, NGO, or citizen group must confirm the date, safety briefing, and meeting point before publication.
                </p>
              </div>
            </div>

            {/* AI Recommendation Section */}
            <div className="p-4 bg-white border border-[#047857]/15 rounded-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F97316]" />
                  <span className="font-bold text-xs text-[#047857]">
                    AI Civic Action Recommendation Engine
                  </span>
                </div>
                <button
                  onClick={handleFetchAiRecommendation}
                  disabled={loadingAiRec}
                  className="px-3 py-1.5 bg-[#047857]/10 hover:bg-[#047857]/20 text-[#047857] text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>{loadingAiRec ? 'Analyzing Issue...' : 'Propose Civic Action Activity'}</span>
                </button>
              </div>

              {aiRecError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xs">
                  {aiRecError}
                </div>
              )}

              {aiRecommendation ? (
                <div className="p-3.5 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#047857]">
                      {aiRecommendation.recommended_activity}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase ${
                        aiRecommendation.suitability_score === 'High'
                          ? 'bg-emerald-100 text-emerald-800'
                          : aiRecommendation.suitability_score === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      Action Suitability: {aiRecommendation.suitability_score}
                    </span>
                  </div>

                  <p className="text-[#047857]/80 leading-relaxed italic">
                    "{aiRecommendation.rationale}"
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-2.5 bg-white border border-[#047857]/10 rounded-xs space-y-1">
                      <strong className="text-[#047857] block">Suggested Volunteer Tasks:</strong>
                      <ul className="list-disc list-inside text-[#047857]/80 space-y-0.5">
                        {aiRecommendation.suggested_tasks.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 bg-white border border-[#047857]/10 rounded-xs space-y-1">
                      <strong className="text-[#F97316] block">Equipment & Precautions:</strong>
                      <div className="text-[#047857]/80">
                        <strong>Equipment:</strong> {aiRecommendation.equipment_needed.join(', ')}
                      </div>
                      <div className="text-[#047857]/80">
                        <strong>Precautions:</strong> {aiRecommendation.safety_precautions.join('; ')}
                      </div>
                    </div>
                  </div>

                  {onOpenCreateEventModal && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => onOpenCreateEventModal(issue, aiRecommendation)}
                        className="px-4 py-2 bg-[#047857] hover:bg-[#035f44] text-white font-bold rounded-xs cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Schedule Event Using This AI Recommendation</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-[#047857]/60">
                  Click the button above to have AI evaluate this issue's category, priority, and location to recommend practical volunteer activities, tasks, and safety precautions.
                </div>
              )}
            </div>

            {/* Alternative Civic Actions */}
            <div className="p-4 bg-white border border-[#047857]/15 rounded-xs space-y-2 text-xs">
              <span className="font-bold text-[#047857] uppercase tracking-wider text-[10px] block">
                Alternative Citizen Actions for this Problem:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-2.5 bg-[#fcfdfc] border border-[#047857]/10 rounded-xs space-y-1">
                  <strong className="text-[#047857] block">1. Connect with NGO</strong>
                  <p className="text-[11px] text-[#047857]/70">
                    Reach out to matched organizations like {relevantStakeholders[0]?.name || 'Pani Haq Samiti'} to coordinate advocacy.
                  </p>
                  <button
                    onClick={() => onOpenCollaborationModal(issue, relevantStakeholders[0])}
                    className="text-[11px] font-bold text-[#047857] underline cursor-pointer"
                  >
                    Contact Partner NGO
                  </button>
                </div>

                <div className="p-2.5 bg-[#fcfdfc] border border-[#047857]/10 rounded-xs space-y-1">
                  <strong className="text-[#047857] block">2. Submit Collaboration</strong>
                  <p className="text-[11px] text-[#047857]/70">
                    Submit your individual capacity or technical assistance below to log an interest record.
                  </p>
                  <a
                    href="#collab-form"
                    className="text-[11px] font-bold text-[#047857] underline cursor-pointer"
                  >
                    Fill Collaboration Form
                  </a>
                </div>

                <div className="p-2.5 bg-[#fcfdfc] border border-[#047857]/10 rounded-xs space-y-1">
                  <strong className="text-[#047857] block">3. Statutory Escalation</strong>
                  <p className="text-[11px] text-[#047857]/70">
                    If hazardous (e.g. live culverts or toxic sewage), statutory escalation to {issue.assigned_authority || 'BMC'} is recommended.
                  </p>
                  <span className="text-[11px] text-[#047857]/60">Formal Audit Reference: {issue.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stakeholders & Collaboration Action Section */}
      <div id="collab-form" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Stakeholders Column */}
        <div className="lg:col-span-1 bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#047857]/15">
            <Building2 className="w-4 h-4 text-[#047857]" />
            <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider">
              Recommended Stakeholders
            </h3>
          </div>

          <div className="space-y-3">
            {relevantStakeholders.map((stk) => (
              <div
                key={stk.id}
                className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-[#047857]">{stk.name}</h4>
                  {stk.is_demo_data ? (
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-xs shrink-0">
                      Synthetic Demo
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-xs shrink-0">
                      Verified Entity
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#047857]/80 line-clamp-2">
                  {stk.description}
                </p>

                <div className="text-[10px] text-[#047857]/70 bg-white p-2 rounded-xs border border-[#047857]/10">
                  <strong>Why Matched:</strong> {stk.match_relevance || 'Subject matter domain overlap'}
                </div>

                <button
                  onClick={() => onOpenCollaborationModal(issue, stk)}
                  className="w-full py-1 text-center bg-[#047857]/10 hover:bg-[#047857]/20 text-[#047857] text-[11px] font-bold rounded-xs transition-colors cursor-pointer"
                >
                  Direct Collaboration Request
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Express Interest & Collaboration Form Column */}
        <div className="lg:col-span-2 bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#047857]/15">
            <Users className="w-4 h-4 text-[#F97316]" />
            <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider">
              Initiate Collaboration Request (Persisted to Database)
            </h3>
          </div>

          <p className="text-xs text-[#047857]/80">
            Submit your capacity or organizational intent to help address this documented issue. Requests are validated, stored in the persistent database, and tracked on the Community Action board.
          </p>

          {collabSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xs text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Collaboration Request Persisted Successfully!</span>
              </div>
              <p>
                Your expression of interest for <strong>{issue.title}</strong> has been logged in the community database. You can review your submission in the Community Action tab.
              </p>
              <button
                onClick={() => setCollabSuccess(false)}
                className="text-xs font-bold text-emerald-800 underline cursor-pointer"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitInlineCollab} className="space-y-3 text-xs">
              {collabError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xs text-xs">
                  {collabError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#047857]">Your Name / Display Name *</label>
                  <input
                    type="text"
                    required
                    value={collabName}
                    onChange={(e) => setCollabName(e.target.value)}
                    placeholder="e.g. Priya Nair"
                    className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs text-xs focus:outline-hidden focus:border-[#047857]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#047857]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={collabEmail}
                    onChange={(e) => setCollabEmail(e.target.value)}
                    placeholder="e.g. priya@civic-action.org"
                    className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs text-xs focus:outline-hidden focus:border-[#047857]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#047857]">Organization / Group (Optional)</label>
                  <input
                    type="text"
                    value={collabOrg}
                    onChange={(e) => setCollabOrg(e.target.value)}
                    placeholder="e.g. Ward ALM / University Civic Lab"
                    className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs text-xs focus:outline-hidden focus:border-[#047857]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#047857]">Type of Assistance Offered *</label>
                  <select
                    value={collabType}
                    onChange={(e) => setCollabType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs text-xs focus:outline-hidden focus:border-[#047857]"
                  >
                    <option value="Volunteer support">Volunteer support (Field visits / Tap testing)</option>
                    <option value="Technical expertise">Technical expertise (GIS / Data analysis)</option>
                    <option value="Research and evidence collection">Research & evidence collection</option>
                    <option value="NGO collaboration">NGO collaboration</option>
                    <option value="Community awareness">Community awareness & locality advocacy</option>
                    <option value="Resource or equipment support">Resource or equipment support</option>
                    <option value="Professional consultation">Professional consultation (Legal / Policy)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#047857]">Proposed Contribution / Message *</label>
                <textarea
                  rows={3}
                  required
                  value={collabMsg}
                  onChange={(e) => setCollabMsg(e.target.value)}
                  placeholder="Detail how you or your group can help support data collection, municipal follow-up, or community mobilization..."
                  className="w-full px-3 py-1.5 bg-[#fbfbfb] border border-[#047857]/20 rounded-xs text-xs focus:outline-hidden focus:border-[#047857]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={collabSubmitting}
                  className="px-5 py-2 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white font-bold text-xs rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{collabSubmitting ? 'Persisting...' : 'Submit Collaboration Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueDetailView;
