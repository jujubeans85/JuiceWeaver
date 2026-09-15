/** CRATE JUICE foundation 1.0.0 — shared by the studio and generated app fixture. */
export const FOUNDATION_VERSION = '1.0.0';
export function applyBrand(config) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries({ '--cj-accent': config.accent, '--cj-cream': config.cream, '--cj-ink': config.ink })) {
    if (/^#[0-9a-f]{6}$/i.test(value || '')) root.style.setProperty(key, value);
  }
  root.dataset.motion = config.motion === false ? 'reduced' : 'full';
  if (config.displayFont && /^[a-z0-9 _-]{1,60}$/i.test(config.displayFont)) root.style.setProperty('--cj-display', '"'+config.displayFont+'", cursive');
  if (config.background) { const url=new URL(config.background, document.baseURI); if(url.origin===location.origin)root.style.setProperty('--cj-background', 'url('+JSON.stringify(url.href)+')'); }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.ink || '#140c08');
}
export function brandMark() {
  return '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M6 11 20 4l14 7v18l-14 7-14-7V11Z" stroke="currentColor" stroke-width="2"/><path d="m6 11 14 8 14-8M20 19v17M12 8l16 9M6 19l14 8 14-8" stroke="currentColor" stroke-width="2"/></svg>';
}
export function mountBrand(node, config) {
  node.classList.add('cj-brand');
  const mark = document.createElement('span'); mark.className = 'cj-brand-mark'; mark.innerHTML = brandMark();
  if(config.logo){const url=new URL(config.logo,document.baseURI);if(url.origin===location.origin){const img=document.createElement('img');img.src=url.href;img.alt='';img.width=38;img.height=38;mark.replaceChildren(img);}}
  const name = document.createElement('span'); name.className = 'cj-wordmark'; name.textContent = config.brand || 'CRATE JUICE';
  node.replaceChildren(mark, name);
}
export function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = href; a.download = filename; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}
export function safeFilename(name, suffix) {
  return (String(name).normalize('NFKC').replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '-').slice(0, 64) || 'juiceweaver-mix') + suffix;
}
