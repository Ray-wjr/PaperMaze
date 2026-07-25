window.TaoHun = window.TaoHun || {};

TaoHun.Audio = {
  ctx: null,
  _initialized: false,

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  },

  _ensure() {
    if (!this._initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  play(name) {
    this._ensure();
    if (!this.ctx) return;
    const fn = this._sounds[name];
    if (fn) fn(this.ctx);
  },

  _sounds: {
    // 戳气泡 — 短促清脆
    pop(ctx) {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.08);
    },

    // 完美时机 — 叮
    perfect(ctx) {
      const t = ctx.currentTime;
      [880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.15);
      });
    },

    // 一般时机 — 嗒
    good(ctx) {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.1);
    },

    // 失误 — 低沉闷响
    miss(ctx) {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.2);
    },

    // 削泥 — 沙沙声
    scrape(ctx) {
      const t = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 3000; filter.Q.value = 0.5;
      src.buffer = buffer;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t); src.stop(t + 0.1);
    },

    // 刻花 — 尖锐轻音
    scratch(ctx) {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.05);
    },

    // 加柴 — 火焰噼啪
    fireCrackle(ctx) {
      const t = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.sin(Math.PI * i / bufferSize);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.8;
      }
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.3;
      src.buffer = buffer;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t); src.stop(t + 0.15);
    },

    // 环节切换 — 古韵钟声
    transition(ctx) {
      const t = ctx.currentTime;
      [392, 523, 659].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.2);
        gain.gain.linearRampToValueAtTime(0.12, t + i * 0.2 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + i * 0.2); osc.stop(t + i * 0.2 + 0.6);
      });
    },

    // 完成 — 胜利
    complete(ctx) {
      const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.1, t + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.5);
      });
    }
  }
};
