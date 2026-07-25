window.TaoHun = window.TaoHun || {};
TaoHun.Stages = TaoHun.Stages || {};

TaoHun.Stages.Throw = {
  init(ctx, canvas) { this.ctx = ctx; this.canvas = canvas; },

  start() {
    this.duration = 22;
    this.elapsed = 0;
    this.wheelRotation = 0;
    this.vesselHeight = 30;
    this.targetHeight = 30;
    this.vesselWidth = 40;
    this.targetWidth = 40;
    this.wavePhase = 0;
    this.waveSpeed = 1.5;
    this.actionZone = null;
    this.zoneTimer = 0;
    this.zoneDuration = 0.6;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.completed = false;
    this._lastPerfectTime = -1;
  },

  update(dt) {
    if (this.completed) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.completed = true; return; }

    const progress = this.elapsed / this.duration;

    this.wheelRotation += dt * (3 + progress * 4);
    this.waveSpeed = 1.5 + progress * 2;
    this.wavePhase += dt * this.waveSpeed;
    this.zoneTimer -= dt;

    if (this.zoneTimer <= 0) {
      this.actionZone = Math.random() < 0.5 ? 'up' : 'down';
      this.zoneDuration = 0.55 - progress * 0.25;
      this.zoneTimer = this.zoneDuration + 0.3;
      if (this.actionZone === 'up') this.targetHeight = Math.min(90, this.targetHeight + 8 + Math.random() * 10);
      else this.targetWidth = Math.min(70, this.targetWidth + 5 + Math.random() * 8);
    }

    this.vesselHeight += (this.targetHeight - this.vesselHeight) * dt * 3;
    this.vesselWidth += (this.targetWidth - this.vesselWidth) * dt * 3;
  },

  render(ctx) {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    const cx = w / 2, cy = h / 2;

    ctx.fillStyle = '#1a0c04'; ctx.fillRect(0, 0, w, h);

    // Wheel base
    const wheelR = 110;
    ctx.save();
    ctx.translate(cx, cy + 60);
    ctx.rotate(this.wheelRotation);
    const wheelGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, wheelR);
    wheelGrad.addColorStop(0, '#6b4a2a'); wheelGrad.addColorStop(0.7, '#4a2a10'); wheelGrad.addColorStop(1, '#2a1808');
    ctx.fillStyle = wheelGrad;
    ctx.beginPath(); ctx.arc(0, 0, wheelR, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(90,50,20,0.3)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 40 + i * 18, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // Vessel
    const vesselBaseY = cy + 60;
    const vesselH = 40 + this.vesselHeight * 1.2;
    const vesselW = 30 + this.vesselWidth * 1.0;
    const vesselTop = vesselBaseY - vesselH;

    ctx.save();
    ctx.fillStyle = '#a06838';
    ctx.beginPath();
    ctx.moveTo(cx - vesselW * 0.9, vesselBaseY);
    ctx.quadraticCurveTo(cx - vesselW, vesselBaseY - vesselH * 0.5, cx - vesselW * 0.6, vesselTop);
    ctx.lineTo(cx + vesselW * 0.6, vesselTop);
    ctx.quadraticCurveTo(cx + vesselW, vesselBaseY - vesselH * 0.5, cx + vesselW * 0.9, vesselBaseY);
    ctx.closePath();
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(cx - vesselW, 0, cx + vesselW, 0);
    bodyGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
    bodyGrad.addColorStop(0.3, 'rgba(255,220,180,0.08)');
    bodyGrad.addColorStop(0.5, 'rgba(255,240,220,0.15)');
    bodyGrad.addColorStop(0.7, 'rgba(255,220,180,0.05)');
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = bodyGrad; ctx.fill();

    // Rim
    ctx.fillStyle = '#8b5030';
    ctx.beginPath(); ctx.ellipse(cx, vesselTop, vesselW * 0.6, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b3a1a';
    ctx.beginPath(); ctx.ellipse(cx, vesselTop, vesselW * 0.6 - 6, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Gold glow on perfect
    if (this._lastPerfectTime >= 0 && this.elapsed - this._lastPerfectTime < 0.3) {
      const alpha = 1 - (this.elapsed - this._lastPerfectTime) / 0.3;
      ctx.strokeStyle = `rgba(255,200,80,${alpha * 0.6})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(cx, vesselTop, vesselW * 0.6 + 10, 14, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    // Hands
    const handY = vesselBaseY - vesselH * 0.5;
    ctx.fillStyle = '#c49470';
    ctx.beginPath(); ctx.ellipse(cx - vesselW - 15, handY, 12, 22, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + vesselW + 15, handY, 12, 22, 0.3, 0, Math.PI * 2); ctx.fill();

    // Action zone indicator
    if (this.actionZone && this.zoneTimer > this.zoneDuration * 0.3) {
      const zoneAlpha = Math.min(1, this.zoneTimer / this.zoneDuration);
      ctx.save();
      ctx.globalAlpha = zoneAlpha * 0.6;
      ctx.fillStyle = this.actionZone === 'up' ? '#4af' : '#f84';
      ctx.font = 'bold 24px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.actionZone === 'up' ? '↑ 提拉' : '↓ 下压', cx, vesselTop - 40);
      ctx.strokeStyle = this.actionZone === 'up' ? '#4af' : '#f84';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx, vesselTop, vesselW * 0.6 + 12, 16, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Controls hint
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('左半屏 提拉 ↑  |  右半屏 下压 ↓  (键盘: ↑↓)', cx, h - 30);
  },

  handleInput(e) {
    if (this.completed) return;
    let action = null;
    if (e.type === 'keydown') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') action = 'up';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') action = 'down';
    }
    if (e.type === 'pointerdown') {
	      const rect = this.canvas.getBoundingClientRect();
	      const x = e.clientX - rect.left;
	      const w = TaoHun.Game._logicalW;
	      action = x < w / 2 ? 'up' : 'down';
	    }
	    if (!action || e.repeat) return;

    if (this.actionZone && this.zoneTimer > this.zoneDuration * 0.3) {
      if (action === this.actionZone) {
        const remaining = this.zoneTimer / this.zoneDuration;
        if (remaining > 0.7) {
          this.perfectCount++;
          this._lastPerfectTime = this.elapsed;
          TaoHun.Audio.play('perfect');
        } else {
          this.goodCount++;
          TaoHun.Audio.play('good');
        }
        const w = TaoHun.Game._logicalW;
        const h = TaoHun.Game._logicalH;
        TaoHun.Particles.emit({
          x: w / 2, y: h / 2 - 40, type: 'chip', count: 8,
          spread: 2, speed: 80, life: 0.5, size: 3, color: '#a06838'
        });
        this.zoneTimer = 0;
        this.actionZone = null;
      } else {
        this.missCount++; TaoHun.Audio.play('miss');
        this.zoneTimer = 0; this.actionZone = null;
      }
    }
  },

  isComplete() { return this.completed; },

  getScore() {
    const total = this.perfectCount + this.goodCount + this.missCount || 1;
    const score = Math.round((this.perfectCount * 100 + this.goodCount * 60) / (total * 100) * 100);
    return { score: Math.min(100, score), details: { perfect: this.perfectCount, good: this.goodCount, miss: this.missCount } };
  },

  cleanup() { TaoHun.Particles.clear(); }
};
