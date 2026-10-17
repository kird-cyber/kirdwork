// ============================================================== AUDIO (WebAudio synthesis, no files)
// Starts only after the first user gesture. Never touches the simulation.
function createAudio() {
  const A = { ctx: null, master: null, muted: false, noiseBuf: null, charge: null, engine: null, count: 0, last: {} };
  try { A.muted = localStorage.getItem('pg.mute') === '1'; } catch (e) {}
  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 0.7; A.master.connect(A.ctx.destination);
    const comp = A.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    A.bus = A.ctx.createGain(); A.bus.connect(comp); comp.connect(A.master);
    const len = A.ctx.sampleRate; A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  };
  A.setMuted = function (v) {
    A.muted = v; try { localStorage.setItem('pg.mute', v ? '1' : '0'); } catch (e) {}
    if (A.master) A.master.gain.setTargetAtTime(v ? 0 : 0.7, A.ctx.currentTime, 0.02);
  };
  const ok = (name, gap) => {
    if (!A.ctx || A.muted) return false;
    const now = A.ctx.currentTime;
    if (gap && A.last[name] && now - A.last[name] < gap) return false;
    A.last[name] = now; A.count++; return true;
  };
  function env(g, t, a, peak, dec, end) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end || 0.0001, t + a + dec); }
  function tone(type, f0, f1, dur, peak, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, peak, dur); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, peak, filt, f0, f1, q, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noiseBuf; s.loop = true; f.type = filt; f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, peak, dur); s.connect(f); f.connect(g); g.connect(A.bus); s.start(t); s.stop(t + dur + 0.05);
  }
  A.play = function (name, p) {
    p = p || {};
    switch (name) {
      case 'fire': {
        if (!ok('fire', 0.04)) return;
        const s = p.shape;
        if (s === 'arrow') { tone('triangle', 680, 180, 0.18, 0.5); noise(0.08, 0.25, 'highpass', 3000); }
        else if (s === 'missile') { noise(0.5, 0.45, 'bandpass', 600, 2400, 1.5); tone('sawtooth', 140, 60, 0.25, 0.25); }
        else if (s === 'beam') { tone('sawtooth', 1400, 300, 0.35, 0.3); tone('sine', 2200, 900, 0.3, 0.2); }
        else if (p.catapult) { noise(0.12, 0.3, 'lowpass', 900); tone('sine', 160, 50, 0.3, 0.7, 0.04); }
        else { noise(0.18, 0.7, 'lowpass', 1800, 300); tone('sine', 130, 38, 0.32, 0.9); }
        break;
      }
      case 'boom': {
        if (!ok('boom', 0.05)) return;
        const tier = p.tier || 1, dur = 0.35 + tier * 0.35;
        noise(dur, 0.55 + tier * 0.15, 'lowpass', 2400, 120);
        tone('sine', 90 + (3 - tier) * 30, 28, dur, 0.9);
        if (tier >= 3) noise(1.4, 0.25, 'lowpass', 600, 80, 0.7, 0.12);
        break;
      }
      case 'hit': if (ok('hit', 0.05)) { tone('square', 420, 180, 0.12, 0.18); noise(0.06, 0.2, 'bandpass', 2500, null, 3); } break;
      case 'turn': if (ok('turn', 0.3)) { const b = p.team === 'blue' ? 660 : 523; tone('triangle', b, null, 0.14, 0.35); tone('triangle', b * 1.5, null, 0.22, 0.35, 0.12); } break;
      case 'pickup': if (ok('pickup', 0.1)) { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, null, 0.08, 0.16, i * 0.06)); } break;
      case 'heal': if (ok('heal', 0.1)) { tone('sine', 440, 880, 0.45, 0.35); tone('sine', 660, 1320, 0.45, 0.2, 0.05); } break;
      case 'tele': if (ok('tele', 0.1)) { tone('sine', 300, 2400, 0.35, 0.3); noise(0.3, 0.15, 'bandpass', 1000, 6000, 4); } break;
      case 'item': if (ok('item', 0.1)) { tone('triangle', 880, 1320, 0.12, 0.25); } break;
      case 'tick': if (ok('tick', 0.5)) { tone('square', p.last ? 1320 : 990, null, 0.05, 0.18); } break;
      case 'fall': if (ok('fall', 0.2)) { tone('sine', 1200, 120, 1.1, 0.35); } break;
      case 'death': if (ok('death', 0.2)) { noise(1.6, 0.6, 'lowpass', 1400, 60); tone('sine', 70, 25, 1.4, 0.9); } break;
      case 'beam': if (ok('beam', 0.2)) { tone('sawtooth', 200, 1800, 0.6, 0.25); noise(0.7, 0.2, 'highpass', 2000); } break;
      case 'crate': if (ok('crate', 0.2)) { tone('triangle', 330, 660, 0.25, 0.2); } break;
      case 'limit': if (ok('limit', 0.25)) { tone('square', 220, null, 0.06, 0.15); } break;
      case 'ui': if (ok('ui', 0.05)) { tone('triangle', 740, null, 0.04, 0.15); } break;
    }
  };
  // continuous sounds
  A.setCharge = function (on, power) {
    if (!A.ctx || A.muted) { if (A.charge) { A.charge.o.stop(); A.charge = null; } return; }
    if (on && !A.charge) {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'triangle'; g.gain.value = 0.0001;
      o.connect(g); g.connect(A.bus); o.start(); g.gain.setTargetAtTime(0.12, A.ctx.currentTime, 0.03); A.charge = { o, g };
    }
    if (A.charge) {
      if (on) A.charge.o.frequency.setTargetAtTime(180 + power * 700, A.ctx.currentTime, 0.02);
      else { const c = A.charge; c.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.02); c.o.stop(A.ctx.currentTime + 0.1); A.charge = null; }
    }
  };
  A.setEngine = function (on) {
    if (!A.ctx || A.muted) { if (A.engine) { A.engine.s.stop(); A.engine = null; } return; }
    if (on && !A.engine) {
      const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(), lfo = A.ctx.createOscillator(), lg = A.ctx.createGain();
      s.buffer = A.noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.0001;
      lfo.frequency.value = 14; lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(A.bus); s.start(); lfo.start(); g.gain.setTargetAtTime(0.16, A.ctx.currentTime, 0.05);
      A.engine = { s, g, lfo };
    } else if (!on && A.engine) {
      const e = A.engine; e.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.05); e.s.stop(A.ctx.currentTime + 0.3); e.lfo.stop(A.ctx.currentTime + 0.3); A.engine = null;
    }
  };
  return A;
}
