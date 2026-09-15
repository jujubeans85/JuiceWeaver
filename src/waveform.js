const peakCache = new WeakMap();
function peaks(buffer, count = 480) {
  if (peakCache.has(buffer)) return peakCache.get(buffer);
  const channels = Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)), values = new Float32Array(count);
  for (let x = 0; x < count; x++) {
    let peak = 0; const start = Math.floor(x*buffer.length/count), end = Math.floor((x+1)*buffer.length/count);
    for (const data of channels) for (let j = start; j < end; j++) peak = Math.max(peak, Math.abs(data[j]));
    values[x] = peak;
  }
  peakCache.set(buffer, values); return values;
}
export function drawWaveform(canvas, buffer, colour, duration) {
  const bounds = canvas.getBoundingClientRect(); if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.height * ratio);
  const context = canvas.getContext('2d'); context.scale(ratio, ratio);
  const values = peaks(buffer), width = bounds.width * buffer.duration / Math.max(duration, buffer.duration);
  const max = Math.max(.02, ...values); context.fillStyle = colour; context.globalAlpha = .78;
  const count = Math.min(values.length, Math.floor(width / 3));
  for (let i = 0; i < count; i++) {
    const value = values[Math.floor(i * values.length / count)]; const h = Math.max(1, value / max * bounds.height * .8);
    context.fillRect(i * width / count, (bounds.height - h) / 2, Math.max(1, width / count - 1.2), h);
  }
}
export function secondsLabel(seconds) { const n = Math.max(0, Number.isFinite(seconds) ? seconds : 0); return `${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`; }
