import React, { useMemo } from 'react';
import { NeoAsteroid } from '../utils/nasaApi';

// ── Physics (same as KineticOverlay) ─────────────────────────────────────────
function calcYield(neo: NeoAsteroid) {
  const rM  = (neo.estimatedDiameterKm * 1000) / 2;
  const m   = 3000 * (4 / 3) * Math.PI * Math.pow(rM, 3);
  const v   = (neo.relativeVelocityKmh / 3600) * 1000;
  const j   = 0.5 * m * v * v;
  const mt  = j / 4.1868e15;
  const gt  = mt / 1000;
  const label = gt >= 1
    ? `${gt.toFixed(2)} GT`
    : mt >= 1
    ? `${mt.toFixed(2)} MT`
    : `${(mt * 1000).toFixed(2)} kT`;
  return { mt, gt, label };
}

const RISK_CFG = {
  CRITICAL: { label: 'CRITICAL', color: '#ef4444', desc: 'Critical PHO — within active planetary defense monitoring window.' },
  ELEVATED: { label: 'ELEVATED', color: '#facc15', desc: 'Elevated concern. PHO that warrants continuous CNEOS tracking.' },
  MODERATE: { label: 'MODERATE', color: '#fb923c', desc: 'Classified PHO but at safe distance. No immediate concern.' },
  LOW:      { label: 'LOW',      color: '#4ade80', desc: 'No immediate concern. Consistent with historical norms.' },
};

function riskLevel(neo: NeoAsteroid) {
  const ld = neo.missDistanceKm / 384400;
  const km = neo.estimatedDiameterKm;
  if (ld < 2  && km > 0.14) return RISK_CFG.CRITICAL;
  if (ld < 8  && km > 0.14) return RISK_CFG.ELEVATED;
  if (neo.isPotentiallyHazardous) return RISK_CFG.MODERATE;
  return RISK_CFG.LOW;
}

const REFS = [
  { label: 'Hiroshima',    mt: 0.015 },
  { label: 'Chelyabinsk',  mt: 0.5   },
  { label: 'Castle Bravo', mt: 15    },
  { label: 'Tsar Bomba',   mt: 50    },
];

function classifyObject(neo: NeoAsteroid): { label: string; color: string } {
  const km = neo.estimatedDiameterKm;
  if (neo.isPotentiallyHazardous && km >= 0.14) return { label: 'Planetary Threat', color: '#ff2600' };
  if (neo.isPotentiallyHazardous)              return { label: 'Hazardous Asteroid', color: '#ff5500' };
  if (km >= 1.0)   return { label: 'Large Asteroid', color: '#fb923c' };
  if (km >= 0.1)   return { label: 'Asteroid',       color: '#fbbf24' };
  if (km >= 0.025) return { label: 'Small Asteroid', color: '#d4b483' };
  if (km >= 0.001) return { label: 'Meteoroid',      color: '#a8997a' };
  return              { label: 'Micrometeorite',     color: '#777777' };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { asteroid: NeoAsteroid; onBack: () => void; }

export function AsteroidDetail({ asteroid: a, onBack }: Props) {
  const { mt, label: yieldLabel } = useMemo(() => calcYield(a), [a]);
  const risk  = useMemo(() => riskLevel(a), [a]);
  const objType = useMemo(() => classifyObject(a), [a]);
  const diamM = (a.estimatedDiameterKm * 1000).toFixed(0);
  const ld    = a.missDistanceKm / 384400;
  const au    = (a.missDistanceKm / 149597870).toFixed(4);
  const kms   = (a.relativeVelocityKmh / 3600).toFixed(2);

  const damageClass = parseInt(diamM) > 1000 ? 'Global'
    : parseInt(diamM) > 300 ? 'Regional'
    : parseInt(diamM) > 50  ? 'Local'
    : 'Atmospheric';

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden flex flex-col"
      style={{ fontFamily: "'Satoshi-Variable', sans-serif" }}
    >
      {/* Glass background — no solid gradient, lets 3D scene bleed through */}
      <div className="absolute inset-0" style={{ background: 'rgba(3,1,1,0.82)' }} />
      <div className="absolute inset-0 backdrop-blur-sm pointer-events-none" />

      <div className="relative flex flex-col h-full">

        {/* ── Header ── */}
        <header
          className="shrink-0 px-8 py-4 flex items-center gap-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onBack}
            className="liquid-glass rounded-full px-4 py-1.5 text-white/50 hover:text-white text-xs tracking-widest uppercase transition-all"
          >
            ← Back
          </button>
          <div className="flex-1 flex items-baseline gap-3 min-w-0">
            <h2 className="text-white font-bold truncate" style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
              {a.name}
            </h2>
            {/* Object type */}
            <span
              className="rounded-full px-3 py-0.5 text-[9px] font-semibold tracking-widest uppercase shrink-0 border"
              style={{ color: objType.color, borderColor: objType.color + '40', background: objType.color + '12' }}
            >
              {objType.label}
            </span>
            {a.isPotentiallyHazardous && (
              <span className="liquid-glass rounded-full px-3 py-0.5 text-white/50 text-[9px] tracking-widest uppercase shrink-0">PHO</span>
            )}
            <span
              className="rounded-full px-3 py-0.5 text-[9px] font-bold tracking-widest uppercase shrink-0 border"
              style={{ color: risk.color, borderColor: risk.color + '40', background: risk.color + '12' }}
            >
              {risk.label}
            </span>
          </div>
          <span className="text-white/15 font-mono text-[10px] tracking-widest uppercase hidden md:block">Impact Analysis</span>
        </header>

        {/* ── Body (fills remaining viewport, no scroll) ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 overflow-hidden">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">

            {/* Proximity + Size */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="liquid-glass-strong rounded-2xl p-4 flex flex-col gap-1">
                <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase">Proximity</div>
                <div className="font-bold" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', lineHeight: 1, color: '#67e8f9' }}>
                  {ld.toFixed(2)}
                </div>
                <div className="text-white/25 font-mono text-[9px]">Lunar Distances</div>
                <div className="text-white/20 font-mono text-[9px]">{au} AU</div>
                <div className="text-white/15 font-mono text-[9px]">{kms} km/s</div>
              </div>
              <div className="liquid-glass-strong rounded-2xl p-4 flex flex-col gap-1">
                <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase">Size</div>
                <div className="text-white font-bold" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {diamM}
                </div>
                <div className="text-white/25 font-mono text-[9px]">Meters · {kms} km/s</div>
                <div className="text-white/15 font-mono text-[9px]">Damage: {damageClass}</div>
              </div>
            </div>

            {/* Kinetic Yield */}
            <div className="liquid-glass-strong rounded-2xl p-4 shrink-0">
              <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase mb-1">Kinetic Yield</div>
              <div className="font-bold" style={{ fontSize: '2.4rem', letterSpacing: '-0.02em', lineHeight: 1, color: '#fb923c' }}>
                {yieldLabel}
              </div>
              <div className="text-white/20 font-mono text-[9px] mt-1">E = ½mv² · ρ = 3,000 kg/m³</div>
            </div>

            {/* Comparison bars */}
            <div className="liquid-glass rounded-2xl p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase mb-3">Compared to</div>
              <div className="flex flex-col gap-2.5 flex-1 justify-around">
                {REFS.map(({ label: rl, mt: rmt }) => {
                  const ratio  = mt / rmt;
                  const barPct = Math.min(100, Math.log10(ratio + 1) / Math.log10(1001) * 100);
                  const fmt    = ratio >= 1e6 ? `${(ratio / 1e6).toFixed(1)} Mx`
                               : ratio >= 1e3 ? `${(ratio / 1e3).toFixed(1)} kx`
                               : ratio >= 1   ? `${ratio.toFixed(1)}×`
                               : `${(1 / ratio).toFixed(0)}× less`;
                  return (
                    <div key={rl} className="flex items-center gap-3">
                      <div className="text-white/35 text-xs w-24 shrink-0">{rl}</div>
                      <div className="h-[2px] flex-1 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded" style={{ width: `${barPct}%`, background: 'linear-gradient(to right, rgba(251,146,60,0.7), rgba(251,146,60,0.2))' }} />
                      </div>
                      <div className="text-white/45 font-mono text-[10px] w-16 text-right shrink-0">{fmt}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">

            {/* Threat Consensus */}
            <div className="liquid-glass-strong rounded-2xl p-4 shrink-0 border" style={{ borderColor: risk.color + '22' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-white/25 font-mono text-[9px] tracking-widest uppercase">Threat Consensus</div>
                <div className="h-px flex-1" style={{ background: risk.color + '30' }} />
                <span className="font-bold text-[10px] tracking-widest" style={{ color: risk.color }}>{risk.label}</span>
              </div>
              <p className="text-white/55 text-sm leading-relaxed mb-3">{risk.desc}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mb-0.5">Impact Probability</div>
                  <div className="text-white/65 text-sm">
                    {ld < 1 ? '< 0.001%' : ld < 5 ? 'Negligible' : 'Effectively zero'}
                  </div>
                </div>
                <div>
                  <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mb-0.5">Damage Class</div>
                  <div className="text-white/65 text-sm">{damageClass}</div>
                </div>
              </div>

              <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mb-2">Active Defenses</div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'DART Protocol',  desc: 'Kinetic impactor — proven Feb 2022' },
                    { label: 'CNEOS Tracking', desc: `${a.name} is catalogued & monitored` },
                    { label: 'Early Warning',  desc: `${parseInt(diamM) > 100 ? '10+' : '5+'} year lead time for objects this size` },
                  ].map(({ label: dl, desc }) => (
                    <div key={dl} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: '#fb923c' }} />
                      <div>
                        <span className="text-white/55 text-xs font-medium">{dl}</span>
                        <span className="text-white/25 text-xs"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glossary — LD, AU, PHO */}
            <div className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-hidden">
              {[
                {
                  term: 'LD', full: 'Lunar Distance', value: '384,400 km',
                  body: `This object passes at ${ld.toFixed(1)} LD — ${ld < 10 ? 'within close-approach range.' : 'well outside monitoring thresholds.'}`,
                },
                {
                  term: 'AU', full: 'Astronomical Unit', value: '149,597,870 km',
                  body: `At ${au} AU — ${parseFloat(au) < 0.05 ? 'inside the PHO boundary (0.05 AU threshold).' : 'outside the PHO boundary.'}`,
                },
                {
                  term: a.isPotentiallyHazardous ? 'PHO ✓' : 'PHO ✗',
                  full: 'Potentially Hazardous Object', value: '>140m & <0.05 AU',
                  body: a.isPotentiallyHazardous
                    ? 'Meets PHO criteria. Catalogued and tracked continuously by NASA CNEOS. PHO ≠ imminent threat.'
                    : 'Does not meet PHO criteria. Too small, too distant, or both. No escalated tracking needed.',
                },
              ].map(({ term, full, value, body }) => (
                <div key={term} className="liquid-glass rounded-2xl p-4 flex-1 min-h-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-white font-bold text-base" style={{ letterSpacing: '-0.02em' }}>{term}</span>
                    <span className="text-white/30 text-[10px]">{full}</span>
                    <span className="ml-auto text-white/15 font-mono text-[9px]">{value}</span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
