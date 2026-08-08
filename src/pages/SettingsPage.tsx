import { useState, useEffect } from 'react';
import { getSettings, updateSettings, DEFAULT_SETTINGS } from '@/lib/db';
import { parseSheetUrl } from '@/lib/sheets';
import { useData } from '@/context/DataContext';
import { Link2, Save, CheckCircle2, AlertCircle, Loader2, ExternalLink, Info, RotateCcw } from 'lucide-react';

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

  useEffect(() => {
    getSettings().then(s => {
      setSheetId(s.sheetId);
      setInOutGid(s.inOutGid);
      setAutofillSheet(s.autofillSheetName);
      setPermalink(`https://docs.google.com/spreadsheets/d/${s.sheetId}/edit#gid=${s.inOutGid}`);
      setLoading(false);
    });
  }, []);

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
          </div>
        </div>
      </div>
    </div>
  );
}
