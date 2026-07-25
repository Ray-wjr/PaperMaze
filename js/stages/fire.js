window.TaoHun = window.TaoHun || {};
TaoHun.Stages = TaoHun.Stages || {};

TaoHun.Stages.Fire = {
  init(ctx, canvas) { this.ctx = ctx; this.canvas = canvas; },

  start() {
    this.duration = 28;
    this.elapsed = 0;
    this.temperature = 800;
    this.targetZone = { min: 930, max: 980 };
    this.zonePhase = 0;
    this.fuelLevel = 0;
    this.inZoneTime = 0;
    this.totalTime = 0;
    this.burnedCount = 0;
    this.coldCount = 0;
    this.completed = false;
    this.sparkTimer = 0;
    this._pointerDown = false; this._touchSide = null;
    // Pre-render brick wall
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    this._brickCache = document.createElement('canvas');
    this._brickCache.width = Math.ceil(w);
    this._brickCache.height = Math.ceil(h);
    const bc = this._brickCache.getContext('2d');
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        const bx = col * 70 + (row % 2) * 35;
        const by = row * 45 - 20;
        bc.fillStyle = `rgba(60,30,15,${0.3 + Math.random() * 0.1})`;
        bc.fillRect(bx, by, 65, 40);
        bc.strokeStyle = 'rgba(40,20,10,0.5)';
        bc.strokeRect(bx, by, 65, 40);
      }
    }
  },

  update(dt) {
    if (this.completed) return;
    this.elapsed += dt;
    this.totalTime += dt;

    if (this.elapsed >= this.duration) { this.completed = true; return; }

    const progress = this.elapsed / this.duration;

    // Moving target zone
    this.zonePhase += dt * 0.25;
    const zoneShift = Math.sin(this.zonePhase) * 30;
    this.targetZone.min = 930 + zoneShift - progress * 15;
    this.targetZone.max = 980 + zoneShift - progress * 10;

    // Temperature dynamics
    this.temperature += this.fuelLevel * 50 * dt;
    this.temperature -= 10 * dt;
    this.temperature += (Math.random() - 0.5) * 15 * dt;
    this.fuelLevel = Math.max(0, this.fuelLevel - dt * 0.8);

    // Continuous touch fuel
    if (this._pointerDown) {
      if (this._touchSide === 'left') {
        this.fuelLevel = Math.min(1, this.fuelLevel + dt * 1.5);
        if (Math.random() < dt * 4) TaoHun.Audio.play('fireCrackle');
      } else if (this._touchSide === 'right') {
        this.fuelLevel = Math.max(0, this.fuelLevel - dt * 1.5);
      }
    }

    // Scoring
    const inZone = this.temperature >= this.targetZone.min && this.temperature <= this.targetZone.max;
    if (inZone) this.inZoneTime += dt;
    if (this.temperature > this.targetZone.max + 30) this.burnedCount++;
    if (this.temperature < this.targetZone.min - 30) this.coldCount++;

    // Sparks
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0 && this.fuelLevel > 0.3) {
      const w = TaoHun.Game._logicalW;
      const h = TaoHun.Game._logicalH;
      TaoHun.Particles.emit({
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h * 0.55,
        type: 'spark', count: 3 + Math.floor(this.fuelLevel * 8),
        spread: 2, speed: 60 + this.fuelLevel * 100, life: 0.4 + Math.random() * 0.6,
        size: 2 + Math.random() * 3, color: ['#ff9940', '#ffcc66', '#ff6b35'][Math.floor(Math.random() * 3)]
      });
      this.sparkTimer = 0.08 - this.fuelLevel * 0.04;
    }
    // Ambient sparks
    if (Math.random() < 0.3) {
      const w = TaoHun.Game._logicalW;
      const h = TaoHun.Game._logicalH;
      TaoHun.Particles.emit({
        x: w / 2 + (Math.random() - 0.5) * 250, y: h * 0.55,
        type: 'spark', count: 2, spread: 3, speed: 40,
        life: 0.8, size: 2, color: '#ff9940'
      });
    }
  },

  render(ctx) {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    const cx = w / 2;

    ctx.fillStyle = '#1a0c04'; ctx.fillRect(0, 0, w, h);

    // Brick kiln walls (pre-rendered cache)
    if (this._brickCache) ctx.drawImage(this._brickCache, 0, 0);

    // Fire glow
    const fireGlow = ctx.createRadialGradient(cx, h * 0.55, 20, cx, h * 0.55, 300);
    fireGlow.addColorStop(0, `rgba(255,150,40,${0.15 + this.fuelLevel * 0.25})`);
    fireGlow.addColorStop(0.5, `rgba(255,100,20,${0.05 + this.fuelLevel * 0.1})`);
    fireGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGlow;
    ctx.fillRect(0, 0, w, h);

    // Animated flames
    const flameH = 30 + this.fuelLevel * 80;
    for (let i = 0; i < 5; i++) {
      const fx = cx - 60 + i * 30;
      const fy = h * 0.65;
      const grad = ctx.createLinearGradient(fx, fy, fx, fy - flameH * (0.6 + Math.random() * 0.4));
      grad.addColorStop(0, '#ff6b35');
      grad.addColorStop(0.4, '#ff9940');
      grad.addColorStop(0.8, '#ffcc66');
      grad.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(fx - 14, fy);
      ctx.quadraticCurveTo(fx - 5 + Math.sin(this.elapsed * 8 + i) * 8, fy - flameH * 0.5, fx, fy - flameH + Math.sin(this.elapsed * 10 + i) * 10);
      ctx.quadraticCurveTo(fx + 5 + Math.cos(this.elapsed * 7 + i) * 8, fy - flameH * 0.5, fx + 14, fy);
      ctx.fill();
    }

    // Thermometer
    const thermoX = 60, thermoY = h * 0.15, thermoH = h * 0.55, thermoW = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(thermoX - 2, thermoY, thermoW + 4, thermoH);

    // Mercury column
    const tempRatio = Math.max(0, Math.min(1, (this.temperature - 700) / 400));
    const mercuryH = thermoH * tempRatio;
    const mercGrad = ctx.createLinearGradient(0, thermoY + thermoH - mercuryH, 0, thermoY + thermoH);
    mercGrad.addColorStop(0, '#ff4444'); mercGrad.addColorStop(1, '#ff9940');
    ctx.fillStyle = mercGrad;
    ctx.fillRect(thermoX, thermoY + thermoH - mercuryH, thermoW, mercuryH);

    // Target zone on thermometer
    const zoneY1 = thermoY + thermoH - (this.targetZone.max - 700) / 400 * thermoH;
    const zoneY2 = thermoY + thermoH - (this.targetZone.min - 700) / 400 * thermoH;
    ctx.fillStyle = 'rgba(0,255,150,0.4)';
    ctx.fillRect(thermoX - 6, zoneY1, thermoW + 12, zoneY2 - zoneY1);
    ctx.strokeStyle = '#0f6'; ctx.lineWidth = 1;
    ctx.strokeRect(thermoX - 6, zoneY1, thermoW + 12, zoneY2 - zoneY1);

    // Temperature labels
    ctx.fillStyle = '#e8c8a0'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(this.temperature)}°C`, thermoX - 15, thermoY - 10);
    ctx.fillText(`目标 ${this.targetZone.min}-${this.targetZone.max}°C`, thermoX - 15, thermoY + thermoH + 20);

    // Pottery piece in kiln
    const potX = w * 0.7, potY = h * 0.35;
    const heatRatio = Math.max(0, Math.min(1, (this.temperature - 850) / 150));
    const potColor = this._lerpColor('#a06838', '#e8c8a0', heatRatio);
    ctx.fillStyle = potColor;
    ctx.beginPath(); ctx.arc(potX, potY, 35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(potX, potY + 15, 25, Math.PI, 0); ctx.fill();

    // Glaze effect at high temps
    const glazeAlpha = Math.max(0, heatRatio - 0.6) * 0.4;
    const glazeGrad = ctx.createRadialGradient(potX - 8, potY - 10, 5, potX, potY, 35);
    glazeGrad.addColorStop(0, `rgba(122,184,160,${glazeAlpha})`);
    glazeGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glazeGrad;
    ctx.beginPath(); ctx.arc(potX, potY, 35, 0, Math.PI * 2); ctx.fill();

    // Controls
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('← → 或点击左右区域 调节火力', cx, h - 20);
    const bar = '█'.repeat(Math.floor(this.fuelLevel * 10)) + '░'.repeat(10 - Math.floor(this.fuelLevel * 10));
    ctx.fillText(`火力: ${bar}`, cx, h - 40);
  },

  _lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1,3), 16), g1 = parseInt(c1.slice(3,5), 16), b1 = parseInt(c1.slice(5,7), 16);
    const r2 = parseInt(c2.slice(1,3), 16), g2 = parseInt(c2.slice(3,5), 16), b2 = parseInt(c2.slice(5,7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
  },

  handleInput(e) {
    if (this.completed) return;
    if (e.type === 'keydown') {
      if (e.key === 'ArrowLeft' || e.key === 'a') { this.fuelLevel = Math.min(1, this.fuelLevel + 0.3); TaoHun.Audio.play('fireCrackle'); }
      if (e.key === 'ArrowRight' || e.key === 'd') { this.fuelLevel = Math.max(0, this.fuelLevel - 0.3); }
    }
    if (e.type === 'pointerdown') {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = TaoHun.Game._logicalW;
      this._touchSide = x < w / 2 ? 'left' : 'right';
      this._pointerDown = true;
    }
    if (e.type === 'pointerup' || e.type === 'pointerleave') {
      this._pointerDown = false;
      this._touchSide = null;
    }
  },

  isComplete() { return this.completed; },

  getScore() {
    const ratio = this.totalTime > 0 ? this.inZoneTime / this.totalTime : 0;
    const penalty = Math.min(0.3, (this.burnedCount + this.coldCount) * 0.005);
    const score = Math.round(Math.max(0, ratio - penalty) * 100);
    return { score: Math.min(100, score), details: { inZoneRatio: ratio, burned: this.burnedCount, cold: this.coldCount } };
  },

  cleanup() { this._brickCache = null; TaoHun.Particles.clear(); }
};
