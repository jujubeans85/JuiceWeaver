const paths = {
  play: '<path d="m9 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 0 1 4.7 1.2c0 1.8-2.3 2-2.3 3.5M12 17h.01"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/>',
  save: '<path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8M14 5v2"/>',
  export: '<path d="M12 3v12m-5-5 5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  undo: '<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12"/>',
  redo: '<path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',
  rewind: '<path d="M5 5v14m14-1L8 12l11-6v12Z"/>',
  loop: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-3v5a2 2 0 0 1-2 2H3"/>',
  restore: '<path d="M3 11a9 9 0 1 1 2.7 7M3 4v7h7M12 7v5l3 2"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  sliders: '<path d="M4 4v6m0 4v6M12 4v11m0 4v1M20 4v1m0 4v11M1 10h6m2 5h6m2-10h6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.3-3.5 1.7 1.7 0 0 1 1.1-3H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r=".7" fill="currentColor"/><circle cx="11" cy="6.5" r=".7" fill="currentColor"/><circle cx="16" cy="8" r=".7" fill="currentColor"/>',
  remove: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>',
};

/** Trusted, repository-owned SVGs only. User content never enters this map. */
export function icon(name) {
  const path = paths[name];
  if (!path) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

export function paintIcons(scope = document) {
  const nodes = [...scope.querySelectorAll('[data-icon]')];
  if (scope.matches?.('[data-icon]')) nodes.unshift(scope);
  for (const node of nodes) node.innerHTML = icon(node.dataset.icon);
}
