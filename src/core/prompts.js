/** Local, deterministic command mapping. No AI model, network or generated claims. */
import { validateSession, TRACK_BOUNDS, MASTER_DB_BOUNDS } from './model.js';

export const PROMPT_EXAMPLES = Object.freeze([
  'Warm the mix', 'More space', 'Less space', 'Brighter drums', 'Softer keys',
]);

const ACTIONS = [
  ['reset', /\b(?:reset|clear)\s+(?:the\s+)?(?:fx|effects)\b/g],
  ['unmute', /\bunmute\b/g],
  ['mute', /\bmute\b/g],
  ['unsolo', /\bunsolo\b/g],
  ['solo', /\bsolo\b/g],
  ['warm', /\b(?:warm|warmer)\b/g],
  ['bright', /\b(?:brighter|brighten)\b/g],
  ['dark', /\b(?:darker|darken)\b/g],
  ['spaceUp', /\b(?:(?:more|add)\s+(?:space|reverb)|wetter)\b/g],
  ['spaceDown', /\b(?:(?:less|reduce)\s+(?:space|reverb)|drier|dryer)\b/g],
  ['louder', /\b(?:louder|turn\s+up|increase\s+(?:the\s+)?volume)\b/g],
  ['quieter', /\b(?:quieter|softer|turn\s+down|lower\s+(?:the\s+)?volume)\b/g],
];
const ROLE_TARGETS = new Map([
  ...['drum', 'drums', 'percussion', 'beat', 'beats'].map(word => [word, 'drums']),
  ...['bass', 'sub', 'subbass'].map(word => [word, 'bass']),
  ...['vocal', 'vocals', 'vox', 'voice', 'voices'].map(word => [word, 'vocals']),
  ...['harmonic', 'harmonics', 'harmony', 'music', 'instruments', 'instrumental'].map(word => [word, 'harmonics']),
  ['other', 'other'],
]);
const INSTRUMENTS = new Map([
  ['keys', /\b(keys?|keyboard|piano)\b/], ['key', /\b(keys?|keyboard|piano)\b/],
  ['piano', /\b(keys?|keyboard|piano)\b/], ['keyboard', /\b(keys?|keyboard|piano)\b/],
  ['guitar', /\bguitars?\b/], ['guitars', /\bguitars?\b/],
  ['synth', /\bsynth(?:s|esizer)?\b/], ['strings', /\bstrings?\b/],
  ['pad', /\bpads?\b/], ['pads', /\bpads?\b/],
]);
const FILLERS = /\b(?:please|make|the|a|little|bit|slightly|sound|on|for|my|this|track|stem|tracks|stems)\b/g;

function normalized(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\bun-solo\b/g, 'unsolo').replace(/\bun-mute\b/g, 'unmute').trim();
}
function targetText(value) {
  return normalized(value).replace(/\.(?:wav|aiff?|mp3|m4a|ogg|flac|webm|mp4|aac|opus)$/i, '')
    .replace(/[_-]/g, ' ').replace(FILLERS, ' ').replace(/\s+/g, ' ').trim();
}
function reject(summary) { return { changes: [], summary, understood: false }; }
function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }

function targetsFor(target, session) {
  if (['', 'all', 'mix', 'whole mix', 'entire mix', 'everything'].includes(target)) {
    return { tracks: session.tracks, kind: 'mix', label: `all ${session.tracks.length} stems` };
  }
  if (['master', 'master volume', 'output', 'output volume'].includes(target)) {
    return { tracks: session.tracks, kind: 'master', label: 'the master output' };
  }
  let tracks = session.tracks.filter(track => targetText(track.name) === target);
  if (!tracks.length && ROLE_TARGETS.has(target)) tracks = session.tracks.filter(track => track.role === ROLE_TARGETS.get(target));
  if (!tracks.length && INSTRUMENTS.has(target)) tracks = session.tracks.filter(track => INSTRUMENTS.get(target).test(targetText(track.name)));
  if (!tracks.length) return null;
  return { tracks, kind: 'stems', label: tracks.map(track => track.name).join(', ') };
}

const DESCRIPTIONS = {
  reset: 'Reset effects', unmute: 'Unmute', mute: 'Mute', unsolo: 'Clear solo', solo: 'Solo',
  warm: 'Add warmth (+1.5 dB bass, −1.5 dB treble, +8% drive)',
  bright: 'Brighten (+2 dB treble)', dark: 'Darken (−2 dB treble)',
  spaceUp: 'Add space (+12%)', spaceDown: 'Reduce space (−12%)',
  louder: 'Raise volume (+2 dB)', quieter: 'Lower volume (−2 dB)',
};

export function interpretPrompt(text, inputSession) {
  let session;
  try { session = validateSession(inputSession); }
  catch { return reject('The session needs to be repaired before commands can be previewed.'); }
  if (typeof text !== 'string' || !text.trim() || text.length > 240) {
    return reject('Enter one short change, such as “Warm the mix” or “Brighter drums”.');
  }
  if (!session.tracks.length) return reject('Load the demo or import stems before previewing a change.');
  const instruction = normalized(text).replace(/[.!?]+$/g, '').trim();
  if (/\b(?:not|never|no|don't|dont|do\s+not|without|avoid|except|excluding|unless|and|or|but)\b|[;&,]/.test(instruction)) {
    return reject('Use one positive change for one target at a time, such as “Unmute bass”. Nothing was changed.');
  }
  const matches = ACTIONS.flatMap(([action, regex]) => Array.from(instruction.matchAll(regex), match => ({ action, index: match.index, text: match[0] })));
  if (matches.length !== 1) return reject('That request is outside the local command set. Try warmth, brighter/darker, more/less space, louder/quieter, mute/unmute, solo/unsolo or reset effects.');
  const match = matches[0];
  const target = targetText(`${instruction.slice(0, match.index)} ${instruction.slice(match.index + match.text.length)}`);
  const resolved = targetsFor(target, session);
  if (!resolved) return reject('I could not identify that stem. Use its exact name, its role, or “the mix”. Nothing was changed.');
  if (resolved.kind === 'master' && !['louder', 'quieter'].includes(match.action)) {
    return reject('Master commands control volume. Use “the mix” to adjust effects across all stems.');
  }
  if (match.action === 'solo' && resolved.kind !== 'stems') {
    return reject('Name a stem or role to solo, such as “Solo vocals”.');
  }
  if (['louder', 'quieter'].includes(match.action) && resolved.kind !== 'stems') {
    const masterDb = clamp(session.masterDb + (match.action === 'louder' ? 2 : -2), ...MASTER_DB_BOUNDS);
    if (masterDb === session.masterDb) return { changes: [], summary: 'The master volume is already at its safe limit. No change to apply.', understood: true };
    return { changes: [], masterPatch: { masterDb }, summary: `${DESCRIPTIONS[match.action]} on the master output; stem balances stay the same.`, understood: true };
  }
  const selected = new Set(resolved.tracks.map(track => track.id));
  const changes = [];
  for (const track of session.tracks) {
    let patch = {};
    if (match.action === 'solo' && !selected.has(track.id)) patch = { solo: false };
    else if (!selected.has(track.id)) continue;
    else switch (match.action) {
      case 'reset': patch = { lowDb: 0, highDb: 0, drive: 0, space: 0 }; break;
      case 'warm': patch = { lowDb: clamp(track.lowDb + 1.5, ...TRACK_BOUNDS.lowDb), highDb: clamp(track.highDb - 1.5, ...TRACK_BOUNDS.highDb), drive: clamp(track.drive + 0.08, ...TRACK_BOUNDS.drive) }; break;
      case 'bright': patch = { highDb: clamp(track.highDb + 2, ...TRACK_BOUNDS.highDb) }; break;
      case 'dark': patch = { highDb: clamp(track.highDb - 2, ...TRACK_BOUNDS.highDb) }; break;
      case 'spaceUp': patch = { space: clamp(track.space + 0.12, ...TRACK_BOUNDS.space) }; break;
      case 'spaceDown': patch = { space: clamp(track.space - 0.12, ...TRACK_BOUNDS.space) }; break;
      case 'louder': patch = { gainDb: clamp(track.gainDb + 2, ...TRACK_BOUNDS.gainDb) }; break;
      case 'quieter': patch = { gainDb: clamp(track.gainDb - 2, ...TRACK_BOUNDS.gainDb) }; break;
      case 'mute': patch = { mute: true }; break;
      case 'unmute': patch = { mute: false }; break;
      case 'solo': patch = { solo: true, mute: false }; break;
      case 'unsolo': patch = { solo: false }; break;
    }
    const actual = Object.fromEntries(Object.entries(patch).filter(([key, value]) => track[key] !== value));
    if (Object.keys(actual).length) changes.push({ id: track.id, patch: actual });
  }
  if (!changes.length) return { changes: [], summary: 'Those controls already match the request or have reached their safe limits. No change to apply.', understood: true };
  const extra = match.action === 'solo' ? '; clear other solos and unmute the selected stems' : '';
  return { changes, summary: `${DESCRIPTIONS[match.action]} on ${resolved.label}${extra}. Controls stop at their limits.`, understood: true };
}
