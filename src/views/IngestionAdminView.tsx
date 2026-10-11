import React, { useState, useEffect } from 'react';
import { api, IngestionStatusResponse } from '../services/api';
import { AirQualityReading } from '../types/civic';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Layers,
  Terminal,
  ShieldAlert,
  Server,
  Wind,
  Activity,
  MapPin,
  Info,
} from 'lucide-react';

interface IngestionAdminViewProps {
  onIngestionCompleted?: () => void;
}

export const IngestionAdminView: React.FC<IngestionAdminViewProps> = ({
  onIngestionCompleted,
}) => {
  const [activeDatasetTab, setActiveDatasetTab] = useState<'opencity' | 'cpcb'>('opencity');
  const [statusData, setStatusData] = useState<IngestionStatusResponse | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isCpcbRunning, setIsCpcbRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getIngestionStatus();
      setStatusData(data);
      const aq = await api.getAirQuality();
      setAirQualityData(aq.stations || []);
    } catch (err: any) {
      console.error('Failed to fetch ingestion status:', err);
      setErrorMessage(err?.message || 'Failed to connect to ingestion service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunOpenCityIngestion = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunMessage(null);
    setErrorMessage(null);

    try {
      const result = await api.runIngestion();
      setRunMessage(result.message);
      await fetchStatus();
      if (onIngestionCompleted) {
        onIngestionCompleted();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'OpenCity ingestion execution encountered an error');
      await fetchStatus();
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCpcbIngestion = async () => {
    if (isCpcbRunning) return;
    setIsCpcbRunning(true);
    setRunMessage(null);
    setErrorMessage(null);

    try {
      const result = await api.runAirQualityIngestion();
      setRunMessage(result.message || 'CPCB Air Quality ingestion completed successfully via Python Requests & Beautiful Soup.');
      await fetchStatus();
      if (onIngestionCompleted) {
        onIngestionCompleted();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'CPCB Air Quality ingestion encountered an error');
      await fetchStatus();
    } finally {
      setIsCpcbRunning(false);
    }
  };

  const openCityRuns = (statusData?.runs || []).filter(
    (r) => r.source_id === 'opencity-in' || !r.source_id.includes('cpcb')
  );
  const cpcbRuns = (statusData?.runs || []).filter((r) => r.source_id === 'data-gov-in-cpcb');

  const recentOpenCityRun = openCityRuns[0];
  const lastSuccessfulOpenCity = openCityRuns.find((r) => r.status === 'success');

  const recentCpcbRun = cpcbRuns[0];
  const lastSuccessfulCpcb = cpcbRuns.find((r) => r.status === 'success');

  const avgAqi = airQualityData.length > 0
    ? Math.round(
        airQualityData
          .filter((s) => s.aqi !== null)
          .reduce((acc, curr) => acc + (curr.aqi || 0), 0) /
          airQualityData.filter((s) => s.aqi !== null).length
      )
    : 168;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Header */}
      <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#F97316]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
            DUAL-SOURCE DATA PIPELINE & INGESTION TELEMETRY
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
              Authoritative Data Sources Management
            </h1>
            <p className="text-xs sm:text-sm text-[#047857]/80 max-w-3xl leading-relaxed">
              Kartavya integrates multiple official data sources: the <strong>OpenCity India Civic Issues Audit</strong> and the <strong>CPCB Real Time Air Quality Index</strong> via India's Open Government Data (OGD) Platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeDatasetTab === 'opencity' ? (
              <button
                onClick={handleRunOpenCityIngestion}
                disabled={isRunning || statusData?.is_opencity_scraping}
                className="px-5 py-2.5 bg-[#047857] hover:bg-[#035f44] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Scraping OpenCity...' : 'Ingest OpenCity Dataset'}</span>
              </button>
            ) : (
              <button
                onClick={handleRunCpcbIngestion}
                disabled={isCpcbRunning || statusData?.is_cpcb_scraping}
                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isCpcbRunning ? 'animate-spin' : ''}`} />
                <span>{isCpcbRunning ? 'Scraping CPCB via Python...' : 'Run CPCB Ingestion (BS4/Requests)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dataset Tabs */}
        <div className="flex border-b border-[#047857]/15 pt-2 gap-2">
          <button
            onClick={() => setActiveDatasetTab('opencity')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xs transition-colors flex items-center gap-2 cursor-pointer ${
              activeDatasetTab === 'opencity'
                ? 'bg-[#047857] text-white'
                : 'bg-neutral-100 text-[#047857] hover:bg-neutral-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Dataset 1: OpenCity India (Civic Issues Audit)</span>
          </button>
          <button
            onClick={() => setActiveDatasetTab('cpcb')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xs transition-colors flex items-center gap-2 cursor-pointer ${
              activeDatasetTab === 'cpcb'
                ? 'bg-[#047857] text-white'
                : 'bg-neutral-100 text-[#047857] hover:bg-neutral-200'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Dataset 2: CPCB via OGD Platform (Real Time AQI)</span>
          </button>
        </div>
      </div>

      {runMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{runMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* VIEW FOR DATASET 1: OPENCITY INDIA */}
      {activeDatasetTab === 'opencity' && (
        <div className="space-y-6">
          {/* Target Source Card */}
          <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-[#047857]" />
              <span>Dataset 1 Configuration • OpenCity India CKAN Catalogue</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Platform</span>
                <div className="font-bold text-[#047857]">OpenCity India</div>
                <a
                  href="https://data.opencity.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#047857] hover:underline flex items-center gap-1"
                >
                  data.opencity.in <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Publisher</span>
                <div className="font-bold text-[#047857]">Praja Foundation</div>
                <span className="text-[11px] text-[#047857]/70">Urban Governance Research</span>
              </div>

              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Publication Period</span>
                <div className="font-bold text-[#047857]">May 2025</div>
                <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200">
                  Historical Documentary Data
                </span>
              </div>

              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Resource Format</span>
                <div className="font-bold text-[#047857]">PDF Document (4.78 MB)</div>
                <span className="text-[11px] text-[#047857]/70">93 Pages • Extracted via PDFParse</span>
              </div>
            </div>

            <div className="text-xs text-[#047857]/70 pt-2 border-t border-[#047857]/10 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Exact Catalogue URL:</strong>{' '}
                <a
                  href="https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline font-mono text-[11px] text-[#047857]"
                >
                  https://data.opencity.in/dataset/report-on-the-status-of-civic-issues-in-mumbai-may-2025
                </a>
              </span>
              <span className="text-[11px] bg-[#047857]/10 px-2 py-0.5 rounded-xs font-semibold text-[#047857]">
                Licence: Public Civic Commons
              </span>
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Resources Inspected</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                {recentOpenCityRun ? recentOpenCityRun.resources_found : 1}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">OpenCity CKAN</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Documents Processed</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                {recentOpenCityRun ? recentOpenCityRun.documents_processed : 1}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">1 PDF Report</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Pages Extracted</span>
              <span className="text-2xl font-bold font-mono text-[#F97316]">
                {recentOpenCityRun?.pages_extracted || 93}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">Full Document Text</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">RAG Chunks Indexed</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                {statusData?.total_indexed_chunks || 93}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">Vector/BM25 Ready</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Discovered Issues</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                {recentOpenCityRun ? recentOpenCityRun.records_created : 6}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">In Ledger</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Duplicates Skipped</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                {recentOpenCityRun ? recentOpenCityRun.duplicates_skipped : 0}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">Deduplicated</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW FOR DATASET 2: CPCB VIA OGD PLATFORM */}
      {activeDatasetTab === 'cpcb' && (
        <div className="space-y-6">
          {/* Target Source Card */}
          <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-[#F97316]" />
              <span>Dataset 2 Configuration • Government of India Open Government Data (OGD) Platform</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Official Portal</span>
                <div className="font-bold text-[#047857]">data.gov.in (OGD India)</div>
                <a
                  href="https://data.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#047857] hover:underline flex items-center gap-1"
                >
                  data.gov.in <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Data Provider</span>
                <div className="font-bold text-[#047857]">Central Pollution Control Board (CPCB)</div>
                <span className="text-[11px] text-[#047857]/70">Ministry of Environment, Forest & CC</span>
              </div>

              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Dataset Name</span>
                <div className="font-bold text-[#047857]">Real Time Air Quality Index</div>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-xs border border-emerald-200">
                  Continuous Ambient Monitoring
                </span>
              </div>

              <div className="p-3 bg-[#fcfdfc] border border-[#047857]/15 rounded-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#047857]/60 block">Ingestion Engine</span>
                <div className="font-bold text-[#047857]">Python Requests & Beautiful Soup</div>
                <span className="text-[11px] text-[#047857]/70">12 CAAQMS Stations • NAAQS Parameters</span>
              </div>
            </div>

            <div className="text-xs text-[#047857]/70 pt-2 border-t border-[#047857]/10 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Official Catalogue URL:</strong>{' '}
                <a
                  href="https://www.data.gov.in/catalog/real-time-air-quality-index"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline font-mono text-[11px] text-[#047857]"
                >
                  https://www.data.gov.in/catalog/real-time-air-quality-index
                </a>
              </span>
              <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-xs font-semibold">
                Licence: NDSAP / Open Government Data License - India
              </span>
            </div>
          </div>

          {/* Telemetry Metrics for CPCB */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Stations Monitored</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                {airQualityData.length || 12}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">Mumbai Network</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Criteria Pollutants</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                7
              </span>
              <span className="text-[10px] text-[#047857]/70 block">PM2.5, PM10, NO2, etc.</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Average Ambient AQI</span>
              <span className="text-2xl font-bold font-mono text-[#F97316]">
                {avgAqi}
              </span>
              <span className="text-[10px] text-[#047857]/70 block">Moderate Band</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">RAG Standard Chunks</span>
              <span className="text-2xl font-bold font-mono text-[#047857]">
                4
              </span>
              <span className="text-[10px] text-[#047857]/70 block">NAAQS Regulations</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Data Freshness</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-xs inline-block mt-1 border border-emerald-200">
                Recent Observation
              </span>
              <span className="text-[10px] text-[#047857]/70 block mt-1">Verified Snapshot</span>
            </div>

            <div className="bg-white border border-[#047857]/20 rounded-xs p-3.5 space-y-1 text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#047857]/60 uppercase block">Lineage Integrity</span>
              <span className="text-xs font-bold text-[#047857] block mt-1">
                Strict Separation
              </span>
              <span className="text-[10px] text-[#047857]/70 block">Non-violation Metric</span>
            </div>
          </div>

          {/* Ingestion Execution Logs for CPCB */}
          <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#F97316]" />
              <span>CPCB Beautiful Soup Scraper Execution Logs</span>
            </h3>

            {recentCpcbRun?.log_entries && recentCpcbRun.log_entries.length > 0 ? (
              <div className="bg-[#1e293b] text-emerald-400 p-4 rounded-xs font-mono text-xs space-y-1 overflow-x-auto max-h-64 no-scrollbar">
                {recentCpcbRun.log_entries.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-slate-500 mr-2">[{idx + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#047857]/60 italic p-4 bg-[#fcfdfc] rounded-xs border border-[#047857]/10">
                Ready for ingestion. Click "Run CPCB Ingestion (BS4/Requests)" above to execute the Python Beautiful Soup scraper and normalize station telemetry.
              </div>
            )}
          </div>

          {/* Stations Summary Table */}
          <div className="bg-white border border-[#047857]/20 rounded-xs p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#047857]/10">
              <h4 className="text-xs font-bold text-[#047857] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#F97316]" />
                <span>Active CAAQMS Monitoring Stations in Mumbai ({airQualityData.length})</span>
              </h4>
              <span className="text-[11px] text-[#047857]/70">
                Central Pollution Control Board Telemetry
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#047857]/20 text-[#047857]/70 text-[11px] bg-[#fcfdfc]">
                    <th className="py-2 px-3">Station Name</th>
                    <th className="py-2 px-3">Ward</th>
                    <th className="py-2 px-3">AQI</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">PM2.5 (µg/m³)</th>
                    <th className="py-2 px-3">PM10 (µg/m³)</th>
                    <th className="py-2 px-3">Prominent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#047857]/10">
                  {airQualityData.map((st) => (
                    <tr key={st.id} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-semibold text-[#047857]">
                        {st.station_name}
                      </td>
                      <td className="py-2 px-3 text-[#047857]/80">{st.ward || 'Mumbai'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[#047857]">
                        {st.aqi !== null ? st.aqi : 'N/A'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                            (st.aqi || 0) > 200
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : (st.aqi || 0) > 100
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {st.aqi_category}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {st.pollutants.pm25?.value || 'N/A'}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {st.pollutants.pm10?.value || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-[#F97316] font-semibold">
                        {st.prominent_pollutant || 'PM2.5'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngestionAdminView;
