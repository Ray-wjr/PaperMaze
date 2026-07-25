window.TaoHun = window.TaoHun || {};
TaoHun.Stages = TaoHun.Stages || {};

TaoHun.Stages.Knead = {
  init(ctx, canvas) {
    this.ctx = ctx; this.canvas = canvas;
  },

  start() {
    this.duration = 18;
    this.elapsed = 0;
    this.bubbles = [];
    this.hitCount = 0;
    this.missCount = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.8;
    this.rotation = 0;
    this.mudScale = 1;
    this.completed = false;
  },

  getCenter() {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    return { x: w / 2, y: h / 2 };
  },

  update(dt) {
    if (this.completed) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.completed = true; return; }

    const progress = this.elapsed / this.duration;
    this.spawnInterval = 0.8 - progress * 0.45;
    this.rotation += dt * (2 + progress * 3);
    this.mudScale = 1 + Math.sin(this.elapsed * 4) * 0.02;

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      const center = this.getCenter();
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 45;
      this.bubbles.push({
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
        radius: 6 + Math.random() * 10,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 0,
        opacity: 1,
        tint: Math.random() < 0.4 ? 'warm' : 'cool',
      });
      this.bubbles.forEach(b => { if (!b.maxLife) b.maxLife = b.life; });
    }

    for (const b of this.bubbles) {
      b.life -= dt;
      b.opacity = Math.max(0, b.life / b.maxLife);
    }

    const expired = this.bubbles.filter(b => b.life <= 0);
    for (const b of expired) {
      this.missCount++;
      this.combo = 0;
      TaoHun.Audio.play('miss');
      TaoHun.Particles.emit({
        x: b.x, y: b.y, type: 'bubble', count: 5,
        spread: 2, speed: 60, life: 0.3, size: b.radius * 0.6, color: '#ffffff'
      });
    }
    this.bubbles = this.bubbles.filter(b => b.life > 0);
  },

  render(ctx) {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    const center = this.getCenter();

    // Background — wooden workbench
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(139,90,48,${0.08 + i * 0.01})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 80 + i * 70 + Math.sin(i * 2.3) * 30);
      for (let x = 0; x < w; x += 40) {
        ctx.lineTo(x, 80 + i * 70 + Math.sin(x * 0.003 + i) * 20);
      }
      ctx.stroke();
    }

    // Clay mass
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(this.rotation * 0.3);
    ctx.scale(this.mudScale, this.mudScale);

    const mudGrad = ctx.createRadialGradient(0, -5, 10, 0, 0, 70);
    mudGrad.addColorStop(0, '#c49470');
    mudGrad.addColorStop(0.5, '#a06838');
    mudGrad.addColorStop(0.85, '#7a4a28');
    mudGrad.addColorStop(1, '#5a3018');
    ctx.fillStyle = mudGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();

    // Wet shine
    const shineGrad = ctx.createRadialGradient(-18, -22, 5, 0, 0, 70);
    shineGrad.addColorStop(0, 'rgba(255,240,220,0.18)');
    shineGrad.addColorStop(0.4, 'rgba(255,220,200,0.06)');
    shineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shineGrad;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();

    // Kneading texture lines
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(90,40,20,${0.15 + i * 0.05})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const r = 45 + i * 10;
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const rr = r + Math.sin(a * 5 + this.rotation * (1 + i * 0.5)) * 4;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Bubbles
    for (const b of this.bubbles) {
      ctx.save();
      ctx.globalAlpha = b.opacity;
      const isWarm = b.tint === 'warm';
      const bGrad = ctx.createRadialGradient(b.x - 1, b.y - 1, b.radius * 0.2, b.x, b.y, b.radius);
      bGrad.addColorStop(0, isWarm ? 'rgba(255,245,200,0.7)' : 'rgba(255,255,255,0.7)');
      bGrad.addColorStop(0.5, isWarm ? 'rgba(240,210,160,0.3)' : 'rgba(220,200,180,0.3)');
      bGrad.addColorStop(1, 'rgba(200,180,150,0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isWarm ? 'rgba(255,245,210,0.5)' : 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.25, b.y - b.radius * 0.25, b.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Timer
    const remaining = Math.max(0, this.duration - this.elapsed);
    ctx.fillStyle = '#e8c8a0';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${remaining.toFixed(1)}s`, center.x, center.y + 100);

    // Combo display
    if (this.combo >= 3) {
      ctx.fillStyle = '#ff9940';
      ctx.font = 'bold 18px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText(`${this.combo} 连击!`, center.x, center.y - 100);
    }
  },

  handleInput(e) {
    if (this.completed) return;
    if (e.type !== 'pointerdown') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hit = null;
    for (const b of this.bubbles) {
      const dx = x - b.x, dy = y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.radius + 8) {
        hit = b; break;
      }
    }
    if (hit) {
      this.hitCount++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const isPerfect = hit.life / hit.maxLife < 0.3;
      TaoHun.Audio.play(isPerfect ? 'perfect' : 'pop');
      TaoHun.Particles.emit({
        x: hit.x, y: hit.y, type: 'bubble', count: 10,
        spread: 3, speed: 100, life: 0.4, size: hit.radius * 0.4, color: '#ffffff'
      });
      this.bubbles = this.bubbles.filter(b => b !== hit);
    } else {
      this.combo = 0;
    }
  },

  isComplete() { return this.completed; },

  getScore() {
    const total = this.hitCount + this.missCount || 1;
    const hitRate = this.hitCount / total;
    const comboBonus = Math.min(1, this.maxCombo / 15);
    const score = Math.round(hitRate * 70 + comboBonus * 30);
    return {
      score: Math.min(100, score),
      details: { hitCount: this.hitCount, missCount: this.missCount, maxCombo: this.maxCombo }
    };
  },

  cleanup() { TaoHun.Particles.clear(); }
};
