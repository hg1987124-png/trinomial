import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AiCivicSearchResponse } from '../types/civic';
import {
  Search,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ShieldCheck,
  MapPin,
  Layers,
  Activity,
  Users,
  Wrench,
  AlertTriangle,
  Globe,
  Database,
  Server,
} from 'lucide-react';

const SIX_CIVIC_DOMAINS = [
  'All Domains',
  'Garbage, Waste & Cleanliness',
  'Water Supply, Drainage & Sanitation',
  'Air Quality & Pollution',
  'Roads, Transport & Footpaths',
  'Electricity, Power & Street Lighting',
  'Parks, Trees & Public Spaces',
];

const EXAMPLE_QUERIES = [
  {
    label: 'Air Pollution in Delhi (Domain 3)',
    query: 'Why is air pollution increasing in Delhi?',
    domain: 'Air Quality & Pollution',
    location: 'Delhi',
    tag: 'CPCB CAAQMS + NAAQS Grounded',
  },
  {
    label: 'Waste Management in Mumbai (Domain 1)',
    query: 'What evidence exists about waste-management problems in Mumbai?',
    domain: 'Garbage, Waste & Cleanliness',
    location: 'Mumbai',
    tag: 'OpenCity India / Praja Report (Page 30)',
  },
  {
    label: 'Urban Waterlogging & Drainage (Domain 2)',
    query: 'What factors may contribute to urban waterlogging and untreated sewage in Mumbai?',
    domain: 'Water Supply, Drainage & Sanitation',
    location: 'Mumbai',
    tag: 'OpenCity India / Praja Report (Page 11-24)',
  },
  {
    label: 'Damaged Roads & Unsafe Footpaths (Domain 4)',
    query: 'How can damaged roads and unsafe footpaths be addressed?',
    domain: 'Roads, Transport & Footpaths',
    location: 'Mumbai',
    tag: 'Urban Mobility & IRC:103 Audit',
  },
  {
    label: 'Inadequate Street Lighting (Domain 5)',
    query: 'What can improve inadequate street lighting and sanitation block electrification?',
    domain: 'Electricity, Power & Street Lighting',
    location: 'Mumbai',
    tag: 'Page 53-55 Public Safety Audit',
  },
  {
    label: 'Neglected Parks & Public Spaces (Domain 6)',
    query: 'What measures can improve neglected public spaces and urban tree cover?',
    domain: 'Parks, Trees & Public Spaces',
    location: 'Mumbai',
    tag: 'OpenCity Green Space Audit',
  },
  {
    label: 'Insufficient Evidence Test (Private Phone)',
    query: 'What is the personal mobile phone number of the Municipal Commissioner or Mayor?',
    domain: 'All Domains',
    location: 'Mumbai',
    tag: 'Test 7/8: Refuses Unverified Claims',
  },
  {
    label: 'Out-of-Scope Jurisdiction Test (London)',
    query: 'What are the road traffic and civic drainage issues in London and Tokyo?',
    domain: 'Roads, Transport & Footpaths',
    location: 'London',
    tag: 'Test 7/8: Insufficient Evidence Gate',
  },
];

export const RagExplorerView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All Domains');
  const [location, setLocation] = useState<string>('Mumbai');
  const [enableLiveScraping, setEnableLiveScraping] = useState<boolean>(true);
  const [enableGoogleSearchGrounding, setEnableGoogleSearchGrounding] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiCivicSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pythonHealth, setPythonHealth] = useState<any>(null);

  useEffect(() => {
    api
      .getPythonServiceHealth()
      .then((h) => setPythonHealth(h))
      .catch(() => setPythonHealth(null));
  }, []);

  const handleSearch = async (overrideParams?: {
    query?: string;
    domain?: string;
    location?: string;
    simulate_invalid_key?: boolean;
    simulate_blocked_source?: string | null;
    simulate_python_down?: boolean;
  }) => {
    const q = (overrideParams?.query ?? query).trim();
    const dom = overrideParams?.domain ?? selectedDomain;
    const loc = (overrideParams?.location ?? location).trim();

    if (!q) return;

    setQuery(q);
    setSelectedDomain(dom);
    setLocation(loc);
    setLoading(true);
    setError(null);

    try {
      const res = await api.aiCivicSearch({
        query: q,
        domain: dom,
        location: loc || 'Mumbai',
        enable_live_scraping: enableLiveScraping,
        enable_google_search_grounding: enableGoogleSearchGrounding,
        simulate_invalid_key: overrideParams?.simulate_invalid_key,
        simulate_blocked_source: overrideParams?.simulate_blocked_source,
        simulate_python_down: overrideParams?.simulate_python_down,
      });
      setResult(res);
      api
        .getPythonServiceHealth()
        .then((h) => setPythonHealth(h))
        .catch(() => {});
    } catch (err: any) {
      setResult(null);
      setError(err?.message || 'Failed to execute Python BeautifulSoup scraping, RAG retrieval, and Gemini analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Python + BS4 + RAG + Gemini Pipeline Status Banner */}
      <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#F97316]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
              PYTHON + BEAUTIFUL SOUP + PERSISTENT RAG + GOOGLE GEMINI ENGINE
            </span>
          </div>

          {pythonHealth && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs font-semibold flex items-center gap-1">
                <Server className="w-3 h-3 text-emerald-600" />
                Python FastAPI + BS4: Online
              </span>
              <span className="px-2 py-0.5 bg-[#f4f7f5] text-[#047857] border border-[#047857]/20 rounded-xs font-mono">
                RAG SQLite Store: {pythonHealth.rag_storage?.total_chunks ?? 0} Chunks ({pythonHealth.rag_storage?.embedded_chunks ?? 0} Embedded)
              </span>
              <span className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-xs font-mono">
                Gemini: {pythonHealth.gemini?.configured ? pythonHealth.gemini.model : 'Unconfigured'}
              </span>
            </div>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
          AI Civic Search & Evidence-Backed Problem Analysis
        </h1>
        <p className="text-xs sm:text-sm text-[#047857]/80 max-w-4xl leading-relaxed">
          Query across all <strong>6 Civic Domains</strong>. Each search connects to the <strong>Python FastAPI Service</strong>, scrapes approved public portals using <strong>Beautiful Soup (bs4)</strong> & official dataset connectors (OpenCity India, CPCB OGD, NGO Darpan, MY Bharat), retrieves semantic + lexical passages from persistent SQLite storage, and invokes <strong>Google Gemini</strong> for grounded civic analysis and solutions.
        </p>
      </div>

      {/* Search Controls Box */}
      <div className="bg-white border border-[#047857]/15 rounded-xs p-5 shadow-2xs space-y-4">
        {/* 6 Civic Domains Selector */}
        <div className="space-y-2 pb-3 border-b border-[#047857]/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#047857] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#F97316]" />
              1. Select Civic Domain (6 Mandatory Domains):
            </span>
            <span className="text-[11px] font-mono text-[#047857]/70">
              Active Domain: <strong>{selectedDomain}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SIX_CIVIC_DOMAINS.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => setSelectedDomain(domain)}
                className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
                  selectedDomain === domain
                    ? 'bg-[#047857] text-white shadow-2xs'
                    : 'bg-[#f4f7f5] text-[#047857] hover:bg-[#e6ece8] border border-[#047857]/15'
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input + Location Input + Search Button */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#047857]/50" />
            <input
              type="text"
              aria-label="Civic search query"
              placeholder="Ask a civic research question (e.g., Why is air pollution increasing in Delhi? What evidence exists on Mumbai waste?)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#fbfbfb] border border-[#047857]/25 rounded-xs focus:outline-hidden focus:border-[#047857] text-[#047857]"
            />
          </div>

          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F97316]" />
            <input
              type="text"
              aria-label="Location filter"
              placeholder="Location (e.g., Mumbai, Delhi)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#fbfbfb] border border-[#047857]/25 rounded-xs focus:outline-hidden focus:border-[#047857] text-[#047857]"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="w-full h-full min-h-[38px] px-4 py-2 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pipeline Options & Failure Verification Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#047857]/10 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-[#047857]">
              <input
                type="checkbox"
                checked={enableLiveScraping}
                onChange={(e) => setEnableLiveScraping(e.target.checked)}
                className="accent-[#047857]"
              />
              <span className="font-semibold">Live Python BeautifulSoup Scraping</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[#047857]">
              <input
                type="checkbox"
                checked={enableGoogleSearchGrounding}
                onChange={(e) => setEnableGoogleSearchGrounding(e.target.checked)}
                className="accent-[#047857]"
              />
              <span className="font-semibold">Supplementary Google Search Grounding</span>
            </label>
          </div>

          {/* Honest Error / Failure Simulation Controls (Test 10) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-[#047857]/60 mr-1">
              Test 10 Failure Checks:
            </span>
            <button
              type="button"
              onClick={() =>
                handleSearch({
                  query: query || 'What evidence exists about waste-management problems in Mumbai?',
                  simulate_blocked_source: 'https://unapproved-malicious-site.example.com/secret',
                })
              }
              className="px-2 py-1 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xs cursor-pointer"
            >
              Simulate Blocked Source
            </button>
            <button
              type="button"
              onClick={() =>
                handleSearch({
                  query: query || 'What evidence exists about waste-management problems in Mumbai?',
                  simulate_invalid_key: true,
                })
              }
              className="px-2 py-1 text-[10px] font-semibold bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-xs cursor-pointer"
            >
              Simulate Invalid Gemini Key
            </button>
            <button
              type="button"
              onClick={() =>
                handleSearch({
                  query: query || 'What evidence exists about waste-management problems in Mumbai?',
                  simulate_python_down: true,
                })
              }
              className="px-2 py-1 text-[10px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xs cursor-pointer"
            >
              Simulate Python Service Down
            </button>
          </div>
        </div>

        {/* Preset Example Queries across all 6 Domains */}
        <div className="space-y-2 pt-2 border-t border-[#047857]/10">
          <div className="text-[11px] font-semibold text-[#047857]/75">
            Example Queries Across the 6 Official Civic Domains & Verification Tests:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {EXAMPLE_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  handleSearch({
                    query: preset.query,
                    domain: preset.domain,
                    location: preset.location,
                  })
                }
                className="text-left p-2.5 rounded-xs bg-[#f4f7f5] hover:bg-[#e6ece8] border border-[#047857]/15 transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-[#047857] group-hover:text-[#035f44] line-clamp-1">
                  {preset.label}
                </div>
                <div className="text-[10px] text-[#047857]/75 line-clamp-1 mt-0.5">
                  "{preset.query}"
                </div>
                <div className="text-[10px] text-[#F97316] font-semibold mt-1">
                  {preset.tag}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white border border-[#047857]/20 rounded-xs p-8 text-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 border-3 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-[#047857]">
            Executing Python BeautifulSoup Scraping → Persistent SQLite RAG Retrieval → Google Gemini Analysis...
          </div>
          <p className="text-xs text-[#047857]/70 max-w-xl mx-auto">
            Connecting to approved civic sources for domain <strong>{selectedDomain}</strong> ({location || 'Mumbai'}), generating embeddings, and synthesizing grounded findings.
          </p>
        </div>
      )}

      {/* Honest Error State (Never replaced with fake successful answers) */}
      {error && !loading && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 text-red-900 p-5 rounded-xs space-y-2 shadow-2xs"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>AI Civic Search Execution Error (Honest Failure Reporting)</span>
          </div>
          <p className="text-xs leading-relaxed">{error}</p>
          <p className="text-[11px] text-red-700">
            CivicPulse AI never fabricates or substitutes fake successful answers when the AI model or Python scraping pipeline encounters an error.
          </p>
        </div>
      )}

      {/* Results Interface */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Top Status & Verification Banner */}
          <div className="bg-white border border-[#047857]/25 rounded-xs p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#047857]/15">
              <div className="flex flex-wrap items-center gap-2">
                {result.generatedByGemini && (result.status === 'success' || result.status === 'partial_success') ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Generated by Google Gemini using retrieved civic evidence
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold rounded-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Insufficient Evidence in Approved Repositories — Generation Halted
                  </span>
                )}

                {result.status === 'partial_success' && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold rounded-xs">
                    Partial Source Retrieval (See Source Status Below)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#047857]/80">
                <span>Model: {result.modelUsed}</span>
                <span>•</span>
                <span>Domain: {result.domain}</span>
                <span>•</span>
                <span>Location: {result.location || 'Mumbai'}</span>
              </div>
            </div>

            {/* 1. Gemini-Generated Summary */}
            <div className="space-y-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F97316]" />
                <span>1. Executive Civic Summary</span>
              </h2>
              <div className="p-4 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs text-xs sm:text-sm text-[#047857] leading-relaxed">
                {result.summary}
              </div>
            </div>

            {/* 5. Priority Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
              <div className="md:col-span-4 p-4 bg-orange-50/70 border border-orange-200 rounded-xs space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
                  5. Priority Assessment
                </div>
                <div className="text-lg font-extrabold text-[#047857]">
                  Level: {result.priorityAssessment.level}
                </div>
                <p className="text-xs text-[#047857]/85 leading-relaxed">
                  {result.priorityAssessment.reason}
                </p>
              </div>

              {/* 8. Source Retrieval & Python RAG Telemetry */}
              <div className="md:col-span-8 p-4 bg-[#f4f7f5] border border-[#047857]/20 rounded-xs space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-[#047857]">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#F97316]" />
                    8. Source Retrieval & Python RAG Pipeline Status
                  </span>
                  <span className="font-mono text-[11px]">
                    {result.ragStatus.relevantChunksRetrieved} / {result.ragStatus.totalChunksInStore} Chunks Retrieved
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <strong>Retrieval Method:</strong> {result.ragStatus.retrievalMethod}
                  </div>
                  <div>
                    <strong>Semantic Embeddings:</strong>{' '}
                    {result.ragStatus.semanticEmbeddingsUsed
                      ? `Enabled (${result.ragStatus.embeddingModel})`
                      : 'Lexical BM25 Fallback'}
                  </div>
                  <div>
                    <strong>Successful Sources ({result.retrievalStatus.successfulSources.length}):</strong>{' '}
                    {result.retrievalStatus.successfulSources.join(', ') || 'Cached Persistent RAG Store'}
                  </div>
                  <div>
                    <strong>Queried Connectors ({result.retrievalStatus.queriedSources.length}):</strong>{' '}
                    {result.retrievalStatus.queriedSources.join(', ') || 'Persistent SQLite Index'}
                  </div>
                </div>
                {result.retrievalStatus.failedSources.length > 0 && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xs text-[11px] text-amber-900 space-y-1">
                    <strong>Blocked / Failed Source Notices:</strong>
                    <ul className="list-disc pl-4">
                      {result.retrievalStatus.failedSources.map((fs, i) => (
                        <li key={i}>
                          <strong>{fs.source}:</strong> {fs.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Evidence-Backed Key Findings & 3. Problem Analysis */}
          {result.status !== 'insufficient_evidence' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Findings */}
              <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#F97316]" />
                  <span>2. Evidence-Based Key Findings</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-[#047857]/90">
                  {result.keyFindings.map((finding, idx) => (
                    <li
                      key={idx}
                      className="p-3 bg-[#f9fbfa] border-l-3 border-[#047857] rounded-xs leading-relaxed"
                    >
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Problem Analysis & Root-Cause Hypotheses */}
              <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#F97316]" />
                  <span>3. Civic Problem Analysis & Cause Hypotheses</span>
                </h3>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[#047857]">
                    Documented Evidence-Supported Factors:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#047857]/85">
                    {result.problemAnalysis.evidenceSupportedFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[#F97316]">
                    Plausible Root-Cause Hypotheses (Requiring Field Verification):
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#047857]/85">
                    {result.problemAnalysis.rootCauseHypotheses.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>

                {result.problemAnalysis.uncertainties.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-neutral-700">
                      Unresolved Questions & Data Uncertainties:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600">
                      {result.problemAnalysis.uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. AI-Generated Recommended Solutions */}
          {result.recommendedSolutions.length > 0 && (
            <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#F97316]" />
                  <span>4. AI-Generated Actionable Solutions</span>
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xs font-semibold">
                  AI Recommendations — Distinct from Official Government Policy Announcements
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recommendedSolutions.map((sol, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-[#047857] text-sm">
                        {idx + 1}. {sol.action}
                      </h4>
                      <span className="px-2 py-0.5 bg-[#047857]/10 text-[#047857] text-[10px] font-bold rounded-xs shrink-0">
                        {sol.responsibleStakeholder}
                      </span>
                    </div>

                    <p className="text-[#047857]/85 leading-relaxed">
                      <strong>Why It Helps:</strong> {sol.whyItHelps}
                    </p>
                    <p className="text-[#047857]/80 leading-relaxed">
                      <strong>Supporting Evidence:</strong> {sol.supportingEvidence}
                    </p>

                    {sol.implementationSteps.length > 0 && (
                      <div>
                        <strong className="text-[#047857]">Implementation Steps:</strong>
                        <ol className="list-decimal pl-5 mt-1 space-y-0.5 text-[#047857]/85">
                          {sol.implementationSteps.map((step, sIdx) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {sol.constraintsAndRisks.length > 0 && (
                      <div className="text-amber-900 bg-amber-50/60 p-2 rounded-xs border border-amber-200/70">
                        <strong>Constraints & Risks:</strong> {sol.constraintsAndRisks.join(' • ')}
                      </div>
                    )}

                    <div className="pt-1 border-t border-[#047857]/10 text-[#047857]/90">
                      <strong>Expected Outcome:</strong> {sol.expectedOutcome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Relevant Stakeholders */}
          {result.stakeholders.length > 0 && (
            <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F97316]" />
                <span>6. Relevant Authorities & Verified Stakeholders</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.stakeholders.map((stk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#f9fbfa] border border-[#047857]/15 rounded-xs space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#047857]">{stk.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#047857]/10 text-[#047857] rounded-xs font-semibold">
                        {stk.organizationType}
                      </span>
                    </div>
                    <p className="text-[#047857]/80 text-[11px] leading-relaxed">{stk.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Verifiable Source Citations */}
          {result.sources.length > 0 && (
            <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F97316]" />
                <span>7. Verified Retrieved Source Citations ({result.sources.length} Passages)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <span className="font-bold bg-[#047857] text-white px-2 py-0.5 rounded-xs">
                        Passage {idx + 1} • Page {src.pageNumber ?? 1}
                      </span>
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-xs font-mono text-[10px]">
                        {src.retrievalType}
                      </span>
                    </div>

                    <div className="font-bold text-[#047857]">
                      {src.sourceName} — {src.title}
                    </div>
                    {src.section && (
                      <div className="text-[11px] text-[#047857]/75 font-semibold">
                        Section: {src.section}
                      </div>
                    )}

                    <p className="text-xs text-[#047857]/85 italic bg-white p-2.5 border border-[#047857]/10 rounded-xs leading-relaxed">
                      "{src.excerpt}"
                    </p>

                    <div className="pt-2 border-t border-[#047857]/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#047857]/70">
                      <span>
                        Published: <strong>{src.publishedDate || 'Official Record'}</strong> • Score:{' '}
                        <strong>{src.relevanceScore}</strong>
                      </span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#047857] hover:underline font-bold flex items-center gap-1"
                      >
                        <span>Open Verified Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Google Search Grounding Supplement */}
          {result.googleSearchGrounding && result.googleSearchGrounding.length > 0 && (
            <div className="bg-white border border-[#047857]/20 rounded-xs p-4 shadow-2xs space-y-2">
              <div className="text-xs font-bold text-[#047857] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#F97316]" />
                <span>Supplementary Google Search Grounded Links (Distinct from BeautifulSoup & RAG Store):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.googleSearchGrounding.map((g, i) => (
                  <a
                    key={i}
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-[#f4f7f5] hover:bg-[#e6ece8] text-[#047857] border border-[#047857]/20 rounded-xs text-xs flex items-center gap-1"
                  >
                    <span>{g.title}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 9. Evidence Dates, Provenance & Limitations */}
          <div className="p-4 bg-neutral-50 border border-neutral-300 rounded-xs text-xs text-neutral-800 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-[#047857]">
              <ShieldCheck className="w-4 h-4 text-[#047857]" />
              <span>9. Evidence Dates, Historical Disclaimers & Limitations</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-700 leading-relaxed">
              {result.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
              <li>
                Historical audit reports (such as Praja Foundation's May 2025 Mumbai Civic Status Report) document systemic multi-year patterns and are not presented as live emergency proof today.
              </li>
            </ul>
            <div className="text-[10px] font-mono text-neutral-500 pt-1">
              Generated At: {new Date(result.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RagExplorerView;
