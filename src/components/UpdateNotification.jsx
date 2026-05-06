import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';

/**
 * Subtle top-of-app banner that shows when a new update is available or downloaded.
 *
 * States:
 *   - hidden           (default, no update)
 *   - checking         (brief "Checking for updates..." text)
 *   - available        ("Update available — click to download")
 *   - downloading      (progress bar)
 *   - downloaded       ("Restart to update" button)
 *   - error            (auto-dismissed after 8s)
 */
export default function UpdateNotification() {
  const { colors } = useTheme();
  const [state, setState] = useState('hidden'); // hidden | checking | available | downloading | downloaded | error
  const [info, setInfo] = useState({});
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const api = window.flowcode?.update;
    if (!api) return;

    const unsubs = [
      api.onChecking(() => {
        setState('checking');
        setDismissed(false);
      }),
      api.onAvailable((data) => {
        setInfo(data || {});
        setState('available');
        setDismissed(false);
      }),
      api.onNotAvailable(() => {
        // Briefly show nothing — no need to bother the user
        setState('hidden');
      }),
      api.onDownloaded((data) => {
        setInfo(data || {});
        setState('downloaded');
        setDismissed(false);
      }),
      api.onProgress((data) => {
        setState('downloading');
        setProgress(data?.percent ?? 0);
      }),
      api.onError((data) => {
        setInfo(data || {});
        setState('error');
        setDismissed(false);
        // Auto-dismiss errors after 8 seconds
        setTimeout(() => setState('hidden'), 8000);
      }),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, []);

  const handleCheckForUpdates = useCallback(() => {
    window.flowcode?.update?.check();
  }, []);

  const handleInstall = useCallback(() => {
    window.flowcode?.update?.install();
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Don't render when hidden or dismissed (except downloaded — don't let users dismiss that easily)
  if (state === 'hidden') return null;
  if (dismissed && state !== 'downloaded') return null;

  const accentColor =
    state === 'error' ? colors.status.error :
    state === 'downloaded' ? colors.accent.green :
    colors.accent.purple;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '6px 16px',
      background: accentColor + '14',
      borderBottom: `1px solid ${accentColor}30`,
      fontFamily: FONTS.mono,
      fontSize: 11,
      color: colors.text.secondary,
      animation: 'fadeSlideIn 0.3s ease',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Status icon */}
      <span style={{ fontSize: 14, lineHeight: 1 }}>
        {state === 'checking' && '⟳'}
        {state === 'available' && '⬆'}
        {state === 'downloading' && '⬇'}
        {state === 'downloaded' && '✔'}
        {state === 'error' && '⚠'}
      </span>

      {/* Message */}
      {state === 'checking' && (
        <span>Checking for updates...</span>
      )}

      {state === 'available' && (
        <span>
          Update {info.version ? `v${info.version} ` : ''}available
          {' — downloading...'}
        </span>
      )}

      {state === 'downloading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Downloading update...</span>
          <div style={{
            width: 120,
            height: 4,
            borderRadius: 2,
            background: colors.bg.overlay,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, progress)}%`,
              height: '100%',
              borderRadius: 2,
              background: accentColor,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: 10, color: colors.text.dim }}>
            {Math.round(progress)}%
          </span>
        </div>
      )}

      {state === 'downloaded' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>
            Update {info.version ? `v${info.version} ` : ''}ready to install
          </span>
          <button
            onClick={handleInstall}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '3px 12px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: FONTS.mono,
              background: colors.accent.green,
              color: '#161729',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Restart to update
          </button>
        </div>
      )}

      {state === 'error' && (
        <span style={{ color: colors.status.error }}>
          Update check failed{info.message ? `: ${info.message}` : ''}
        </span>
      )}

      {/* Dismiss button (not shown for 'downloaded' — we want them to see it) */}
      {state !== 'downloaded' && state !== 'checking' && (
        <button
          onClick={handleDismiss}
          title="Dismiss"
          style={{
            all: 'unset',
            cursor: 'pointer',
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: 4,
            fontSize: 11,
            color: colors.text.dim,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay; e.currentTarget.style.color = colors.text.secondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.dim; }}
        >
          &#10005;
        </button>
      )}
    </div>
  );
}
