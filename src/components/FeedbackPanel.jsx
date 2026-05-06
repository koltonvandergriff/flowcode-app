import { useState } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;

export default function FeedbackPanel({ open, onClose }) {
  const { colors } = useTheme();
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reportData, setReportData] = useState(null);

  if (!open) return null;

  const generateReport = async () => {
    setSending(true);
    try {
      const report = await window.flowcode?.crash.report(description);
      setReportData(report);
    } catch {
      setReportData('Failed to generate report');
    }
    setSending(false);
  };

  const copyReport = () => {
    if (reportData) {
      navigator.clipboard.writeText(reportData);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowcode-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setDescription('');
    setReportData(null);
    setSent(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={handleClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, padding: 28, width: 480, maxHeight: '80vh',
        overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: FONTS.display, letterSpacing: 1, color: '#fff', margin: 0 }}>
            Report a Problem
          </h2>
          <button onClick={handleClose} style={{ all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim }}>✕</button>
        </div>

        {!reportData ? (
          <>
            <p style={{ fontSize: 12, color: colors.text.muted, fontFamily: fc, marginBottom: 16, lineHeight: 1.5 }}>
              Describe what went wrong. A diagnostic report will be generated with recent logs and system info.
            </p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What were you doing when the issue occurred?"
              rows={5}
              style={{
                width: '100%', background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12,
                fontFamily: fc, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />

            <button onClick={generateReport} disabled={sending} style={{
              all: 'unset', cursor: sending ? 'wait' : 'pointer', display: 'block',
              width: '100%', textAlign: 'center', marginTop: 16, padding: '10px',
              borderRadius: 8, fontFamily: fc, fontSize: 11, fontWeight: 700, color: '#fff',
              background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
              opacity: sending ? 0.7 : 1, boxSizing: 'border-box',
            }}>
              {sending ? 'GENERATING REPORT...' : 'GENERATE REPORT'}
            </button>
          </>
        ) : (
          <>
            <div style={{
              background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
              borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 200, overflow: 'auto',
            }}>
              <pre style={{ fontSize: 10, fontFamily: fc, color: colors.text.dim, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {reportData.slice(0, 2000)}{reportData.length > 2000 ? '\n...(truncated)' : ''}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyReport} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '10px',
                borderRadius: 8, fontFamily: fc, fontSize: 11, fontWeight: 700,
                background: sent ? colors.status.success + '20' : colors.bg.surface,
                color: sent ? colors.status.success : colors.text.secondary,
                border: `1px solid ${sent ? colors.status.success + '40' : colors.border.subtle}`,
              }}>
                {sent ? 'COPIED!' : 'COPY TO CLIPBOARD'}
              </button>
              <button onClick={downloadReport} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '10px',
                borderRadius: 8, fontFamily: fc, fontSize: 11, fontWeight: 700, color: '#fff',
                background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
              }}>
                DOWNLOAD REPORT
              </button>
            </div>

            <p style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc, marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
              Send this report to support@dutchmade.com or attach it to a GitHub issue.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
