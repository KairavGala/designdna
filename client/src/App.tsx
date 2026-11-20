import React, { useEffect, useState, useCallback } from 'react';
import {
  Dna,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Palette
} from 'lucide-react';
import { fetchHealth, type HealthResponse } from './services/api';

type ConnectionStatus = 'connecting' | 'connected' | 'error';

export const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsRefreshing(true);
    setStatus('connecting');
    setErrorMessage(null);

    try {
      const data = await fetchHealth();
      setHealthData(data);
      setStatus('connected');
    } catch (err) {
      console.error('Failed to connect to backend:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown connection error');
      setHealthData(null);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#202124] flex flex-col justify-between selection:bg-[#6258D9]/20 selection:text-[#6258D9]">
      {/* Top Navigation Bar */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6258D9] flex items-center justify-center text-white shadow-sm shadow-[#6258D9]/20">
              <Dna className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg tracking-tight text-[#202124]">DesignDNA</span>
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[#6258D9]/10 text-[#6258D9]">
                M1 Foundation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[#777B84] bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
              <Server className="w-3.5 h-3.5 text-[#777B84]" />
              <span className="hidden sm:inline">Backend:</span>
              {status === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Connecting
                </span>
              )}
              {status === 'connected' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              )}
              {status === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 text-[#777B84] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#6258D9]" />
            <span>AI-Powered Visual Design System Extractor</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#202124]">
              Transform Screenshots into <br className="hidden sm:inline" />
              <span className="text-[#6258D9]">Production-Ready</span> Design Systems
            </h1>
            <p className="text-base sm:text-lg text-[#777B84] max-w-xl mx-auto leading-relaxed">
              Extract precise color palettes, font hierarchies, component specs, and spacing tokens
              directly from website screenshots.
            </p>
          </div>

          {/* Foundation Health Card */}
          <div className="mt-8 bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-left shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between pb-5 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    status === 'connected'
                      ? 'bg-emerald-50 text-emerald-600'
                      : status === 'connecting'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {status === 'connected' && <CheckCircle2 className="w-5 h-5" />}
                  {status === 'connecting' && <RefreshCw className="w-5 h-5 animate-spin" />}
                  {status === 'error' && <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-[#202124]">
                    Backend Runtime Health
                  </h3>
                  <p className="text-xs text-[#777B84]">
                    Real-time status via Vite proxy forward to Express (<code className="text-stone-700 bg-stone-100 px-1 py-0.5 rounded">/api/health</code>)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={checkConnection}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 hover:bg-stone-50 text-[#202124] disabled:opacity-50 transition-colors cursor-pointer"
                title="Re-check health endpoint"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#6258D9]' : 'text-[#777B84]'}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Health Status Body */}
            <div className="pt-5 space-y-4">
              {status === 'connected' && healthData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[#777B84] block text-[11px] mb-1 font-medium">Status</span>
                    <span className="font-semibold text-emerald-600 uppercase tracking-wide">
                      {healthData.status}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[#777B84] block text-[11px] mb-1 font-medium">Uptime</span>
                    <span className="font-semibold text-[#202124] font-mono">
                      {healthData.uptime.toFixed(1)}s
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[#777B84] block text-[11px] mb-1 font-medium">Environment</span>
                    <span className="font-semibold text-[#202124] capitalize font-mono">
                      {healthData.environment}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[#777B84] block text-[11px] mb-1 font-medium">Server Time</span>
                    <span className="font-semibold text-[#202124] font-mono truncate block" title={healthData.timestamp}>
                      {new Date(healthData.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}

              {status === 'connecting' && (
                <div className="py-6 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#6258D9] mx-auto" />
                  <p className="text-xs text-[#777B84]">Pinging backend health check endpoint...</p>
                </div>
              )}

              {status === 'error' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Unable to reach Express backend
                  </p>
                  <p className="text-rose-600/90 pl-5">
                    {errorMessage || 'Failed to fetch from /api/health. Ensure the backend server is running on port 5000.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Architecture Feature Pillars (Previewing Milestone Scope) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6258D9]/10 text-[#6258D9] flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <h4 className="font-medium text-xs text-[#202124]">Measured Properties</h4>
              <p className="text-[11px] text-[#777B84] leading-relaxed">
                Deterministic Canvas pixel quantization for exact HEX and RGB palette values.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6258D9]/10 text-[#6258D9] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-medium text-xs text-[#202124]">AI-Inferred Tokens</h4>
              <p className="text-[11px] text-[#777B84] leading-relaxed">
                Gemini Flash intelligence structuring typography hierarchy, radius, and shadows.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#6258D9]/10 text-[#6258D9] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-medium text-xs text-[#202124]">Safe & Local-First</h4>
              <p className="text-[11px] text-[#777B84] leading-relaxed">
                No permanent image storage or database; API credentials remain server-side.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/50 py-5 text-center text-xs text-[#777B84]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DesignDNA &copy; 2026 &bull; Milestone 1: Application Foundation</span>
          <span className="flex items-center gap-1.5 text-[11px]">
            React + Vite + Tailwind v4 + Express 5
            <ArrowRight className="w-3 h-3 text-[#6258D9]" />
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
