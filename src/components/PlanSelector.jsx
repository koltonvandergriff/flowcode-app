import { useState, useCallback } from 'react';
import { FONTS } from '../lib/constants';
import { useTheme } from '../hooks/useTheme';
import { getPlans, upgradePlan } from '../lib/subscriptionService';

const fc = FONTS.mono;

function PlanTier({ plan, selected, onSelect, colors, popular }) {
  const isSelected = selected === plan.id;
  const borderColor = isSelected ? colors.accent.purple : colors.border.subtle;
  const bg = isSelected ? colors.accent.purple + '0a' : colors.bg.surface;

  return (
    <button
      onClick={() => onSelect(plan.id)}
      style={{
        all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        flex: 1, minWidth: 0, position: 'relative',
        background: bg, border: `2px solid ${borderColor}`,
        borderRadius: 14, padding: '24px 20px 20px',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 24px ${colors.accent.purple}15` : 'none',
      }}
    >
      {popular && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, fontWeight: 700, fontFamily: fc, letterSpacing: 1.2,
          padding: '4px 12px', borderRadius: 20,
          background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
          color: '#0f1623', whiteSpace: 'nowrap',
        }}>MOST POPULAR</div>
      )}

      {/* Radio indicator */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${isSelected ? colors.accent.purple : colors.border.subtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14, transition: 'border-color 0.2s',
      }}>
        {isSelected && (
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: colors.accent.purple,
          }} />
        )}
      </div>

      <div style={{
        fontSize: 16, fontWeight: 700, fontFamily: FONTS.display,
        letterSpacing: 1.5, color: '#fff', marginBottom: 6,
      }}>{plan.name}</div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: fc, color: '#fff' }}>
          ${plan.price}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: colors.text.dim, fontFamily: fc }}>
          /{plan.interval}{plan.perSeat ? '/seat' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.features.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            fontSize: 11, fontFamily: fc, color: colors.text.secondary, lineHeight: 1.4,
          }}>
            <span style={{ color: colors.accent.green, flexShrink: 0, fontSize: 11 }}>&#10003;</span>
            {f}
          </div>
        ))}
      </div>
    </button>
  );
}

export default function PlanSelector({ onComplete }) {
  const { colors } = useTheme();
  const plans = getPlans();
  const [selected, setSelected] = useState('pro');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('choose'); // 'choose' | 'payment'
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const handleContinue = useCallback(() => {
    if (selected === 'starter') {
      setProcessing(true);
      upgradePlan('starter').then(() => {
        localStorage.setItem('flowade_plan_selected', 'true');
        onComplete();
      });
    } else {
      setStep('payment');
    }
  }, [selected, onComplete]);

  const handlePayment = useCallback(async () => {
    setProcessing(true);
    await upgradePlan(selected);
    localStorage.setItem('flowade_plan_selected', 'true');
    setTimeout(() => onComplete(), 400);
  }, [selected, onComplete]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: colors.bg.base,
      fontFamily: FONTS.body,
      overflow: 'auto',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -150, right: -100,
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.accent.purple}10 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.accent.green}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: step === 'choose' ? 820 : 480,
        padding: '40px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
        transition: 'max-width 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            background: `linear-gradient(135deg, ${colors.accent.pink}, ${colors.accent.purple}, ${colors.accent.green})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 32px ${colors.accent.purple}30`,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: FONTS.display }}>F</span>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 700, color: colors.text.primary,
            fontFamily: FONTS.display, margin: 0, letterSpacing: 2,
          }}>
            {step === 'choose' ? 'Choose Your Plan' : 'Payment Details'}
          </h1>
          <p style={{
            fontSize: 13, color: colors.text.muted, fontFamily: FONTS.body,
            margin: '10px 0 0', lineHeight: 1.5,
          }}>
            {step === 'choose'
              ? 'Start free or unlock the full FlowADE experience. Upgrade or cancel anytime.'
              : `You're subscribing to the ${plans.find(p => p.id === selected)?.name} plan.`}
          </p>
        </div>

        {step === 'choose' && (
          <>
            {/* Plan cards */}
            <div style={{ display: 'flex', gap: 14, width: '100%' }}>
              {plans.map((plan) => (
                <PlanTier
                  key={plan.id}
                  plan={plan}
                  selected={selected}
                  onSelect={setSelected}
                  colors={colors}
                  popular={plan.id === 'pro'}
                />
              ))}
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleContinue}
                disabled={processing}
                style={{
                  all: 'unset', cursor: processing ? 'wait' : 'pointer',
                  padding: '14px 48px', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, fontFamily: FONTS.body,
                  background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
                  color: '#0f1623', letterSpacing: 0.5,
                  boxShadow: `0 4px 20px ${colors.accent.green}30`,
                  transition: 'all 0.2s ease',
                  opacity: processing ? 0.6 : 1,
                }}
              >
                {selected === 'starter' ? 'Start Free' : 'Continue to Payment'}
              </button>
              <span style={{ fontSize: 11, color: colors.text.ghost, fontFamily: fc }}>
                {selected === 'starter'
                  ? 'No credit card required'
                  : '14-day free trial · Cancel anytime'}
              </span>
            </div>
          </>
        )}

        {step === 'payment' && (
          <div style={{
            width: '100%', maxWidth: 400,
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Plan summary */}
            <div style={{
              background: colors.bg.surface, border: `1px solid ${colors.border.subtle}`,
              borderRadius: 10, padding: '14px 18px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: fc }}>
                  {plans.find(p => p.id === selected)?.name} Plan
                </span>
                <span style={{ fontSize: 11, color: colors.text.dim, fontFamily: fc, marginLeft: 8 }}>
                  14-day free trial
                </span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: fc, color: '#fff' }}>
                ${plans.find(p => p.id === selected)?.price}/mo
              </span>
            </div>

            {/* Card form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, fontFamily: fc, letterSpacing: 0.5 }}>
                  CARD NUMBER
                </label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, '').slice(0, 19))}
                  placeholder="4242 4242 4242 4242"
                  style={{
                    all: 'unset', padding: '12px 14px', borderRadius: 8,
                    background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
                    fontSize: 14, fontFamily: fc, color: colors.text.primary,
                    caretColor: colors.accent.green, letterSpacing: 1,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                  onBlur={(e) => { e.target.style.borderColor = colors.border.subtle; }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, fontFamily: fc, letterSpacing: 0.5 }}>
                    EXPIRY
                  </label>
                  <input
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value.slice(0, 5))}
                    placeholder="MM/YY"
                    style={{
                      all: 'unset', padding: '12px 14px', borderRadius: 8,
                      background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
                      fontSize: 14, fontFamily: fc, color: colors.text.primary,
                      caretColor: colors.accent.green,
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border.subtle; }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: colors.text.secondary, fontFamily: fc, letterSpacing: 0.5 }}>
                    CVC
                  </label>
                  <input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    style={{
                      all: 'unset', padding: '12px 14px', borderRadius: 8,
                      background: colors.bg.raised, border: `1px solid ${colors.border.subtle}`,
                      fontSize: 14, fontFamily: fc, color: colors.text.primary,
                      caretColor: colors.accent.green,
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border.subtle; }}
                  />
                </div>
              </div>
            </div>

            {/* Security note */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              borderRadius: 8, background: colors.accent.green + '08',
              border: `1px solid ${colors.accent.green}18`,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span style={{ fontSize: 10, color: colors.text.muted, fontFamily: fc, lineHeight: 1.4 }}>
                Payments processed securely by Stripe. We never store your card details.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  all: 'unset', cursor: 'pointer', padding: '12px 20px', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, fontFamily: FONTS.body,
                  background: colors.bg.overlay, border: `1px solid ${colors.border.subtle}`,
                  color: colors.text.secondary, transition: 'all 0.15s',
                }}
              >Back</button>

              <button
                onClick={handlePayment}
                disabled={processing}
                style={{
                  all: 'unset', cursor: processing ? 'wait' : 'pointer',
                  flex: 1, textAlign: 'center',
                  padding: '14px 24px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, fontFamily: FONTS.body,
                  background: `linear-gradient(135deg, ${colors.accent.green}, ${colors.accent.cyan})`,
                  color: '#0f1623', letterSpacing: 0.3,
                  boxShadow: `0 4px 16px ${colors.accent.green}30`,
                  opacity: processing ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {processing ? 'Processing...' : 'Start 14-Day Free Trial'}
              </button>
            </div>

            <p style={{ fontSize: 10, color: colors.text.ghost, fontFamily: fc, textAlign: 'center', lineHeight: 1.5 }}>
              You won't be charged during the trial. Cancel before it ends and pay nothing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
