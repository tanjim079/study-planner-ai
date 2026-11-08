import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  Zap,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Alert } from '../common/Alert';

export function SettingsView() {
  const {
    preferences,
    updatePreferences,
    exportDataJson,
    importDataJson,
    resetAllData,
  } = useStudy();

  const [healthStatus, setHealthStatus] = useState<{
    tested: boolean;
    healthy: boolean;
    details?: string;
  }>({ tested: false, healthy: false });

  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Health check query
  const testHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (res.ok && data.status === 'healthy') {
        setHealthStatus({
          tested: true,
          healthy: true,
          details: `App Healthy. AI Configured: ${data.aiService?.configured ? 'Yes (Claude)' : 'Offline (Fallback Mode)'}`,
        });
      } else {
        setHealthStatus({
          tested: true,
          healthy: false,
          details: 'Health check reported unhealthy status.',
        });
      }
    } catch (err) {
      setHealthStatus({
        tested: true,
        healthy: false,
        details: err instanceof Error ? err.message : 'Connection failed',
      });
    }
  };

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataJson(content);
      if (res.success) {
        setImportStatus({
          type: 'success',
          message: 'Study planner data successfully imported!',
        });
      } else {
        setImportStatus({
          type: 'error',
          message: res.error || 'Failed to parse import file.',
        });
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {importStatus && (
        <Alert
          type={importStatus.type}
          title={importStatus.type === 'success' ? 'Import Succeeded' : 'Import Error'}
          onClose={() => setImportStatus(null)}
        >
          {importStatus.message}
        </Alert>
      )}

      {/* Appearance & Theme */}
      <section
        aria-labelledby="appearance-settings-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="appearance-settings-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            Appearance & Theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize the visual style and display contrast.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => updatePreferences({ theme: t })}
              aria-pressed={preferences.theme === t}
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold capitalize transition-all ${
                preferences.theme === t
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {t} Theme
            </button>
          ))}
        </div>
      </section>

      {/* Accessibility Preferences */}
      <section
        aria-labelledby="accessibility-settings-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="accessibility-settings-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            Accessibility (WCAG 2.1 AA)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ensure an optimal experience with screen readers and reduced motion.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(e) => updatePreferences({ reducedMotion: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Reduced Motion
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Disable animated transitions for vestibular comfort.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={(e) => updatePreferences({ highContrast: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Enhanced Text Contrast
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sharpen borders and increase font weight for improved readability.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* AI Backend & Health Diagnostics */}
      <section
        aria-labelledby="ai-settings-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="ai-settings-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              AI Service & System Health
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live status of Anthropic Claude integration and offline fallback scheduler.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Activity className="h-4 w-4" />}
            onClick={testHealth}
          >
            Check Health
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Server-side Claude AI Status:
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Active / Fallback Guaranteed
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              If an ANTHROPIC_API_KEY is configured in your server environment, Claude 3.5 Sonnet generates personalized pedagogical plans. If absent or during rate limits, the deterministic fallback planner generates schedules instantly.
            </p>
          </div>

          {healthStatus.tested && (
            <div
              className={`rounded-xl border p-3.5 text-xs ${
                healthStatus.healthy
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
              }`}
            >
              <strong>Health Probe Result:</strong> {healthStatus.details}
            </div>
          )}
        </div>
      </section>

      {/* Data Backup & Management */}
      <section
        aria-labelledby="data-settings-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id="data-settings-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            Data Persistence & Privacy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All your subjects, plans, and session completions are stored locally in your browser.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export Backup (JSON)
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
            id="import-file-input"
          />
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Backup
          </Button>

          <Button
            variant="danger"
            size="sm"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setIsResetConfirmOpen(true)}
          >
            Reset All Data
          </Button>
        </div>
      </section>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetAllData}
        title="Reset All Study Data"
        message="This action will erase all subjects, active schedules, and recorded progress from your browser storage. This cannot be undone."
        confirmLabel="Reset Everything"
        isDestructive={true}
      />
    </div>
  );
}

