import { useState } from 'react';
import { X, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  docType: string;
  guestName: string;
  hotelName: string;
  recipientEmail?: string;
}

export function EmailModal({ open, onClose, docType, guestName, hotelName, recipientEmail }: EmailModalProps) {
  const [to, setTo] = useState(recipientEmail || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(`${docType} — ${guestName}`);
  const [message, setMessage] = useState(
    `Dear ${guestName},\n\nPlease find attached the ${docType.toLowerCase()} from ${hotelName}.\n\nKind regards,\n${hotelName}`
  );
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!open) return null;

  const handleSend = async () => {
    if (!to.trim()) {
      setStatus('error');
      return;
    }
    setSending(true);
    setStatus('idle');
    try {
      const mailtoLink = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoLink;
      setSending(false);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 2500);
    } catch {
      setSending(false);
      setStatus('error');
    }
  };

  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';
  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Email {docType}</h3>
              <p className="text-xs text-gray-500">Send this document via email</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {status === 'success' ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Email draft ready</p>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Your email client should have opened with the {docType.toLowerCase()} attached as a PDF.
                If it didn&apos;t, please check your email app settings.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>To</label>
                <input type="email" value={to} onChange={e => setTo(e.target.value)}
                  placeholder="recipient@email.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CC <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="email" value={cc} onChange={e => setCc(e.target.value)}
                  placeholder="cc@email.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  rows={5} className={inputCls} />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle size={15} /> Please enter a valid recipient email address
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5">
                <Mail size={14} className="mt-0.5 shrink-0" />
                <span>This will open your default email app with the PDF attached. Make sure you&apos;ve downloaded the {docType.toLowerCase()} first.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {status !== 'success' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending || !to.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {sending ? 'Opening…' : 'Send Email'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
