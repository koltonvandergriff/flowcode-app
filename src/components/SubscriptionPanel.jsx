import { useState, useEffect, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import {
  getCurrentPlan,
  getPlans,
  upgradePlan,
  downgradePlan,
  cancelSubscription,
  getBillingHistory,
  getPlanBadge,
} from '../lib/subscriptionService';

const fc = FONTS.mono;

// -- Helpers ------------------------------------------------------------------

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatLimit(v) {
  return v === Infinity ? 'Unlimited' : String(v);
}

// -- Sub-components -----------------------------------------------------------

function UsageBar({ label, value, max, color, colors }) {
  const isUnlimited = max === Infinity;
  const pct = isUnlimited ? 12 : Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: colors.text.dim, fontFamily: fc, letterSpacing: 1 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: fc }}>
          {value} / {formatLimit(max)}
        </span>
      </div>
      <div style={{ height: 4, background: colors.bg.surface, borderRadius: 2 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 2,
          background: color, transition: 'width .5s ease',
        }} />
      </div>
    </div>
  );
}

function StatusBadge({ status, colors }) {
  const map = {
    paid:    { bg: '#2ECC7118', color: colors.status.success, label: 'Paid' },
    pending: { bg: '#F39C1218', color: colors.status.warning, label: 'Pending' },
    failed:  { bg: '#E74C3C18', color: colors.status.error, label: 'Failed' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
      padding: '3px 8px', borderRadius: 4,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function ConfirmModal({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel, colors }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 16,
    }}>
      <div style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 12, padding: 28, width: 340, textAlign: 'center',
        boxShadow: '0 16px 48px rgba(0,0,0,.4)',
      }}>
        <h3 style={{
          fontSize: 15, fontWeight: 700, fontFamily: FONTS.display, letterSpacing: 1,
          color: '#fff', margin: '0 0 10px',
        }}>{title}</h3>
        <p style={{
          fontSize: 12, color: colors.text.secondary, fontFamily: fc,
          lineHeight: 1.6, margin: '0 0 24px',
        }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            all: 'unset', cursor: 'pointer', padding: '9px 20px', borderRadius: 8,
            fontSize: 11, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
            background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
            color: colors.text.secondary, transition: 'all .15s',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            all: 'unset', cursor: 'pointer', padding: '9px 20px', borderRadius: 8,
            fontSize: 11, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
            background: confirmColor || colors.status.error, color: '#fff',
            transition: 'all .15s',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// -- Plan Card ----------------------------------------------------------------

function PlanCard({ plan, isCurrent, currentPlanIndex, planIndex, loading, onAction, colors }) {
  const isUpgrade = planIndex > currentPlanIndex;
  const isDowngrade = planIndex < currentPlanIndex;

  const cardBorder = isCurrent ? colors.accent.purple : colors.border.subtle;
  const cardBg = isCurrent ? colors.accent.purple + '08' : colors.bg.surface;

  let btnLabel = 'Current Plan';
  let btnStyle = {};

  if (isCurrent) {
    btnLabel = 'Current Plan';
    btnStyle = {
      background: colors.bg.overlay, color: colors.text.dim,
      cursor: 'default',
    };
  } else if (isUpgrade) {
    btnLabel = loading ? 'Upgrading...' : 'Upgrade';
    btnStyle = {
      background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
      color: '#fff', cursor: loading ? 'wait' : 'pointer',
      boxShadow: `0 2px 12px ${colors.accent.green}25`,
    };
  } else if (isDowngrade) {
    btnLabel = loading ? 'Downgrading...' : 'Downgrade';
    btnStyle = {
      background: colors.bg.overlay, color: colors.text.muted,
      border: `1px solid ${colors.border.subtle}`,
      cursor: loading ? 'wait' : 'pointer',
    };
  }

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: cardBg,
      border: `1.5px solid ${cardBorder}`,
      borderRadius: 12, padding: '18px 14px 14px',
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
      transition: 'border-color .2s, background .2s',
    }}>
      {isCurrent && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 8, fontWeight: 700, fontFamily: fc, letterSpacing: 1,
          padding: '2px 7px', borderRadius: 4,
          background: colors.accent.purple + '20', color: colors.accent.purple,
        }}>ACTIVE</div>
      )}

      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, fontFamily: FONTS.display,
          letterSpacing: 1.2, color: '#fff', marginBottom: 4,
        }}>{plan.name}</div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: fc, color: '#fff' }}>
          ${plan.price}
          <span style={{ fontSize: 11, fontWeight: 500, color: colors.text.dim }}>
            /{plan.interval}{plan.perSeat ? '/seat' : ''}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6, flex: 1,
      }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            fontSize: 10, fontFamily: fc, color: colors.text.secondary, lineHeight: 1.4,
          }}>
            <span style={{
              color: colors.accent.green, fontSize: 10, lineHeight: 1.4, flexShrink: 0,
            }}>&#10003;</span>
            {f}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          if (isCurrent || loading) return;
          onAction(plan.id, isUpgrade ? 'upgrade' : 'downgrade');
        }}
        style={{
          all: 'unset', textAlign: 'center',
          padding: '9px 0', borderRadius: 8,
          fontSize: 10, fontWeight: 700, fontFamily: fc, letterSpacing: 1,
          transition: 'all .2s',
          ...btnStyle,
        }}
      >
        {btnLabel.toUpperCase()}
      </button>
    </div>
  );
}

// -- Main Panel ---------------------------------------------------------------

export default function SubscriptionPanel({ open, onClose }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState('plan');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(null); // planId being acted on
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { planId, type }

  const refresh = useCallback(() => {
    setCurrentPlan(getCurrentPlan());
    setPlans(getPlans());
    setBilling(getBillingHistory());
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      setTab('plan');
      setLoading(null);
      setConfirmCancel(false);
      setConfirmAction(null);
    }
  }, [open, refresh]);

  if (!open || !currentPlan) return null;

  const currentIndex = plans.findIndex((p) => p.id === currentPlan.id);

  const handlePlanAction = (planId, type) => {
    setConfirmAction({ planId, type });
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    const { planId, type } = confirmAction;
    setConfirmAction(null);
    setLoading(planId);
    try {
      if (type === 'upgrade') {
        await upgradePlan(planId);
      } else {
        await downgradePlan(planId);
      }
      refresh();
    } catch {
      // handle error in production
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    setLoading('cancel');
    try {
      await cancelSubscription();
      refresh();
    } catch {
      // handle error in production
    } finally {
      setLoading(null);
    }
  };

  const badge = getPlanBadge();

  const tabs = [
    { id: 'plan', label: 'YOUR PLAN' },
    { id: 'billing', label: 'BILLING' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16, width: 680, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
        position: 'relative',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 28px 0', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700, fontFamily: FONTS.display,
              letterSpacing: 1, color: '#fff', margin: 0,
            }}>Subscription</h2>
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: fc, letterSpacing: 1,
              padding: '3px 8px', borderRadius: 4,
              background: badge.color + '18', color: badge.color,
            }}>{badge.label}</span>
          </div>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer', fontSize: 18, color: colors.text.dim, padding: '0 4px',
          }}>&#10005;</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, padding: '16px 28px 0', flexShrink: 0,
          borderBottom: `1px solid ${colors.border.subtle}`,
        }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              fontFamily: fc, letterSpacing: 1.5, padding: '8px 16px',
              color: tab === t.id ? colors.accent.purple : colors.text.dim,
              borderBottom: `2px solid ${tab === t.id ? colors.accent.purple : 'transparent'}`,
              marginBottom: -1, transition: 'all .2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px 28px' }}>

          {/* YOUR PLAN TAB */}
          {tab === 'plan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Current plan summary card */}
              <div style={{
                background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                borderRadius: 12, padding: '18px 20px',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: colors.text.ghost,
                      fontFamily: fc, letterSpacing: 1.5, marginBottom: 4,
                    }}>CURRENT PLAN</div>
                    <div style={{
                      fontSize: 20, fontWeight: 800, fontFamily: FONTS.display,
                      letterSpacing: 1.5, color: '#fff',
                    }}>{currentPlan.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 22, fontWeight: 800, fontFamily: fc, color: '#fff',
                    }}>
                      ${currentPlan.price}
                      <span style={{ fontSize: 11, fontWeight: 500, color: colors.text.dim }}>
                        /{currentPlan.interval}{currentPlan.perSeat ? '/seat' : ''}
                      </span>
                    </div>
                    {currentPlan.price > 0 && (
                      <div style={{ fontSize: 10, color: colors.text.dim, fontFamily: fc, marginTop: 2 }}>
                        {currentPlan.cancelAtPeriodEnd
                          ? `Cancels ${formatDate(currentPlan.currentPeriodEnd)}`
                          : `Renews ${formatDate(currentPlan.currentPeriodEnd)}`}
                      </div>
                    )}
                    {currentPlan.cancelAtPeriodEnd && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, fontFamily: fc,
                        color: colors.status.warning, marginTop: 4,
                        padding: '2px 6px', borderRadius: 3,
                        background: colors.status.warning + '15', display: 'inline-block',
                      }}>CANCELLING</div>
                    )}
                  </div>
                </div>

                {/* Usage bars */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
                  paddingTop: 10, borderTop: `1px solid ${colors.border.subtle}`,
                }}>
                  <UsageBar
                    label="TERMINALS"
                    value={currentPlan.usage.terminals}
                    max={currentPlan.limits.terminals}
                    color={colors.accent.cyan}
                    colors={colors}
                  />
                  <UsageBar
                    label="WORKSPACES"
                    value={currentPlan.usage.workspaces}
                    max={currentPlan.limits.workspaces}
                    color={colors.accent.purple}
                    colors={colors}
                  />
                </div>
              </div>

              {/* Plan comparison grid */}
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: colors.text.ghost,
                  fontFamily: fc, letterSpacing: 1.5, marginBottom: 12,
                }}>COMPARE PLANS</div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                }}>
                  {plans.map((plan, i) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={plan.id === currentPlan.id}
                      currentPlanIndex={currentIndex}
                      planIndex={i}
                      loading={loading === plan.id}
                      onAction={handlePlanAction}
                      colors={colors}
                    />
                  ))}
                </div>
              </div>

              {/* Cancel link */}
              {currentPlan.price > 0 && !currentPlan.cancelAtPeriodEnd && (
                <div style={{ textAlign: 'center', paddingTop: 4 }}>
                  <button
                    onClick={() => setConfirmCancel(true)}
                    disabled={loading === 'cancel'}
                    style={{
                      all: 'unset', cursor: loading === 'cancel' ? 'wait' : 'pointer',
                      fontSize: 11, fontFamily: fc, color: colors.text.dim,
                      textDecoration: 'underline', textUnderlineOffset: 3,
                      transition: 'color .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = colors.status.error; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = colors.text.dim; }}
                  >
                    {loading === 'cancel' ? 'Cancelling...' : 'Cancel subscription'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BILLING TAB */}
          {tab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Payment method */}
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: colors.text.ghost,
                  fontFamily: fc, letterSpacing: 1.5, marginBottom: 12,
                }}>PAYMENT METHOD</div>
                <div style={{
                  background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                  borderRadius: 10, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Card icon */}
                    <div style={{
                      width: 40, height: 26, borderRadius: 4,
                      background: `linear-gradient(135deg, ${colors.accent.purple}, ${colors.accent.cyan})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="18" height="14" viewBox="0 0 24 18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="1" width="22" height="16" rx="2" />
                        <line x1="1" y1="7" x2="23" y2="7" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: fc, color: colors.text.primary }}>
                        Visa ending in 4242
                      </div>
                      <div style={{ fontSize: 10, fontFamily: fc, color: colors.text.dim, marginTop: 1 }}>
                        Expires 12/2028
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {/* placeholder -- will open Stripe portal */}}
                    style={{
                      all: 'unset', cursor: 'pointer', padding: '7px 14px', borderRadius: 6,
                      fontSize: 10, fontWeight: 700, fontFamily: fc, letterSpacing: 0.5,
                      background: colors.bg.overlay, border: `1px solid ${colors.border.subtle}`,
                      color: colors.text.secondary, transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.focus; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; }}
                  >UPDATE</button>
                </div>
              </div>

              {/* Billing history */}
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: colors.text.ghost,
                  fontFamily: fc, letterSpacing: 1.5, marginBottom: 12,
                }}>BILLING HISTORY</div>
                <div style={{
                  background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {/* Table header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 80px 70px 90px',
                    gap: 8, padding: '10px 16px',
                    borderBottom: `1px solid ${colors.border.subtle}`,
                    background: colors.bg.raised,
                  }}>
                    {['DATE', 'DESCRIPTION', 'AMOUNT', 'STATUS', ''].map((h) => (
                      <span key={h} style={{
                        fontSize: 9, fontWeight: 700, color: colors.text.ghost,
                        fontFamily: fc, letterSpacing: 1,
                      }}>{h}</span>
                    ))}
                  </div>

                  {/* Rows */}
                  {billing.map((entry, i) => (
                    <div key={entry.id} style={{
                      display: 'grid', gridTemplateColumns: '100px 1fr 80px 70px 90px',
                      gap: 8, padding: '10px 16px', alignItems: 'center',
                      borderBottom: i < billing.length - 1
                        ? `1px solid ${colors.border.subtle}` : 'none',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.overlay + '40'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 11, fontFamily: fc, color: colors.text.muted }}>
                        {formatDate(entry.date)}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: fc, color: colors.text.secondary }}>
                        {entry.description}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fc, color: colors.text.primary }}>
                        ${entry.amount.toFixed(2)}
                      </span>
                      <StatusBadge status={entry.status} colors={colors} />
                      <button
                        onClick={() => {/* placeholder -- download invoice PDF */}}
                        style={{
                          all: 'unset', cursor: 'pointer', fontSize: 10, fontFamily: fc,
                          color: colors.accent.purple, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: 4,
                          transition: 'color .15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent.cyan; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.accent.purple; }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Invoice
                      </button>
                    </div>
                  ))}

                  {billing.length === 0 && (
                    <div style={{
                      padding: '28px 16px', textAlign: 'center',
                      fontSize: 12, fontFamily: fc, color: colors.text.dim,
                    }}>No billing history yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation modals */}
        <ConfirmModal
          open={confirmCancel}
          title="Cancel Subscription"
          message="Your plan will remain active until the end of your current billing period. You can resubscribe anytime."
          confirmLabel="Yes, Cancel"
          confirmColor={colors.status.error}
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
          colors={colors}
        />
        <ConfirmModal
          open={!!confirmAction}
          title={confirmAction?.type === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Downgrade'}
          message={
            confirmAction?.type === 'upgrade'
              ? `You will be upgraded to the ${plans.find((p) => p.id === confirmAction?.planId)?.name || ''} plan. Your card on file will be charged the new rate.`
              : `You will be moved to the ${plans.find((p) => p.id === confirmAction?.planId)?.name || ''} plan. The change takes effect at the start of your next billing cycle.`
          }
          confirmLabel={confirmAction?.type === 'upgrade' ? 'Upgrade Now' : 'Downgrade'}
          confirmColor={confirmAction?.type === 'upgrade' ? colors.accent.green : colors.text.dim}
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
          colors={colors}
        />
      </div>
    </div>
  );
}
