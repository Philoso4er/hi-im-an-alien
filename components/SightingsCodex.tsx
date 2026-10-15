import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Flame, Lock, MessageCircle, Quote, X } from 'lucide-react';
import type { StoredEncounter } from '../services/storageService';
import type { Progress } from '../services/progressService';
import { VARIANTS, getVariant, RARITY_LABEL } from '../services/variants';

interface SightingsCodexProps {
  encounters: StoredEncounter[];
  progress: Progress;
  onClose: () => void;
}

type Tab = 'codex' | 'log' | 'stats';

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDuration = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

/** Variant codex + conversation log + stats. */
const SightingsCodex: React.FC<SightingsCodexProps> = ({ encounters, progress, onClose }) => {
  const [tab, setTab] = useState<Tab>('codex');
  const [expanded, setExpanded] = useState<string | null>(null);
  const discovered = Object.keys(progress.variants).length;

  const stats: [string, string][] = [
    ['Sightings', String(progress.sightings)],
    ['Said hi', String(progress.contacts)],
    ['Slipped away', String(progress.misses)],
    [
      'Hit rate',
      progress.sightings ? `${Math.round((progress.contacts / Math.max(1, progress.contacts + progress.misses)) * 100)}%` : '—'
    ],
    ['Fastest hi', progress.fastestHiMs != null ? `${(progress.fastestHiMs / 1000).toFixed(2)}s` : '—'],
    ['Time talking', fmtDuration(progress.talkSeconds)],
    ['Words sent', String(progress.messagesSent)],
    ['Current streak', `${progress.streak} day${progress.streak === 1 ? '' : 's'}`],
    ['Best streak', `${progress.bestStreak} day${progress.bestStreak === 1 ? '' : 's'}`],
    ['Forms seen', `${discovered} / ${VARIANTS.length}`]
  ];

  return (
    <div className="absolute inset-0 z-[80] bg-[#05060f]/95 backdrop-blur-md flex flex-col" data-testid="codex">
      <div className="safe-top safe-x border-b border-white/10 bg-black/40">
        <div className="max-w-xl mx-auto flex items-center justify-between pb-3">
          <div>
            <h2 className="text-2xl font-bold">Sightings</h2>
            <p className="text-xs text-gray-400 font-signal mt-0.5">
              {encounters.length} CONTACT{encounters.length === 1 ? '' : 'S'} · {discovered}/{VARIANTS.length} FORMS
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="max-w-xl mx-auto flex gap-1 pb-3" role="tablist">
          {(['codex', 'log', 'stats'] as Tab[]).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              data-testid={`codex-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize ${
                tab === t ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              {t === 'codex' ? 'Forms' : t === 'log' ? 'Log' : 'Stats'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto safe-x safe-bottom">
        <div className="max-w-xl mx-auto py-4">
          {tab === 'codex' && (
            <div className="grid grid-cols-2 gap-3">
              {VARIANTS.map(v => {
                const rec = progress.variants[v.id];
                return (
                  <div
                    key={v.id}
                    data-testid={`variant-${v.id}`}
                    className="rounded-2xl border p-3 flex flex-col bg-white/[0.03]"
                    style={{ borderColor: rec ? `${v.accent}66` : 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="aspect-square rounded-xl bg-black/50 overflow-hidden grid place-items-center mb-2 relative">
                      <img
                        src="/aliens/peek-wave.gif"
                        alt=""
                        className={`h-[92%] w-auto ${rec ? v.className || '' : ''}`}
                        style={
                          rec
                            ? { filter: v.filter }
                            : { filter: 'brightness(0) opacity(0.55) drop-shadow(0 0 1px rgba(255,255,255,0.4))' }
                        }
                      />
                      {!rec && <Lock className="absolute w-5 h-5 text-white/50" />}
                    </div>
                    <p className="font-semibold text-sm leading-tight">{rec ? v.name : '???'}</p>
                    <p className="text-[10px] font-signal mt-0.5" style={{ color: v.accent }}>
                      {RARITY_LABEL[v.rarity].toUpperCase()}
                      {rec ? ` · ×${rec.count}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5 leading-snug">{rec ? v.lore : v.hint}</p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'log' &&
            (encounters.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No contact yet.</p>
                <p className="text-sm text-gray-500 mt-2">It's out there. Go and look.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {encounters
                  .slice()
                  .reverse()
                  .map(e => {
                    const v = getVariant(e.variantId);
                    const open = expanded === e.id;
                    const secs = Math.max(0, Math.round((e.endTime - e.startTime) / 1000));
                    const memorable = e.memorableLine || e.messages.find(m => m.role === 'alien')?.content;
                    return (
                      <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                        <button
                          onClick={() => setExpanded(open ? null : e.id)}
                          className="w-full p-4 text-left flex gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-[10px] font-signal px-2 py-0.5 rounded-full border"
                                style={{ color: v.accent, borderColor: `${v.accent}55` }}
                              >
                                {v.name.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {fmtDate(e.startTime)}
                              </span>
                            </div>
                            {memorable && (
                              <p className="text-sm text-gray-200 mt-2 italic leading-snug line-clamp-3">
                                <Quote className="inline w-3 h-3 mr-1 -mt-1 opacity-60" />
                                {memorable}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {e.messages.length}
                              </span>
                              <span>{fmtDuration(secs)}</span>
                              <span>{e.timeOfDay}</span>
                            </p>
                          </div>
                          {open ? (
                            <ChevronUp className="w-5 h-5 text-cyan-300 shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                          )}
                        </button>
                        <AnimatePresence>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/10"
                            >
                              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                                {e.messages.map((m, i) => (
                                  <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                                    <span
                                      className={`inline-block max-w-[85%] px-3 py-2 rounded-xl text-sm leading-snug ${
                                        m.role === 'user' ? 'bg-cyan-600/40 text-cyan-50' : 'bg-purple-600/30 text-purple-50'
                                      }`}
                                    >
                                      {m.content}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
            ))}

          {tab === 'stats' && (
            <div>
              <div className="rounded-2xl p-4 mb-3 bg-gradient-to-br from-orange-500/15 to-fuchsia-500/10 border border-orange-400/30 flex items-center gap-3">
                <Flame className="w-8 h-8 text-orange-300" />
                <div>
                  <p className="text-2xl font-black">{progress.streak} day{progress.streak === 1 ? '' : 's'}</p>
                  <p className="text-xs text-orange-100/70">Say hi at least once a day to keep it coming back.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {stats.map(([k, v]) => (
                  <div key={k} className="rounded-2xl p-3 bg-white/[0.04] border border-white/10">
                    <p className="text-[11px] text-gray-400 font-signal uppercase">{k}</p>
                    <p className="text-xl font-bold mt-1">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SightingsCodex;
