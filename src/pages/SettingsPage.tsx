import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings, DEFAULT_SETTINGS } from '@/lib/db';
import { parseSheetUrl } from '@/lib/sheets';
import { useData } from '@/context/DataContext';
import { syncSheetToDatabase, fetchImportHistory, type SyncResult, type SyncProgress } from '@/lib/sync';
import {
  Link2, Save, CheckCircle2, AlertCircle, Loader2, ExternalLink, Info, RotateCcw,
  Database, DownloadCloud, History, X,
} from 'lucide-react';

interface ImportHistoryEntry {
  id: string;
  status: string;
  rows_processed: number;
  guests_upserted: number;
  properties_upserted: number;
  reservations_upserted: number;
  units_upserted: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export function SettingsPage() {
  const { refresh, refreshing } = useData();
  const [permalink, setPermalink] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [inOutGid, setInOutGid] = useState('');
  const [autofillSheet, setAutofillSheet] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    const h = await fetchImportHistory(10);
    setHistory(h as ImportHistoryEntry[]);
  }, []);

  useEffect(() => {
    getSettings().then(s => {
      setSheetId(s.sheetId);
      setInOutGid(s.inOutGid);
      setAutofillSheet(s.autofillSheetName);
      setPermalink(`https://docs.google.com/spreadsheets/d/${s.sheetId}/edit#gid=${s.inOutGid}`);
      setLoading(false);
    });
    loadHistory();
  }, [loadHistory]);

  const handlePermalinkChange = (url: string) => {
    setPermalink(url);
    const parsed = parseSheetUrl(url);
    if (parsed) {
      setSheetId(parsed.sheetId);
      if (parsed.gid) setInOutGid(parsed.gid);
      setParseStatus('ok');
    } else if (url.trim()) {
      setParseStatus('fail');
    } else {
      setParseStatus('idle');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const ok = await updateSettings({
      sheetId: sheetId.trim() || DEFAULT_SETTINGS.sheetId,
      inOutGid: inOutGid.trim() || DEFAULT_SETTINGS.inOutGid,
      autofillSheetName: autofillSheet.trim() || DEFAULT_SETTINGS.autofillSheetName,
    });
    if (ok) {
      setSaved(true);
      await refresh();
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Failed to save settings. Please try again.');
    }
    setSaving(false);
  };

  const handleReset = () => {
    setSheetId(DEFAULT_SETTINGS.sheetId);
    setInOutGid(DEFAULT_SETTINGS.inOutGid);
    setAutofillSheet(DEFAULT_SETTINGS.autofillSheetName);
    setPermalink(`https://docs.google.com/spreadsheets/d/${DEFAULT_SETTINGS.sheetId}/edit#gid=${DEFAULT_SETTINGS.inOutGid}`);
    setParseStatus('ok');
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    setSyncProgress({ phase: 'Starting…', current: 0, total: 0 });
    try {
      const result = await syncSheetToDatabase(
        { sheetId, inOutGid, autofillSheetName: autofillSheet },
        (p) => setSyncProgress(p),
      );
      setSyncResult(result);
      if (result.errors.length > 0) {
        setSyncError(`${result.errors.length} error(s) occurred during sync. Check console for details.`);
      }
      await loadHistory();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Data Source Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Link2 size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Google Sheets Data Source</h2>
              <p className="text-xs text-gray-500">Paste your sheet permalink to update where booking data is loaded from</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Permalink */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Sheets Permalink
            </label>
            <input
              type="url"
              value={permalink}
              onChange={(e) => handlePermalinkChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {parseStatus === 'ok' && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5 mt-2">
                <CheckCircle2 size={13} />
                Sheet ID detected:
                <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-mono">{sheetId}</code>
              </p>
            )}
            {parseStatus === 'fail' && (
              <p className="text-xs text-red-500 flex items-center gap-1.5 mt-2">
                <AlertCircle size={13} />
                Could not detect a sheet ID from this URL
              </p>
            )}
          </div>

          {/* GID and Autofill */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                In/Out Tab GID
              </label>
              <input
                type="text"
                value={inOutGid}
                onChange={(e) => setInOutGid(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">Numeric ID of the tab with booking data</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Autofill Sheet Name
              </label>
              <input
                type="text"
                value={autofillSheet}
                onChange={(e) => setAutofillSheet(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">Tab name containing hotel details</p>
            </div>
          </div>

          {/* Quick link */}
          {sheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ExternalLink size={13} /> Open sheet in new tab
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <RotateCcw size={13} /> Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={14} /> Saved — data refreshed
              </span>
            )}
            {error && (
              <span className="text-xs text-red-500 flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} /> {error}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving || refreshing ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                <><Save size={15} /> Save & Refresh</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Database Sync Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Database size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Sync Sheet to Database</h2>
              <p className="text-xs text-gray-500">Import all In & Out sheet rows into the database — guests, properties, rooms, and reservations</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            This reads every row from the In & Out sheet (columns A–T) and saves it to the database.
            It creates or updates guest profiles, properties, room units, booking sources, and reservations.
            Re-syncing is safe — existing records are updated, not duplicated.
          </p>

          {/* Sync progress */}
          {syncing && syncProgress && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">{syncProgress.phase}</p>
                {syncProgress.total > 0 && (
                  <div className="mt-1.5 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sync result */}
          {syncResult && !syncing && (
            <div className={`p-4 rounded-lg border ${syncError ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-start gap-2.5">
                {syncError ? <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {syncError ? 'Sync completed with warnings' : 'Sync completed successfully'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <ResultStat label="Rows" value={syncResult.rowsProcessed} />
                    <ResultStat label="Guests" value={syncResult.guestsUpserted} />
                    <ResultStat label="Properties" value={syncResult.propertiesUpserted} />
                    <ResultStat label="Rooms" value={syncResult.unitsUpserted} />
                    <ResultStat label="Reservations" value={syncResult.reservationsUpserted} />
                  </div>
                  {syncError && (
                    <p className="text-xs text-amber-700 mt-2">{syncError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sync error only (no result) */}
          {syncError && !syncResult && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} /> {syncError}
            </div>
          )}
        </div>

        {/* Sync actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => { setShowHistory(!showHistory); loadHistory(); }}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <History size={13} /> {showHistory ? 'Hide History' : 'Import History'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <><Loader2 size={15} className="animate-spin" /> Syncing…</>
            ) : (
              <><DownloadCloud size={15} /> Sync Now</>
            )}
          </button>
        </div>

        {/* Import history */}
        {showHistory && (
          <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">No imports yet</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50/50 sticky top-0">
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 px-4 py-2.5">Date</th>
                    <th className="text-left font-medium text-gray-500 px-4 py-2.5">Status</th>
                    <th className="text-right font-medium text-gray-500 px-4 py-2.5">Rows</th>
                    <th className="text-right font-medium text-gray-500 px-4 py-2.5">Guests</th>
                    <th className="text-right font-medium text-gray-500 px-4 py-2.5">Reserv.</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(h.started_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          h.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          h.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{h.rows_processed}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{h.guests_upserted}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{h.reservations_upserted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
        <div className="flex gap-3">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700/80 space-y-1.5">
            <p className="font-medium text-blue-800">How to update your sheet link:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your Google Sheet</li>
              <li>Click <strong>Share</strong> and set access to "Anyone with link can view"</li>
              <li>Copy the URL from the browser address bar and paste it above</li>
            </ol>
            <p className="pt-1">The Sheet ID and tab GID are extracted automatically from the link. You can also edit them individually if needed.</p>
            <p className="pt-1 font-medium text-blue-800">What syncs from the In & Out sheet (columns A–T):</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Date</strong> (col A) becomes the check-in date</li>
              <li><strong>Flats</strong> (col B) becomes the room/unit name</li>
              <li><strong>Name</strong> (col I) creates or updates a guest profile</li>
              <li><strong>Guest count</strong> (col J), <strong>Nights</strong> (col K), <strong>Room Rate</strong> (col N), <strong>Total</strong> (col Q)</li>
              <li><strong>Source</strong> (col L) creates or updates a booking source</li>
              <li><strong>Method of Payment</strong> (col S) sets the payment status</li>
              <li><strong>Booking Number</strong> (col R) is used to match and update existing reservations</li>
              <li><strong>Check</strong> (col D) and <strong>Status</strong> (col O) set the booking status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/60 rounded-lg px-3 py-2">
      <p className="text-lg font-bold text-gray-900 leading-none">{value.toLocaleString()}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  );
}
