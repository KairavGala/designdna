import React, { useCallback, useEffect, useState } from 'react';
import { Moon, RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchHealth, type HealthResponse } from '../services/api';
import { APP_MILESTONE, APP_VERSION, PRODUCT_POSITIONING } from '../types/navigation';
import { SecondaryButton } from '../components/ui/Buttons';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import { StatusIndicator } from '../components/ui/StatusIndicator';

type ConnectionStatus = 'connecting' | 'connected' | 'error';

const THEME_TOKENS = [
  { label: 'Canvas', hex: '#070B0D', swatchClass: 'bg-canvas border-border-strong' },
  { label: 'Panel', hex: '#0E171A', swatchClass: 'bg-surface border-border-strong' },
  { label: 'Accent', hex: '#16D6C5', swatchClass: 'bg-accent border-accent' }
] as const;

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    setStatus('connecting');
    setErrorMessage(null);

    try {
      const data = await fetchHealth();
      setHealthData(data);
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unable to reach /api/health');
      setHealthData(null);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <PageContainer>
      <PageHeading
        title="Settings"
        description="Appearance, local-first runtime behaviour, and application details."
      />

      {/* Appearance */}
      <SectionCard
        title="Appearance"
        description="DesignDNA uses a calibrated dark visual-intelligence theme optimised for colour fidelity, contrast, and focused design inspection."
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft border border-accent-border flex items-center justify-center text-accent shrink-0">
              <Moon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Dark theme</p>
              <p className="text-[13px] text-muted">
                Active workspace appearance across all analysis views.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {THEME_TOKENS.map((token) => (
              <div key={token.label} className="inline-flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded border ${token.swatchClass}`}
                  aria-hidden="true"
                />
                <span className="text-muted">{token.label}</span>
                <span className="font-mono text-ink">{token.hex}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Local-First Behaviour */}
      <SectionCard
        title="Local-First Architecture"
        description="How DesignDNA handles uploaded screenshots and analysis data."
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-subtle border border-border flex items-center justify-center text-ink shrink-0">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1.5 text-sm text-muted leading-relaxed">
            <p className="font-medium text-ink">Session-scoped and stateless by default</p>
            <p>
              DesignDNA runs as a local-first workspace with no database or permanent screenshot
              storage. Pixel measurement runs directly in the browser, while AI visual
              interpretation credentials and Gemini requests stay isolated on the Express backend.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Backend Runtime Health — preserves M1 live /api/health integration */}
      <SectionCard
        title="Backend Runtime"
        description="Live connection check to the Express backend via /api/health."
        action={
          <SecondaryButton
            size="sm"
            onClick={() => void checkHealth()}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-muted ${isRefreshing ? 'animate-spin text-accent' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </SecondaryButton>
        }
      >
        <div className="space-y-5">
          {status === 'connected' && (
            <StatusIndicator
              variant="healthy"
              label="Connected"
              detail="Express API reachable at /api/health"
            />
          )}
          {status === 'connecting' && (
            <StatusIndicator
              variant="loading"
              label="Checking connection"
              detail="Requesting /api/health"
            />
          )}
          {status === 'error' && (
            <StatusIndicator
              variant="error"
              label="Backend unreachable"
              detail={errorMessage ?? 'Request to /api/health failed'}
            />
          )}

          {status === 'connected' && healthData && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 pt-4 border-t border-border text-sm">
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd className="mt-1 font-mono text-[13px] font-medium text-ink uppercase">
                  {healthData.status}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Uptime</dt>
                <dd className="mt-1 font-mono text-[13px] font-medium text-ink tabular-nums">
                  {healthData.uptime.toFixed(1)}s
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Environment</dt>
                <dd className="mt-1 font-mono text-[13px] font-medium text-ink">
                  {healthData.environment}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Server Time</dt>
                <dd
                  className="mt-1 font-mono text-[13px] font-medium text-ink tabular-nums truncate"
                  title={healthData.timestamp}
                >
                  {new Date(healthData.timestamp).toLocaleTimeString()}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </SectionCard>

      {/* Application Information */}
      <SectionCard
        title="Application Information"
        bodyClassName="p-0"
      >
        <dl className="divide-y divide-border text-sm">
          <div className="px-5 py-3.5 sm:px-6 flex items-center justify-between gap-4">
            <dt className="text-muted">Application</dt>
            <dd className="font-medium text-ink">DesignDNA — {PRODUCT_POSITIONING}</dd>
          </div>
          <div className="px-5 py-3.5 sm:px-6 flex items-center justify-between gap-4">
            <dt className="text-muted">Version</dt>
            <dd className="font-mono text-[13px] text-ink tabular-nums">v{APP_VERSION}</dd>
          </div>
          <div className="px-5 py-3.5 sm:px-6 flex items-center justify-between gap-4">
            <dt className="text-muted">Current Milestone</dt>
            <dd className="text-ink">{APP_MILESTONE}</dd>
          </div>
          <div className="px-5 py-3.5 sm:px-6 flex items-center justify-between gap-4">
            <dt className="text-muted">Stack</dt>
            <dd className="text-ink text-right">React · TypeScript · Vite · Express 5</dd>
          </div>
        </dl>
      </SectionCard>
    </PageContainer>
  );
};
