/**
 * JuiceWeaver's portable session schema. This module contains no browser state.
 * Reconstructing records here keeps imported objects out of the application.
 */
const MiB = 1024 * 1024;

export const LIMITS = Object.freeze({
  MAX_TRACKS: 8,
  MAX_ASSETS: 8,
  MAX_SOURCE_BYTES: 64 * MiB,
  MAX_TOTAL_SOURCE_BYTES: 96 * MiB,
  MAX_DECODED_BYTES: 96 * MiB,
  MAX_DURATION_SECONDS: 180,
  MAX_MANIFEST_BYTES: 256 * 1024,
  MAX_PROJECT_BYTES: 96 * MiB + 256 * 1024 + 12,
  MIN_BPM: 40,
  MAX_BPM: 240,
});

export const ROLES = Object.freeze(['drums', 'bass', 'harmonics', 'vocals', 'other']);
export const ROLE_COLORS = Object.freeze({
  drums: '#c88a55',
  bass: '#a78bd1',
  harmonics: '#75a99b',
  vocals: '#cf9c9e',
  other: '#95a9b9',
});

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
export { TRACK_BOUNDS } from './effects.js';
import { trackBounds } from './effects.js';
export const MASTER_DB_BOUNDS = Object.freeze([-36, 0]);

export class SessionError extends Error {
  constructor(message) { super(message); this.name = 'SessionError'; }
}

export function safeId(value, label = 'ID') {
  if (typeof value !== 'string' || !ID.test(value)) {
    throw new SessionError(`${label} is missing or invalid.`);
  }
  return value;
}

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SessionError(`${label} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new SessionError(`${label} has an unsupported object type.`);
  }
  return value;
}

export function cleanText(value, label = 'Name', max = 128) {
  if (typeof value !== 'string') throw new SessionError(`${label} must be text.`);
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
  if (!cleaned) throw new SessionError(`${label} cannot be empty.`);
  return cleaned.slice(0, max);
}

function finite(value, label, low, high) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SessionError(`${label} must be a finite number.`);
  }
  return Math.min(high, Math.max(low, value));
}

function boolean(value, label) {
  if (typeof value !== 'boolean') throw new SessionError(`${label} must be true or false.`);
  return value;
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  // IDs are local correlation labels, never credentials or security tokens.
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 13)}`;
}

export function inferRole(name = '') {
  const text = String(name).toLowerCase().replace(/[_\-.]/g, ' ');
  if (/\b(vocal|vocals|vox|voice|voices|acapella|a cappella|lead vocal|choir)\b/.test(text)) return 'vocals';
  if (/\b(drum|drums|percussion|perc|beat|beats|kick|snare|hat|hats)\b/.test(text)) return 'drums';
  if (/\b(bass|sub|subbass)\b/.test(text)) return 'bass';
  if (/\b(harmonics?|harmony|keys?|keyboard|piano|guitar|synth|strings|pad|pads|chords?|music|instrumental)\b/.test(text)) return 'harmonics';
  return 'other';
}

function normalizeTrack(input, index = 0, legacy = false) {
  const track = record(input, `Stem ${index + 1}`);
  const role = track.role;
  if (!ROLES.includes(role)) throw new SessionError(`Stem ${index + 1} has an unsupported role.`);
  if (typeof track.color !== 'string' || !COLOR.test(track.color)) {
    throw new SessionError(`Stem ${index + 1} needs a six-digit hex colour.`);
  }
  const expanded = legacy ? false : boolean(track.expanded, 'Expanded effect ranges');
  const bounds = trackBounds(expanded);
  const result = {
    id: safeId(track.id, 'Stem ID'),
    assetId: safeId(track.assetId, 'Audio ID'),
    name: cleanText(track.name, 'Stem name'),
    role,
    color: track.color.toLowerCase(),
    gainDb: finite(track.gainDb, 'Stem gain', ...bounds.gainDb),
    pan: finite(track.pan, 'Pan', ...bounds.pan),
    mute: boolean(track.mute, 'Mute'),
    solo: boolean(track.solo, 'Solo'),
    lowDb: finite(track.lowDb, 'Bass EQ', ...bounds.lowDb),
    highDb: finite(track.highDb, 'Treble EQ', ...bounds.highDb),
    drive: finite(track.drive, 'Drive', ...bounds.drive),
    space: finite(track.space, 'Space', ...bounds.space),
    timbre: finite(legacy ? 0 : track.timbre, 'Timbre', ...bounds.timbre),
    glitch: finite(legacy ? 0 : track.glitch, 'Glitch', ...bounds.glitch),
    expanded,
  };
  return result;
}

export function newTrack(options = {}) {
  record(options, 'Stem options');
  const name = options.name ?? 'Untitled stem';
  const role = options.role ?? inferRole(name);
  return normalizeTrack({
    id: options.id ?? makeId('track'),
    assetId: options.assetId,
    name,
    role,
    color: options.color ?? ROLE_COLORS[role],
    gainDb: options.gainDb ?? 0,
    pan: options.pan ?? 0,
    mute: options.mute ?? false,
    solo: options.solo ?? false,
    lowDb: options.lowDb ?? 0,
    highDb: options.highDb ?? 0,
    drive: options.drive ?? 0,
    space: options.space ?? 0,
    timbre: options.timbre ?? 0,
    glitch: options.glitch ?? 0,
    expanded: options.expanded ?? false,
  });
}

export function newSession(options = {}) {
  record(options, 'Session options');
  return validateSession({
    schema: 2,
    id: options.id ?? makeId('session'),
    name: options.name ?? 'Untitled session',
    bpm: options.bpm ?? 88,
    masterDb: options.masterDb ?? -6,
    loop: options.loop ?? true,
    tracks: options.tracks ?? [],
    journal: options.journal ?? [],
  });
}

export function validateSession(input) {
  const source = record(input, 'Session');
  if (![1, 2].includes(source.schema)) throw new SessionError('This project uses an unsupported session version.');
  if (!Array.isArray(source.tracks) || source.tracks.length > LIMITS.MAX_TRACKS) {
    throw new SessionError(`A session can contain up to ${LIMITS.MAX_TRACKS} stems.`);
  }
  if (!Array.isArray(source.journal)) throw new SessionError('The session history is invalid.');
  const tracks = source.tracks.map((track, index) => normalizeTrack(track, index, source.schema === 1));
  if (new Set(tracks.map(track => track.id)).size !== tracks.length) {
    throw new SessionError('The project contains duplicate stem IDs.');
  }
  const journal = source.journal.slice(-50).map((item) => {
    record(item, 'History entry');
    if (typeof item.at !== 'string' || item.at.length > 40 ||
        !/^\d{4}-\d{2}-\d{2}T/.test(item.at) || !Number.isFinite(Date.parse(item.at))) {
      throw new SessionError('A session history timestamp is invalid.');
    }
    return { at: new Date(item.at).toISOString(), text: cleanText(item.text, 'History entry', 280) };
  });
  return {
    schema: 2,
    id: safeId(source.id, 'Session ID'),
    name: cleanText(source.name, 'Session name'),
    bpm: finite(source.bpm, 'Tempo', LIMITS.MIN_BPM, LIMITS.MAX_BPM),
    masterDb: finite(source.masterDb, 'Master gain', ...MASTER_DB_BOUNDS),
    loop: boolean(source.loop, 'Loop'),
    tracks,
    journal,
  };
}

export function cloneSession(session) { return validateSession(session); }
