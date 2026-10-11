import React, { useState } from 'react';
import { api } from '../services/api';
import { RagQueryResponse } from '../types/civic';
import {
  HelpCircle,
  Search,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const PRESET_QUERIES = [
  {
    label: 'En-route water transmission loss',
    query: 'What is the exact percentage of en-route water transmission loss in Mumbai documented in the report?',
    testType: 'Test 6 (Supported Evidence - Page 11)',
  },
  {
    label: 'Unfit drinking water in wards',
    query: 'Which wards recorded the highest proportion of unfit drinking water samples?',
    testType: 'Test 6 (Supported Evidence - Page 16)',
  },
  {
    label: 'Toilet seats for women in slums',
    query: 'What does Table 30 establish regarding community toilet seat ratios for women in informal settlements?',
    testType: 'Test 6 (Supported Evidence - Page 53)',
  },
  {
    label: 'Winter PM2.5 air pollution exceedances',
    query: 'How many days did air quality monitoring stations exceed PM2.5 standards in Mumbai industrial zones?',
    testType: 'Test 6 (Supported Evidence - Page 60)',
  },
  {
    label: 'CPCB NAAQS standards & Chembur AQI',
    query: 'What are the CPCB National Ambient Air Quality Standards (NAAQS) for PM2.5 and PM10, and what are current monitoring readings in Chembur?',
    testType: 'Dataset 2 Grounding (CPCB + OGD Telemetry)',
  },
  {
    label: 'Mumbai CAAQMS Monitoring Network',
    query: 'Which continuous ambient air quality monitoring (CAAQMS) stations are operated in Mumbai under CPCB and MPCB?',
    testType: 'Dataset 2 Grounding (CPCB Stations)',
  },
  {
    label: "Mayor's personal phone number (Test 7)",
    query: "What is the personal mobile phone number of the Municipal Commissioner or Mayor?",
    testType: 'Test 7 (Insufficient Evidence Test)',
  },
  {
    label: 'Civic issues in London (Test 7)',
    query: 'What are the road traffic and civic drainage issues in London and Tokyo?',
    testType: 'Test 7 (Insufficient Evidence Test)',
  },
];

export const RagExplorerView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All Domains');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RagQueryResponse | null>(null);
  const [liveSummary, setLiveSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const DOMAINS = [
    'All Domains',
    'Water Supply',
    'Sewerage & Drainage',
    'Solid Waste Management',
    'Public Sanitation & Toilets',
    'Air Quality & Pollution',
    'Roads & Infrastructure',
  ];

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const [ragRes, liveRes] = await Promise.all([
        api.queryRag(q),
        api.liveDomainSearch(selectedDomain, q).catch(() => null),
      ]);
      setResponse(ragRes);
      setLiveSummary(liveRes);
      setQuery(q);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute live domain web scraping and RAG query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Introduction */}
      <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#F97316]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
            AI CIVIC SEARCH & PROBLEM ANALYSIS ENGINE
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
          AI Civic Search & Problem Analysis across 6 Domains
        </h1>
        <p className="text-xs sm:text-sm text-[#047857]/80 max-w-4xl leading-relaxed">
          Search across 6 official civic domains. The system automatically performs live website scraping, parses official audit datasets (OpenCity India & CPCB), and applies <strong>Gemini AI Search Grounding</strong> to generate accurate problem analysis, summaries, and verified source citations.
        </p>
      </div>

      {/* Query Input Box */}
      <div className="bg-white border border-[#047857]/15 rounded-xs p-5 shadow-2xs space-y-4">
        {/* 6 Civic Domains Filter Bar */}
        <div className="space-y-2 pb-3 border-b border-[#047857]/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#047857] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#F97316]" />
              Select Target Domain for Web Scraping & RAG Search (6 Official Domains):
            </span>
            <span className="text-[10px] font-mono text-[#047857]/60">
              Active: {selectedDomain}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DOMAINS.map((domain) => (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`px-3 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
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

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#047857]/50" />
            <input
              type="text"
              placeholder="Ask any question about water deficit, sewerage, solid waste, public toilets, or air quality..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#fbfbfb] border border-[#047857]/20 rounded-xs focus:outline-hidden focus:border-[#047857] text-[#047857]"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-5 py-2 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs shrink-0"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Scraping & Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Civic Search</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Prompt Chips */}
        <div className="space-y-2 pt-2 border-t border-[#047857]/10">
          <div className="text-[11px] font-semibold text-[#047857]/70">
            Suggested Verification Prompts (Acceptance Tests 6 & 7):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(preset.query)}
                className="text-left p-2.5 rounded-xs bg-[#f4f7f5] hover:bg-[#e6ece8] border border-[#047857]/15 transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-[#047857] group-hover:text-[#035f44]">
                  {preset.label}
                </div>
                <div className="text-[10px] text-[#F97316] font-semibold mt-0.5">
                  {preset.testType}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-xs">
          <strong>Query Error:</strong> {error}
        </div>
      )}

      {/* RAG Response Section */}
      {response && (
        <div className="space-y-6">
          {/* Live Web Scraping & Gemini Summarizer Card */}
          {liveSummary && (
            <div className="bg-[#fcfdfc] border border-[#047857]/30 rounded-xs p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#047857]/15 gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F97316]" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#F97316] block">
                      LIVE WEB SCRAPING & GEMINI SUMMARIZER ({liveSummary.domain})
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#047857]">
                      Real-Time Data Center Analysis & Problem Summary
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#047857]/10 text-[#047857] text-[11px] font-bold rounded-xs">
                    {liveSummary.records_analyzed} Records Scraped & Analyzed
                  </span>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-[#047857]/90 leading-relaxed whitespace-pre-line bg-white p-4 border border-[#047857]/15 rounded-xs">
                {liveSummary.summary}
              </div>

              <div className="pt-2 border-t border-[#047857]/10 flex flex-wrap items-center justify-between text-[11px] text-[#047857]/70 gap-2">
                <div>
                  <strong>Source Attribution:</strong> {liveSummary.source_attribution.source_name} ({liveSummary.source_attribution.dataset_title})
                </div>
                <div className="font-mono text-[10px]">
                  Retrieved: {new Date(liveSummary.source_attribution.retrieved_at).toLocaleString()}
                </div>
              </div>
            </div>
          )}

        <div className="bg-white border border-[#047857]/20 rounded-xs p-6 shadow-2xs space-y-6">
          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#047857]/15 gap-2">
            <div className="flex items-center gap-2">
              {response.evidence_sufficient ? (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Evidence Sufficient — Verified in Retrieved Passages
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold rounded-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Evidence Insufficient — Not Documented in Ingested Report
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-[#047857]/70">
              Model: {response.model_used}
            </div>
          </div>

          {/* User Query Echo */}
          <div className="text-xs text-[#047857]/70">
            <strong>Question:</strong> "{response.query}"
          </div>

          {/* AI Grounded Answer */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#047857] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F97316]" />
              <span>Grounded Retrieval Response</span>
            </h3>
            <div className="p-4 bg-[#fcfdfc] border border-[#047857]/20 rounded-xs text-xs sm:text-sm text-[#047857] leading-relaxed whitespace-pre-wrap font-sans">
              {response.answer}
            </div>
          </div>

          {/* Retrieved Citations & Passages */}
          {response.citations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#047857] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#047857]" />
                <span>Retrieved Source Citations ({response.citations.length} Passages)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {response.citations.map((cite, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-[#047857]/20 rounded-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#047857]">
                      <span className="font-bold bg-[#047857]/10 px-1.5 py-0.5 rounded-xs">
                        Page {cite.page_number}
                      </span>
                      <span className="text-[10px] text-[#047857]/70">
                        {cite.section}
                      </span>
                    </div>

                    <p className="text-xs text-[#047857]/80 italic line-clamp-3">
                      "{cite.excerpt}"
                    </p>

                    <div className="pt-2 border-t border-[#047857]/10 flex items-center justify-between text-[10px] text-[#047857]/60">
                      <span>BM25 Relevance: {cite.score}</span>
                      <a
                        href={cite.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#047857] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>OpenCity Dataset</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limitations & Provenance Disclaimer */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs text-xs text-neutral-700 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#047857]" />
              <span>Evidence Provenance & Limitations:</span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              {response.limitations} The primary source is the <em>Report on the Status of Civic Issues in Mumbai (May 2025)</em> by Praja Foundation. Kartavya strictly separates documentary findings from live emergencies.
            </p>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default RagExplorerView;
