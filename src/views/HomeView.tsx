import React, { useState } from 'react';
import { Search, MapPin, Check, ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react';
import { CivicIssue, IMAGES } from '../data/civicData';
import { ActiveTab } from '../components/Header';

interface HomeViewProps {
  issues: CivicIssue[];
  onSelectIssue: (issueId: string) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  issues,
  onSelectIssue,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const [selectedDomain, setSelectedDomain] = useState<string>('Air Quality & Environment');
  const [domainSearchQuery, setDomainSearchQuery] = useState<string>('Current environmental status and critical problems');
  const [isScrapingDomain, setIsScrapingDomain] = useState<boolean>(false);
  const [domainSummaryResult, setDomainSummaryResult] = useState<any | null>(null);

  const sixDomains = [
    'Air Quality & Environment',
    'Waste Management & Sanitation',
    'Roads & Infrastructure',
    'Water Supply & Drainage',
    'Public Health & Hospitals',
    'Public Safety & Fire Brigade',
  ];

  const handleRunDomainScraper = async (domainToRun?: string) => {
    const dom = domainToRun || selectedDomain;
    setIsScrapingDomain(true);
    try {
      const res = await fetch('/api/live-domain-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: dom, query: domainSearchQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setDomainSummaryResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScrapingDomain(false);
    }
  };

  const categories = [
    'All Categories',
    'Waste Management',
    'Roads & Infrastructure',
    'Water Supply',
    'Public Safety',
    'Environmental Concerns',
  ];

  const severities = ['All', 'High Priority', 'Moderate', 'Under Review'];
  const statuses = ['All', 'Open Issues', 'Authority Notified', 'Citizen Action Active', 'Resolved'];

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All Categories' || issue.category === selectedCategory;

    const matchesSeverity =
      selectedSeverity === 'All' ||
      (selectedSeverity === 'High Priority' && (issue.severity === 'High Priority' || issue.severity === 'Critical')) ||
      issue.severity === selectedSeverity;

    const matchesStatus =
      selectedStatus === 'All' ||
      issue.status === selectedStatus ||
      (selectedStatus === 'Open Issues' && (issue.status === 'Open Issues' || issue.status === 'Under Investigation'));

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Hero Left Column */}
            <div className="lg:col-span-6 space-y-6 pt-2">
              <div>
                <span className="inline-block text-[11px] font-bold tracking-widest text-[#F97316] uppercase px-2.5 py-1 border border-[#F97316]/40 rounded-xs bg-[#F97316]/5 mb-3">
                  COMMUNITY ACTION PLATFORM
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-[#047857] tracking-tight leading-[1.12]">
                  See the issue. <br />
                  Be the change.
                </h1>
              </div>

              <p className="text-sm sm:text-base text-[#047857]/85 leading-relaxed max-w-xl">
                Kartavya turns civic responsibility into real-world action. Discover verified municipal and environmental issues from public data, connect with local authorities and NGOs, and join hands-on community volunteering.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const el = document.getElementById('explorer-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xs transition-colors shadow-xs cursor-pointer"
                >
                  Explore Civic Issues
                </button>
                <button
                  onClick={() => onNavigate('volunteer')}
                  className="px-6 py-3 bg-white border border-[#047857] hover:bg-[#047857]/5 text-[#047857] text-xs sm:text-sm font-bold rounded-xs transition-colors cursor-pointer"
                >
                  Become a Volunteer
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-3 text-xs font-semibold text-[#047857]">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#047857] stroke-[3]" />
                  <span>1,420+ Verified Issues Tracked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#047857] stroke-[3]" />
                  <span>88 Active Civic Drives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#047857] stroke-[3]" />
                  <span>Direct Authority Escalation</span>
                </div>
              </div>
            </div>

            {/* Hero Right Column: Live Civic Discovery Card */}
            <div className="lg:col-span-6">
              <div className="bg-white border border-[#047857]/25 rounded-xs p-5 shadow-xs hover:border-[#047857] transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-[#047857]/15">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#047857]"></span>
                    <span className="text-[11px] font-bold tracking-wider text-[#047857] uppercase">
                      LIVE CIVIC DISCOVERY
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#F97316] px-1.5 py-0.5 border border-[#F97316]/40 rounded-xs uppercase">
                    DEMONSTRATION DATA
                  </span>
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-[#047857]/70">
                      Ward 142, Bengaluru • 2h ago
                    </span>
                    <span className="text-[10px] font-bold text-[#F97316] px-2 py-0.5 border border-[#F97316] rounded-full uppercase">
                      High Severity
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[#047857] leading-snug mb-3">
                    Illegal Industrial Waste Dumping near Vrishabhavathi Canal
                  </h3>

                  <div className="relative rounded-xs overflow-hidden border border-[#047857]/20 mb-4 bg-slate-100 aspect-16/9">
                    <img
                      src={IMAGES.canalWaste}
                      alt="Vrishabhavathi Canal Waste Dumping"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/75 text-white px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 backdrop-blur-xs">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verified Geo-Coordinate #12.9142, 77.4988</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#047857]/80">
                    <div>
                      <span className="font-semibold text-[#047857] block">Verification Source</span>
                      <span>Public Pollution Control Board Feed & Citizen Geo-Tag</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#047857] block">Assigned Authority</span>
                      <span>Karnataka State Pollution Control Board (KSPCB)</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#047857] block">Community Mobilization</span>
                      <span>12 Citizens mobilized for inspection & petition drive this Saturday</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#047857]/15 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#047857]">
                      ID: KRT-BLR-2025-04
                    </span>
                    <button
                      onClick={() => onSelectIssue('KTV-2024-8841')}
                      className="px-4 py-2 bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                    >
                      View & Join Response
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Data Center Web Scraping & Gemini Domain Summarizer Section */}
      <section className="bg-[#047857]/5 border-y border-[#047857]/20 py-10 my-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#F97316] uppercase block mb-1">
                AUTOMATED WEB SCRAPING & GEMINI INTELLIGENCE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
                Live Data Center Domain Hub (6 Core Domains)
              </h2>
              <p className="text-xs sm:text-sm text-[#047857]/80 mt-1 max-w-3xl">
                Choose a municipal or environmental domain below. Kartavya automatically connects to official data centers via web scraping, retrieves active telemetry and problem records, and synthesizes an AI problem summary using Gemini.
              </p>
            </div>
          </div>

          {/* 6 Domain Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {sixDomains.map((dom) => (
              <button
                key={dom}
                onClick={() => {
                  setSelectedDomain(dom);
                  handleRunDomainScraper(dom);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xs transition-all cursor-pointer flex items-center gap-2 ${
                  selectedDomain === dom
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'bg-white border border-[#047857]/30 text-[#047857] hover:bg-[#047857]/10'
                }`}
              >
                <span>{dom}</span>
              </button>
            ))}
          </div>

          {/* Domain Search & Trigger Bar */}
          <div className="bg-white border border-[#047857]/30 p-4 rounded-xs shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#047857]/50" />
                <input
                  type="text"
                  value={domainSearchQuery}
                  onChange={(e) => setDomainSearchQuery(e.target.value)}
                  placeholder={`Search query for ${selectedDomain} (e.g., critical bottlenecks, compliance failures)...`}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#047857]/30 rounded-xs text-[#047857] placeholder-[#047857]/45 focus:border-[#F97316] focus:outline-hidden"
                />
              </div>
              <button
                onClick={() => handleRunDomainScraper()}
                disabled={isScrapingDomain}
                className="px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-400 text-white text-xs sm:text-sm font-bold rounded-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                {isScrapingDomain ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Scraping Data Center...</span>
                  </>
                ) : (
                  <>
                    <span>Scrape & Summarize with Gemini</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Display Area */}
            {domainSummaryResult && (
              <div className="mt-4 pt-4 border-t border-[#047857]/15 space-y-3 bg-[#047857]/2 p-4 rounded-xs border border-[#047857]/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-[#047857]">
                      Live Scraping Result: {domainSummaryResult.domain}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#047857]/70">
                    Records Analyzed: {domainSummaryResult.records_analyzed} • Source: {domainSummaryResult.source_attribution?.source_name}
                  </div>
                </div>

                <div className="bg-white border border-[#047857]/20 p-4 rounded-xs text-xs text-[#047857]/90 leading-relaxed whitespace-pre-line font-sans">
                  {domainSummaryResult.summary}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Civic Issue Explorer Section */}
      <section id="explorer-section" className="pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#F97316] uppercase block mb-1">
                EXPLORE PUBLIC DATABASE
              </span>
              <h2 className="text-3xl font-extrabold text-[#047857] tracking-tight">
                Civic Issue Explorer
              </h2>
              <p className="text-xs sm:text-sm text-[#047857]/80 mt-1 max-w-2xl">
                Live municipal tracking cross-referenced across municipal ward feeds, citizen geotagged submissions, and local activist verifications.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
              <span className="w-2 h-2 rounded-full bg-[#047857]"></span>
              <span>38 New verified issues today</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#047857]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues by keyword, ward, or city (e.g., Water Contamination, Potholes, Indiranagar)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#047857]/30 rounded-xs text-[#047857] placeholder-[#047857]/45 focus:border-[#F97316] focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => {}}
              className="px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xs transition-colors shrink-0 cursor-pointer"
            >
              Search Issues
            </button>
          </div>

          {/* Filter Rows */}
          <div className="mt-4 space-y-2.5 text-xs">
            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[#047857] w-20 shrink-0">
                CATEGORY:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs border transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#F97316] border-[#F97316] text-white font-semibold'
                      : 'bg-white border-[#047857]/25 text-[#047857] hover:border-[#047857]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Severity Filter & Status Filter row */}
            <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#047857] w-20 shrink-0">
                  SEVERITY:
                </span>
                {severities.map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2.5 py-0.5 text-[11px] rounded-xs border transition-colors cursor-pointer ${
                      selectedSeverity === sev
                        ? 'border-[#047857] bg-[#047857] text-white font-semibold'
                        : 'border-[#047857]/25 text-[#047857] hover:border-[#047857]'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[#047857] shrink-0">
                  STATUS:
                </span>
                {statuses.map((stat) => (
                  <button
                    key={stat}
                    onClick={() => setSelectedStatus(stat)}
                    className={`px-2.5 py-0.5 text-[11px] rounded-xs border transition-colors cursor-pointer ${
                      selectedStatus === stat
                        ? 'border-[#047857] bg-[#047857] text-white font-semibold'
                        : 'border-[#047857]/25 text-[#047857] hover:border-[#047857]'
                    }`}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Issue Cards Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIssues.slice(0, 6).map((issue) => (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue.id)}
                className="bg-white border border-[#047857]/20 rounded-xs overflow-hidden flex flex-col justify-between hover:border-[#047857] transition-all cursor-pointer group shadow-2xs"
              >
                <div>
                  <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
                    <img
                      src={issue.image}
                      alt={issue.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 border border-[#F97316] text-[#F97316] bg-white/95 rounded-xs uppercase">
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 border border-[#047857] text-[#047857] bg-white/95 rounded-xs uppercase">
                        {issue.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="text-[11px] font-medium text-[#047857]/70">
                      {issue.location}
                    </div>

                    <h3 className="text-base font-bold text-[#047857] group-hover:text-[#F97316] transition-colors leading-snug line-clamp-2">
                      {issue.title}
                    </h3>

                    <p className="text-xs text-[#047857]/80 line-clamp-3 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="pt-2 text-[11px] space-y-1 text-[#047857]">
                      <div className="flex justify-between">
                        <span className="font-semibold">Verified Source:</span>
                        <span className="text-[#047857]/70">{issue.verifiedSource}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Citizens Mobilized:</span>
                        <span className="font-semibold text-[#F97316]">
                          {issue.citizensMobilized} joined drive
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-2 border-t border-[#047857]/15 flex items-center justify-between">
                  <span className="text-[11px] text-[#047857]/60">Updated {issue.updatedAt}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIssue(issue.id);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
                      issue.severity === 'Critical' || issue.id === 'DL-ND-4412'
                        ? 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                        : 'bg-[#047857] hover:bg-[#065F46] text-white'
                    }`}
                  >
                    {issue.id === 'DL-ND-4412'
                      ? 'Join Clean-up Drive'
                      : issue.id === 'MH-MUM-7731'
                      ? 'Track Escalation'
                      : 'Inspect & Support'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Kartavya Works Section */}
      <section className="pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[11px] font-bold tracking-widest text-[#F97316] uppercase block mb-1">
              TRANSPARENT WORKFLOW
            </span>
            <h2 className="text-3xl font-extrabold text-[#047857] tracking-tight">
              How Kartavya Works
            </h2>
            <p className="text-xs sm:text-sm text-[#047857]/80 mt-1">
              From unaddressed civic failure to verified public remediation. Built on open accountability, verifiable records, and community mobilization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white border border-[#047857]/20 rounded-xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-[#047857]">01</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 border border-[#047857] text-[#047857] rounded-xs uppercase">
                    DATA INGESTION
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#047857] mb-2">1. Discover & Verify</h3>
                <p className="text-xs text-[#047857]/80 leading-relaxed mb-4">
                  Public datasets, citizen reports, and satellite signals analyzed for genuine civic impact. Every claim is validated through geotagging, public registry correlation, and duplicate detection.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-[#047857] pt-3 border-t border-[#047857]/15">
                • Automated Open Data Cross-Check
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-[#047857]/20 rounded-xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-[#F97316]">02</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 border border-[#F97316] text-[#F97316] rounded-xs uppercase">
                    FORMAL DOCKETING
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#047857] mb-2">2. Engage Authorities</h3>
                <p className="text-xs text-[#047857]/80 leading-relaxed mb-4">
                  Formal routing to municipal wards, pollution control boards, and ward counselors. Kartavya tracks response timelines against statutory citizen charter deadlines.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-[#047857] pt-3 border-t border-[#047857]/15">
                • Timestamped Public Audit Trails
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-[#047857]/20 rounded-xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold text-[#047857]">03</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 border border-[#047857] text-[#047857] rounded-xs uppercase">
                    GROUND IMPACT
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#047857] mb-2">3. Mobilize On-Ground</h3>
                <p className="text-xs text-[#047857]/80 leading-relaxed mb-4">
                  Citizens and local NGOs join hands for weekend drives, audits, and remediation. Follow up on resolutions until physical site confirmation is verified and closed publicly.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-[#047857] pt-3 border-t border-[#047857]/15">
                • Verification By Community Stewards
              </div>
            </div>
          </div>

          {/* Bottom Volunteer Call to Action Card */}
          <div className="mt-12 bg-white border border-[#047857]/25 rounded-xs p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#F97316] uppercase">
                CIVIC RESPONSIBILITY
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#047857]">
                Ready to take ownership of your neighborhood?
              </h3>
              <p className="text-xs sm:text-sm text-[#047857]/80">
                Join 3,200+ active residents conducting weekend field inspections and community audit drives.
              </p>
            </div>
            <button
              onClick={() => onNavigate('volunteer')}
              className="px-6 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Sign Up as Volunteer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
export default HomeView;
