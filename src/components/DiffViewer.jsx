import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

const fc = FONTS.mono;

export default function DiffViewer({ file, diff, onClose }) {
  const { colors } = useTheme();
  const lines = diff.split('\n');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 14, width: '70vw', maxWidth: 800, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: fc, color: colors.accent.amber }}>{file}</span>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', fontSize: 14, color: colors.text.dim }}>&#10005;</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {lines.map((line, i) => {
            let bg = 'transparent';
            let color = colors.text.secondary;
            if (line.startsWith('+') && !line.startsWith('+++')) { bg = 'rgba(46,204,113,.08)'; color = '#2ECC71'; }
            else if (line.startsWith('-') && !line.startsWith('---')) { bg = 'rgba(231,76,60,.08)'; color = '#E74C3C'; }
            else if (line.startsWith('@@')) { bg = 'rgba(129,140,248,.06)'; color = colors.accent.purple; }
            return (
              <div key={i} style={{
                padding: '1px 16px', fontSize: 12, fontFamily: fc,
                background: bg, color, lineHeight: 1.8, whiteSpace: 'pre',
              }}>{line}</div>
            );
          })}
          {!diff.trim() && (
            <div style={{ padding: 24, textAlign: 'center', color: colors.text.ghost, fontFamily: fc, fontSize: 12 }}>
              No changes to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
