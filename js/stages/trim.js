window.TaoHun = window.TaoHun || {};
TaoHun.Stages = TaoHun.Stages || {};

TaoHun.Stages.Trim = {
  init(ctx, canvas) { this.ctx = ctx; this.canvas = canvas; },

  start() {
    this.duration = 18;
    this.elapsed = 0;
    this.rotation = 0;
    this.rotationSpeed = 2;
    this.zones = [];
    this.zoneTimer = 0;
    this.bladeAngle = -0.8;
    this.bladeTarget = -0.8;
    this.perfectCuts = 0;
    this.goodCuts = 0;
    this.badCuts = 0;
    this.completed = false;
    this.isCutting = false;
  },

  _spawnZone() {
    this.zones.push({
      angle: Math.random() * Math.PI * 2,
      size: 0.15 + Math.random() * 0.25,
      depth: 1,
      life: 4,
    });
  },

  update(dt) {
    if (this.completed) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.completed = true; return; }

    const progress = this.elapsed / this.duration;
    this.rotation += dt * (2 + progress * 3);
    this.rotationSpeed = 2 + progress * 3;

    this.zoneTimer -= dt;
    if (this.zoneTimer <= 0) {
      this._spawnZone();
      this.zoneTimer = 0.8 - progress * 0.3;
    }

    for (const z of this.zones) z.life -= dt;
    this.zones = this.zones.filter(z => z.life > 0);
    this.bladeAngle += (this.bladeTarget - this.bladeAngle) * dt * 8;
  },

  render(ctx) {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    const cx = w / 2, cy = h / 2;
    const vesselR = 80;

    ctx.fillStyle = '#1a0c04'; ctx.fillRect(0, 0, w, h);

    // Vessel body
    ctx.save();
    ctx.translate(cx, cy);
    const bodyGrad = ctx.createRadialGradient(-10, -10, 20, 0, 0, vesselR);
    bodyGrad.addColorStop(0, '#c49470'); bodyGrad.addColorStop(0.6, '#8b5a30'); bodyGrad.addColorStop(1, '#6b3a1a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(0, 0, vesselR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3018';
    ctx.beginPath(); ctx.arc(0, 0, vesselR * 0.55, 0, Math.PI * 2); ctx.fill();

    // Marked zones
    for (const z of this.zones) {
      const a = z.angle + this.rotation;
      const alpha = Math.min(1, z.life / 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, vesselR, a - z.size / 2, a + z.size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Blade
    const bladeX = cx + Math.cos(this.bladeAngle) * vesselR * 1.3;
    const bladeY = cy + Math.sin(this.bladeAngle) * vesselR * 1.3;
    ctx.save();
    ctx.translate(bladeX, bladeY);
    ctx.rotate(this.bladeAngle + Math.PI / 2);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(-4, -30, 8, 60);
    const bladeGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    bladeGrad.addColorStop(0, '#999'); bladeGrad.addColorStop(0.5, '#ddd'); bladeGrad.addColorStop(1, '#888');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(-6, -30); ctx.lineTo(6, -30); ctx.lineTo(3, -60); ctx.lineTo(-3, -60);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('点击 / 空格键 削切', cx, h - 30);
  },

  handleInput(e) {
    if (this.completed) return;
    const isCut = (e.type === 'pointerdown') || (e.type === 'keydown' && e.key === ' ');
    if (!isCut || e.repeat) return;

    const cx = TaoHun.Game._logicalW / 2;

    let bestZone = null, bestDist = Infinity;
    for (const z of this.zones) {
      const zoneAngle = (z.angle + this.rotation) % (Math.PI * 2);
      const bladeNorm = (this.bladeAngle + Math.PI * 2) % (Math.PI * 2);
      let diff = Math.abs(zoneAngle - bladeNorm);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < z.size * 0.7 && diff < bestDist) { bestDist = diff; bestZone = z; }
    }

    if (bestZone) {
      const precision = 1 - bestDist / (bestZone.size * 0.7);
      if (precision > 0.8) { this.perfectCuts++; TaoHun.Audio.play('perfect'); }
      else if (precision > 0.4) { this.goodCuts++; TaoHun.Audio.play('good'); }
      else { this.goodCuts++; TaoHun.Audio.play('scrape'); }

      TaoHun.Particles.emit({
        x: cx + Math.cos(this.bladeAngle) * 80,
        y: TaoHun.Game._logicalH / 2 + Math.sin(this.bladeAngle) * 80,
        type: 'chip', count: 12, spread: 2, speed: 120, life: 0.6, size: 3, color: '#a06838'
      });
      this.zones = this.zones.filter(z => z !== bestZone);
      this.bladeTarget = this.bladeAngle + 0.15;
    } else {
      this.badCuts++; TaoHun.Audio.play('miss');
      this.bladeTarget = this.bladeAngle + 0.15;
    }
  },

  isComplete() { return this.completed; },

  getScore() {
    const total = this.perfectCuts + this.goodCuts + this.badCuts || 1;
    const score = Math.round((this.perfectCuts * 100 + this.goodCuts * 60) / (total * 100) * 100);
    return { score: Math.min(100, score), details: { perfect: this.perfectCuts, good: this.goodCuts, bad: this.badCuts } };
  },

  cleanup() { TaoHun.Particles.clear(); }
};
