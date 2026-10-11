import React, { useState, useEffect } from 'react';
import {
  CivicIssue,
  IssueCategory,
  IssuePriority,
  AirQualityReading,
  DiscoveredIssueWorkflowResponse,
} from '../types/civic';
import { api } from '../services/api';
import { AirQualityStationReadings } from '../components/AirQualityStationReadings';
import {
  ExternalLink,
  Search,
  SlidersHorizontal,
  FileText,
  AlertTriangle,
  MapPin,
  Building2,
  CheckCircle2,
  HelpCircle,
  Users,
  Calendar,
  ArrowRight,
  Wind,
  Sparkles,
  ShieldAlert,
  Globe,
  Code2,
  Cpu,
  Check,
} from 'lucide-react';

interface DiscoveryFeedViewProps {
  issues: CivicIssue[];
  loading: boolean;
  onSelectIssue: (issueId: string) => void;
  onSelectEvent?: (eventId: string) => void;
  onIssuesUpdated?: () => void;
  onOpenRagWithIssue?: (issueId: string) => void;
  onOpenCollaborationModal: (issue: CivicIssue) => void;
  onOpenIngestionTab: () => void;
}

const CATEGORIES: (IssueCategory | 'All')[] = [
  'All',
  'Water Supply',
  'Sewerage & Drainage',
  'Solid Waste Management',
  'Public Sanitation & Toilets',
  'Air Quality & Pollution',
];

const PRIORITIES: (IssuePriority | 'All')[] = [
  'All',
  'Critical',
  'High',
  'Medium',
  'Low',
  'Needs More Evidence',
];

const DISCOVERY_SCENARIOS = [
  {
    id: 'water_pipeline_burst',
    badge: 'Example A • Utility Bulletin',
    title: 'Water Pipeline Burst in Mumbai (LBS Marg, Kurla West)',
    subtitle:
      'Scrapes BMC Hydraulic Engineering Bulletin #HE-L-2026-109 via BeautifulSoup, corroborates with RAG, publishes issue & creates safe volunteer tanker/advisory drive.',
    expectedDistinction: 'Officially Confirmed Utility Bulletin',
  },
  {
    id: 'water_contamination_typhoid',
    badge: 'Example B1 • Suspected Cases News',
    title: 'Suspected Water Contamination & Typhoid Cluster (Govandi M-East)',
    subtitle:
      'Scrapes local press report on foul-smelling tap water & 18 suspected typhoid cases in Baiganwadi; distinguishes suspected news report from pending BMC lab confirmation.',
    expectedDistinction: 'News Report Describing Suspected Cases',
  },
  {
    id: 'confirmed_public_health_notice',
    badge: 'Example B2 • Confirmed Health Notice',
    title: 'Official BMC Boiled-Water Notice: Coliform & Typhoid (Sion F-North)',
    subtitle:
      'Scrapes official BMC Public Health Circular #MOH/FN/2026/412 confirming 4/9 coliform samples & 9 lab-verified typhoid cases.',
    expectedDistinction: 'Officially Confirmed Public-Health Notice',
  },
  {
    id: 'unverified_public_claim',
    badge: 'Example B3 • Unverified Rumor',
    title: 'Unattributed Viral Forward Claiming Citywide Lake Poisoning',
    subtitle:
      'Tests AI verification guardrail: identifies lack of ward, hospital, or lab evidence and blocks active issue publication.',
    expectedDistinction: 'Unverified Public Claim',
  },
  {
    id: 'old_unrelated_report',
    badge: 'Example B4 • Old / Unrelated Report',
    title: 'Archival July 2018 Pipeline Maintenance Report (Pune)',
    subtitle:
      'Tests temporal & geographic guardrail: BeautifulSoup extracts 2018 timestamp and Pune location, rejecting active Mumbai publication.',
    expectedDistinction: 'Old or Unrelated Report',
  },
];

export const DiscoveryFeedView: React.FC<DiscoveryFeedViewProps> = ({
  issues,
  loading,
  onSelectIssue,
  onSelectEvent,
  onIssuesUpdated,
  onOpenRagWithIssue,
  onOpenCollaborationModal,
  onOpenIngestionTab,
}) => {
  const [activeDatasetTab, setActiveDatasetTab] = useState<
    'opencity_issues' | 'ai_discovery' | 'cpcb_telemetry'
  >('opencity_issues');
  const [airQualityStations, setAirQualityStations] = useState<AirQualityReading[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'All'>('All');
  const [selectedPriority, setSelectedPriority] = useState<IssuePriority | 'All'>('All');
  const [selectedType, setSelectedType] = useState<'All' | 'documented' | 'citizen'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Issue Discovery & Volunteer Mobilization state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('water_pipeline_burst');
  const [customSourceUrl, setCustomSourceUrl] = useState<string>('');
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveredIssueWorkflowResponse | null>(
    null
  );
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAirQuality()
      .then((res) => {
        if (res && res.stations) {
          setAirQualityStations(res.stations);
        }
      })
      .catch((err) => {
        console.error('Failed to load air quality stations in DiscoveryFeed:', err);
      });
  }, []);

  const handleRunDiscoveryScenario = async (scenarioIdToRun?: string) => {
    const targetScenario = scenarioIdToRun || selectedScenarioId;
    if (scenarioIdToRun) {
      setSelectedScenarioId(scenarioIdToRun);
    }
    setDiscovering(true);
    setDiscoveryError(null);
    try {
      const res = await api.discoverAndMobilizeIssue({
        scenario_id: targetScenario,
        source_url: customSourceUrl.trim() || undefined,
        auto_publish: true,
      });
      setDiscoveryResult(res);
      if (onIssuesUpdated) {
        onIssuesUpdated();
      }
    } catch (err: any) {
      setDiscoveryError(err?.message || 'Failed to execute AI discovery and mobilization pipeline');
    } finally {
      setDiscovering(false);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter((iss) => {
    if (selectedCategory !== 'All' && iss.category !== selectedCategory) return false;
    if (selectedPriority !== 'All' && iss.priority !== selectedPriority) return false;
    if (selectedType === 'documented' && iss.issue_type !== 'documented_civic_concern')
      return false;
    if (selectedType === 'citizen' && iss.issue_type !== 'citizen_report') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        iss.title.toLowerCase().includes(q) ||
        iss.description.toLowerCase().includes(q) ||
        iss.location_text.toLowerCase().includes(q) ||
        iss.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getPriorityBadgeClass = (priority: IssuePriority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Needs More Evidence':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getDistinctionBadgeClass = (distinction?: string) => {
    switch (distinction) {
      case 'officially_confirmed_notice':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'news_report_suspected_cases':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'unverified_public_claim':
        return 'bg-red-50 text-red-800 border-red-300';
      case 'old_or_unrelated_report':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const avgAqi =
    airQualityStations.length > 0
      ? Math.round(
          airQualityStations
            .filter((s) => s.aqi !== null)
            .reduce((acc, curr) => acc + (curr.aqi || 0), 0) /
            airQualityStations.filter((s) => s.aqi !== null).length
        )
      : 168;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Pipeline & Dataset Selector Banner */}
      <div className="p-2 bg-white border border-[#047857]/20 rounded-xs shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveDatasetTab('opencity_issues')}
            className={`px-3.5 py-2 rounded-xs text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDatasetTab === 'opencity_issues'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'text-[#047857] hover:bg-[#047857]/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Discovered Civic Issues Feed</span>
            <span
              className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono ${
                activeDatasetTab === 'opencity_issues'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#047857]/10 text-[#047857]'
              }`}
            >
              {issues.length} Records
            </span>
          </button>

          <button
            onClick={() => setActiveDatasetTab('ai_discovery')}
            className={`px-3.5 py-2 rounded-xs text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDatasetTab === 'ai_discovery'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'text-[#047857] hover:bg-[#047857]/10 border border-[#F97316]/30 bg-orange-50/40'
            }`}
          >
            <Sparkles
              className={`w-4 h-4 ${
                activeDatasetTab === 'ai_discovery' ? 'text-amber-300' : 'text-[#F97316]'
              }`}
            />
            <span>AI Live Issue Discovery & Volunteer Mobilization (BS4 + RAG + Gemini)</span>
          </button>

          <button
            onClick={() => setActiveDatasetTab('cpcb_telemetry')}
            className={`px-3.5 py-2 rounded-xs text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDatasetTab === 'cpcb_telemetry'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'text-[#047857] hover:bg-[#047857]/10'
            }`}
          >
            <Wind
              className={`w-4 h-4 ${
                activeDatasetTab === 'cpcb_telemetry' ? 'text-white' : 'text-[#F97316]'
              }`}
            />
            <span>CPCB Real Time Air Quality</span>
            <span
              className={`px-1.5 py-0.2 rounded-xs text-[10px] font-mono ${
                activeDatasetTab === 'cpcb_telemetry'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F97316]/10 text-[#F97316]'
              }`}
            >
              {airQualityStations.length || 12} Stations (Avg AQI: {avgAqi})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] text-[#047857]/70 font-semibold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Python BeautifulSoup + RAG + Gemini Active</span>
        </div>
      </div>

      {/* TAB 2: AI LIVE ISSUE DISCOVERY & VOLUNTEER MOBILIZATION WORKBENCH */}
      {activeDatasetTab === 'ai_discovery' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[#047857] rounded-xs p-6 shadow-2xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#047857]/15">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] font-bold uppercase rounded-xs tracking-wider">
                    End-to-End Automated Pipeline
                  </span>
                  <span className="text-xs font-semibold text-[#047857]">
                    Discover → Extract (BS4) → RAG Corroborate → Gemini Classify → Publish → Mobilize Volunteers
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
                  AI-Powered Civic Issue Discovery & Volunteer Mobilization
                </h1>
                <p className="text-xs sm:text-sm text-[#047857]/80 max-w-4xl leading-relaxed">
                  Select a real-world Mumbai source connector below (including <strong>Example A: Water Pipeline Burst</strong> and <strong>Example B: Potential Water Contamination / Typhoid</strong>) to fetch the HTML report, extract details via <strong>Python &amp; Beautiful Soup</strong>, corroborate with <strong>RAG</strong>, classify with <strong>Google Gemini</strong>, publish the issue, and open safe volunteer registration.
                </p>
              </div>
            </div>

            {/* Scenario Cards Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#047857] uppercase tracking-wider">
                1. Choose Configured Source Connector / Real-World Scenario:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {DISCOVERY_SCENARIOS.map((scen) => {
                  const isSelected = selectedScenarioId === scen.id;
                  return (
                    <div
                      key={scen.id}
                      onClick={() => setSelectedScenarioId(scen.id)}
                      className={`p-4 rounded-xs border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-[#047857]/5 border-2 border-[#047857] shadow-2xs'
                          : 'bg-[#fcfdfc] border-[#047857]/20 hover:border-[#047857]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F97316]/15 text-[#F97316] rounded-xs">
                            {scen.badge}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#047857] flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#047857] leading-snug">
                          {scen.title}
                        </h3>
                        <p className="text-[11px] text-[#047857]/75 leading-relaxed">
                          {scen.subtitle}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#047857]/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-[#047857]/70 truncate">
                          Target: {scen.expectedDistinction}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunDiscoveryScenario(scen.id);
                          }}
                          disabled={discovering}
                          className="px-2.5 py-1 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white text-[11px] font-bold rounded-xs cursor-pointer shrink-0"
                        >
                          {discovering && isSelected ? 'Running...' : 'Run Pipeline'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Approved URL Bar + Execute Button */}
            <div className="p-4 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#047857]/60 shrink-0" />
                <input
                  type="text"
                  value={customSourceUrl}
                  onChange={(e) => setCustomSourceUrl(e.target.value)}
                  placeholder="Optional: Override with an approved public URL (or leave blank to scrape selected connector bulletin via BS4)..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857] text-[#047857]"
                />
              </div>
              <button
                onClick={() => handleRunDiscoveryScenario()}
                disabled={discovering}
                className="px-5 py-2 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {discovering
                    ? 'Scraping with BeautifulSoup, Querying RAG & Analyzing with Gemini...'
                    : 'Discover, Analyze & Mobilize Volunteers'}
                </span>
              </button>
            </div>

            {discoveryError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{discoveryError}</span>
              </div>
            )}

            {/* Pipeline Execution Output */}
            {discoveryResult && (
              <div className="space-y-5 pt-3 border-t-2 border-[#047857]/20">
                {/* Step Status Banner */}
                <div className="p-4 bg-[#fcfdfc] border border-[#047857]/25 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-xs border ${getDistinctionBadgeClass(
                          discoveryResult.report_distinction
                        )}`}
                      >
                        Classification: {discoveryResult.report_distinction_label}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-xs border ${
                          discoveryResult.location_and_incident_supported
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {discoveryResult.location_and_incident_supported
                          ? 'Location & Incident Supported by Source'
                          : 'Location / Evidence Insufficient — Blocked from Active Publication'}
                      </span>
                      <span className="text-[11px] font-mono bg-[#047857]/10 text-[#047857] px-2 py-0.5 rounded-xs">
                        Model: {discoveryResult.model_used}
                      </span>
                    </div>
                    <p className="text-xs text-[#047857]/90 leading-relaxed pt-1">
                      <strong>Official Confirmation Assessment:</strong>{' '}
                      {discoveryResult.official_confirmation_summary}
                    </p>
                    <p className="text-[11px] text-[#047857]/75">
                      <strong>Evidence Support Check:</strong>{' '}
                      {discoveryResult.evidence_support_explanation}
                    </p>
                  </div>

                  {discoveryResult.source_connector?.public_view_url && (
                    <a
                      href={discoveryResult.source_connector.public_view_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-white border border-[#047857]/30 hover:border-[#047857] text-[#047857] text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 shrink-0 self-start md:self-center shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>View Original Source Article</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* 3-Column Pipeline Telemetry: 1. BeautifulSoup Extraction -> 2. RAG Corroboration -> 3. Published Issue & Volunteer Action */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Python + BeautifulSoup HTML Extraction */}
                  <div className="p-4 bg-white border border-[#047857]/20 rounded-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#047857]/10">
                      <span className="font-bold text-[#047857] uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-[#F97316]" />
                        <span>Step 1–4: BeautifulSoup Extraction</span>
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-xs">
                        HTTP {discoveryResult.source_connector.http_status}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-[#047857]/85">
                      <div>
                        <strong>Parser:</strong> {discoveryResult.source_connector.parser}
                      </div>
                      <div>
                        <strong>Attributed Source:</strong>{' '}
                        {discoveryResult.extracted_html_metadata.publisher}
                      </div>
                      <div>
                        <strong>Publication Date:</strong>{' '}
                        {discoveryResult.extracted_html_metadata.publication_date}
                      </div>
                      <div>
                        <strong>Extracted Location:</strong>{' '}
                        {discoveryResult.extracted_html_metadata.location_text} (
                        {discoveryResult.extracted_html_metadata.ward})
                      </div>
                      <div>
                        <strong>Extracted Text:</strong>{' '}
                        {discoveryResult.extracted_html_metadata.extracted_text_length} chars across{' '}
                        {discoveryResult.extracted_html_metadata.paragraphs_extracted} HTML blocks
                      </div>
                    </div>
                    {discoveryResult.extracted_html_metadata.sample_excerpts?.[0] && (
                      <div className="p-2.5 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs italic text-[11px] text-[#047857]/80">
                        "{discoveryResult.extracted_html_metadata.sample_excerpts[0]}"
                      </div>
                    )}
                  </div>

                  {/* Column 2: RAG Pipeline Corroboration */}
                  <div className="p-4 bg-white border border-[#047857]/20 rounded-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#047857]/10">
                      <span className="font-bold text-[#047857] uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-[#F97316]" />
                        <span>Step 5: RAG Evidence Corroboration</span>
                      </span>
                      <span className="text-[10px] font-mono bg-[#047857]/10 text-[#047857] px-1.5 py-0.5 rounded-xs">
                        {discoveryResult.rag_corroborating_evidence.length} Passages
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {discoveryResult.rag_corroborating_evidence.map((cit, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-bold text-[#047857]">
                            <span>
                              {cit.sourceName} (Page {cit.pageNumber || 1})
                            </span>
                            <span className="text-[10px] font-mono text-[#F97316]">
                              Score: {cit.relevanceScore}
                            </span>
                          </div>
                          <p className="text-[#047857]/80 line-clamp-3 italic">"{cit.excerpt}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Published Issue & Safe Volunteer Mobilization */}
                  <div className="p-4 bg-white border border-[#047857]/20 rounded-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#047857]/10">
                        <span className="font-bold text-[#047857] uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#F97316]" />
                          <span>Step 8–12: Issue &amp; Volunteer Action</span>
                        </span>
                      </div>

                      {/* Mandatory Technical Repair Boundary Callout */}
                      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xs text-[11px] text-amber-950 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-900">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Technical Utility Repair Boundary:</span>
                        </div>
                        <p className="leading-snug">{discoveryResult.technical_repair_disclaimer}</p>
                      </div>

                      {discoveryResult.published_issue ? (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xs space-y-1.5 text-[11px]">
                          <div className="font-bold text-emerald-900 flex items-center justify-between">
                            <span>Published Civic Issue:</span>
                            <span className="font-mono text-[10px]">
                              {discoveryResult.published_issue.id}
                            </span>
                          </div>
                          <div className="font-semibold text-[#047857]">
                            {discoveryResult.published_issue.title}
                          </div>
                          <div className="text-[#047857]/80">
                            <strong>Authority:</strong>{' '}
                            {discoveryResult.published_issue.assigned_authority}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-100 border border-slate-300 rounded-xs text-[11px] text-slate-800">
                          <strong>Not Published as Active Verified Issue:</strong> This report was
                          classified as <em>{discoveryResult.report_distinction_label}</em> and held
                          back from active citizen mobilization.
                        </div>
                      )}
                    </div>

                    {discoveryResult.published_issue && (
                      <div className="pt-2 border-t border-[#047857]/10 flex flex-col gap-2">
                        <button
                          onClick={() => onSelectIssue(discoveryResult.published_issue!.id)}
                          className="w-full py-2 px-3 bg-[#047857] hover:bg-[#035f44] text-white font-bold text-xs rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span>Inspect Issue, Source Article &amp; Coordinator Controls</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {discoveryResult.linked_volunteer_event && onSelectEvent && (
                          <button
                            onClick={() =>
                              onSelectEvent(discoveryResult.linked_volunteer_event!.id)
                            }
                            className="w-full py-2 px-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              Register for Safe Volunteer Activity (
                              {discoveryResult.linked_volunteer_event.registered_volunteers_count}/
                              {discoveryResult.linked_volunteer_event.max_volunteers} Joined)
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeDatasetTab === 'cpcb_telemetry' ? (
        /* Air Quality Dataset View */
        <div className="space-y-6">
          <AirQualityStationReadings
            stations={airQualityStations}
            title="Real Time Air Quality Index — Central Pollution Control Board (CPCB)"
            subtitle="Ambient physical air quality measurements retrieved from 12 Continuous Ambient Air Quality Monitoring Stations (CAAQMS) deployed across Greater Mumbai under CPCB and MPCB via Government of India Open Government Data (OGD) Platform."
            showAllInitially={true}
          />
        </div>
      ) : activeDatasetTab === 'opencity_issues' ? (
        /* OpenCity & Discovered Civic Issues View */
        <>
          {/* Quick-Launch Banner for Example A & Example B Discovery Workflow */}
          <div className="bg-white border-2 border-[#047857]/30 rounded-xs p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] font-bold uppercase rounded-xs tracking-wider">
                  New • Real-World Discovery Connectors
                </span>
                <span className="text-xs font-bold text-[#047857]">
                  Python + Beautiful Soup + RAG + Gemini Issue Discovery &amp; Volunteer Mobilization
                </span>
              </div>
              <p className="text-xs text-[#047857]/80">
                Test live discovery for <strong>Example A (Mumbai Water Pipeline Burst)</strong> or{' '}
                <strong>Example B (Suspected Water Contamination / Typhoid vs Confirmed Notice vs Unverified Claim)</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveDatasetTab('ai_discovery');
                  handleRunDiscoveryScenario('water_pipeline_burst');
                }}
                className="px-3 py-1.5 bg-[#047857] hover:bg-[#035f44] text-white text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Run Example A: Water Pipeline Burst</span>
              </button>
              <button
                onClick={() => {
                  setActiveDatasetTab('ai_discovery');
                  handleRunDiscoveryScenario('water_contamination_typhoid');
                }}
                className="px-3 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Example B: Typhoid / Water Contamination</span>
              </button>
            </div>
          </div>

          {/* Source Banner & Provenance Notification */}
          <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#047857] text-white text-[10px] font-bold uppercase rounded-xs tracking-wider">
                    Primary Public Source
                  </span>
                  <span className="text-xs font-semibold text-[#047857]">
                    OpenCity India Civic Commons &amp; Public Utility Connectors
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
                  Report on the Status of Civic Issues in Mumbai — May 2025 &amp; Live Bulletins
                </h1>
                <p className="text-xs sm:text-sm text-[#047857]/80 max-w-4xl leading-relaxed">
                  Discovered documented civic concerns extracted from the official municipal audit by{' '}
                  <strong>Praja Foundation</strong> and verified public utility/health connectors. All
                  records retain direct source attribution, evidence excerpts, and safe community
                  action paths.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-white border border-[#047857]/30 hover:border-[#047857] text-[#047857] text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>View OpenCity Dataset</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={onOpenIngestionTab}
                  className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#035f44] text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Ingestion Pipeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CPCB Air Quality Telemetry Cross-Reference Notification */}
            <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-[#F97316] shrink-0" />
                <div>
                  <span className="font-bold text-[#047857]">
                    Second Government Source Integrated:
                  </span>{' '}
                  <span className="text-[#047857]/80">
                    Real Time Air Quality Index (CPCB / OGD Platform) with 12 active CAAQMS
                    monitoring stations across Mumbai (City Avg AQI: {avgAqi}).
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveDatasetTab('cpcb_telemetry')}
                className="px-3 py-1 bg-white border border-[#047857]/30 hover:border-[#047857] text-[#047857] font-semibold text-[11px] rounded-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>View CAAQMS Readings</span>
                <ArrowRight className="w-3 h-3 text-[#F97316]" />
              </button>
            </div>
          </div>

          {/* Filter and Search Controls */}
          <div className="bg-white border border-[#047857]/15 rounded-xs p-4 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#047857]/50" />
                <input
                  type="text"
                  placeholder="Search issues, wards, or metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857] text-[#047857]"
                />
              </div>

              {/* Record Type Filter */}
              <div className="flex items-center gap-1 text-xs w-full sm:w-auto overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-semibold text-[#047857]/60 mr-1 shrink-0">
                  Source Type:
                </span>
                <button
                  onClick={() => setSelectedType('All')}
                  className={`px-2.5 py-1 rounded-xs font-semibold text-xs whitespace-nowrap cursor-pointer ${
                    selectedType === 'All'
                      ? 'bg-[#047857] text-white'
                      : 'bg-neutral-100 text-[#047857] hover:bg-neutral-200'
                  }`}
                >
                  All Records ({issues.length})
                </button>
                <button
                  onClick={() => setSelectedType('documented')}
                  className={`px-2.5 py-1 rounded-xs font-semibold text-xs whitespace-nowrap cursor-pointer ${
                    selectedType === 'documented'
                      ? 'bg-[#047857] text-white'
                      : 'bg-neutral-100 text-[#047857] hover:bg-neutral-200'
                  }`}
                >
                  Documented &amp; Scraped (
                  {issues.filter((i) => i.issue_type === 'documented_civic_concern').length})
                </button>
                <button
                  onClick={() => setSelectedType('citizen')}
                  className={`px-2.5 py-1 rounded-xs font-semibold text-xs whitespace-nowrap cursor-pointer ${
                    selectedType === 'citizen'
                      ? 'bg-[#047857] text-white'
                      : 'bg-neutral-100 text-[#047857] hover:bg-neutral-200'
                  }`}
                >
                  Citizen Reports ({issues.filter((i) => i.issue_type === 'citizen_report').length})
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#047857]/10">
              <span className="text-[11px] font-semibold text-[#047857]/60 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Category:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xs text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#047857] text-white font-semibold'
                      : 'bg-[#f4f7f5] text-[#047857] hover:bg-[#e6ece8]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Priority Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#047857]/60 mr-1">Priority:</span>
              {PRIORITIES.map((prio) => (
                <button
                  key={prio}
                  onClick={() => setSelectedPriority(prio)}
                  className={`px-2 py-0.5 rounded-xs text-[10px] font-medium transition-colors cursor-pointer ${
                    selectedPriority === prio
                      ? 'bg-[#047857] text-white font-semibold'
                      : 'bg-neutral-100 text-[#047857] hover:bg-neutral-200'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          {/* Discovery Feed List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#047857]/80">
              <span>
                Showing <strong>{filteredIssues.length}</strong> discovered issues
              </span>
              <span className="text-[11px] text-[#047857]/60">
                Sources: OpenCity India (Praja May 2025) • CPCB OGD • Mumbai Civic Bulletin Connectors
              </span>
            </div>

            {loading ? (
              <div className="bg-white border border-[#047857]/15 rounded-xs p-12 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-[#047857]/80">
                  Loading discovered civic issues from OpenCity data store...
                </p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="bg-white border border-[#047857]/15 rounded-xs p-12 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-sm font-bold text-[#047857]">
                  No civic issues matched your filters
                </h3>
                <p className="text-xs text-[#047857]/70 max-w-md mx-auto">
                  Try adjusting your category, priority, or search term to view other records.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredIssues.map((issue) => {
                  const isDocumented = issue.issue_type === 'documented_civic_concern';

                  return (
                    <div
                      key={issue.id}
                      className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs hover:border-[#047857] transition-all space-y-4 group"
                    >
                      {/* Top Badges & Provenance Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#047857]/10 text-[#047857] rounded-xs">
                            {issue.category}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-xs border ${getPriorityBadgeClass(
                              issue.priority
                            )}`}
                          >
                            {issue.priority} Priority
                          </span>

                          {issue.report_distinction_label ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-xs border flex items-center gap-1 ${getDistinctionBadgeClass(
                                issue.report_distinction
                              )}`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {issue.report_distinction_label}
                            </span>
                          ) : isDocumented ? (
                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Documented in May 2025 Audit
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Citizen Report (Pending Verification)
                            </span>
                          )}

                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-xs">
                            Status: {issue.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#047857]/60 flex items-center gap-2">
                          <span className="font-mono text-[10px]">{issue.id}</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1.5">
                        <h2
                          onClick={() => onSelectIssue(issue.id)}
                          className="text-base sm:text-lg font-bold text-[#047857] hover:text-[#035f44] cursor-pointer transition-colors leading-snug"
                        >
                          {issue.title}
                        </h2>
                        <p className="text-xs text-[#047857]/80 line-clamp-2 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>

                      {/* Technical Repair Boundary Notice if present */}
                      {issue.technical_repair_disclaimer && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xs text-[11px] text-amber-900 flex items-start gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span>{issue.technical_repair_disclaimer}</span>
                        </div>
                      )}

                      {/* Evidence & Metrics Highlight */}
                      {issue.evidence && issue.evidence.length > 0 && (
                        <div className="bg-[#fcfdfc] border border-[#047857]/15 rounded-xs p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-[#047857]">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#F97316]" />
                              <span>Extracted Evidence ({issue.evidence[0].section_heading})</span>
                            </span>
                            <span className="text-[10px] font-mono bg-white border border-[#047857]/20 px-1.5 py-0.2 rounded-xs">
                              Page {issue.evidence[0].page_number}
                            </span>
                          </div>
                          <p className="text-xs text-[#047857]/80 italic line-clamp-2">
                            "{issue.evidence[0].evidence_excerpt}"
                          </p>
                        </div>
                      )}

                      {/* Metadata Row: Location, Authority, Dates */}
                      <div className="pt-2 border-t border-[#047857]/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#047857]/70">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#047857]/60" />
                            <span>{issue.location_text}</span>
                          </span>

                          {issue.assigned_authority && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-[#047857]/60" />
                              <span>{issue.assigned_authority}</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectIssue(issue.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#047857] hover:bg-[#047857]/10 rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-[#F97316]" />
                            <span>Volunteer &amp; Coordinate</span>
                          </button>

                          {onOpenRagWithIssue && (
                            <button
                              onClick={() => onOpenRagWithIssue(issue.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#047857] hover:bg-[#047857]/10 rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <HelpCircle className="w-3 h-3 text-[#F97316]" />
                              <span>Ask RAG</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenCollaborationModal(issue)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#047857] hover:bg-[#047857]/10 rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3 h-3 text-[#047857]" />
                            <span>Collaborate</span>
                          </button>

                          <button
                            onClick={() => onSelectIssue(issue.id)}
                            className="px-3 py-1 bg-[#047857] hover:bg-[#035f44] text-white text-[11px] font-bold rounded-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <span>Inspect Evidence</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DiscoveryFeedView;
