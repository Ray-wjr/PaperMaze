window.TaoHun = window.TaoHun || {};
TaoHun.Stages = TaoHun.Stages || {};

TaoHun.Stages.Carve = {
  init(ctx, canvas) { this.ctx = ctx; this.canvas = canvas; },

  start() {
    this.duration = 25;
    this.elapsed = 0;
    this.pattern = this._generatePattern();
    this.pathProgress = 0;
    this.pathLength = this._computePathLength(this.pattern);
    this.isDrawing = false;
    this.pointerOnPath = false;
    this.onPathTime = 0;
    this.offPathTime = 0;
    this.totalDrawTime = 0;
    this.completed = false;
    this.carveTrail = [];
    this._lastPointer = null;
  },

  _generatePattern() {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    const cx = w / 2, cy = h / 2;
    const path = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cx + Math.sin(t * Math.PI * 3) * 90;
      const y = cy + 90 - t * 180;
      path.push({ x, y });
    }
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const baseIdx = Math.floor((0.3 + t * 0.4) * steps);
      const base = path[Math.min(baseIdx, steps)];
      const x = base.x - t * 60 + Math.sin(t * Math.PI) * 20;
      const y = base.y + t * 10;
      path.push({ x, y });
    }
    return path;
  },

  _computePathLength(pattern) {
    let len = 0;
    for (let i = 1; i < pattern.length; i++) {
      const dx = pattern[i].x - pattern[i-1].x;
      const dy = pattern[i].y - pattern[i-1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  },

  _getClosestPoint(px, py) {
    let minDist = Infinity, minIdx = 0;
    for (let i = 0; i < this.pattern.length; i++) {
      const dx = px - this.pattern[i].x;
      const dy = py - this.pattern[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; minIdx = i; }
    }
    return { index: minIdx, dist: minDist };
  },

  update(dt) {
    if (this.completed) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.completed = true; return; }

    if (this.isDrawing) {
      this.totalDrawTime += dt;
      if (this.pointerOnPath) {
        this.onPathTime += dt;
        this.pathProgress = Math.min(1, this.pathProgress + dt / 18);
        if (this._lastPointer) {
          this.carveTrail.push({ x: this._lastPointer.x, y: this._lastPointer.y, life: 1.5 });
        }
      } else {
        this.offPathTime += dt;
      }
    }

    for (const t of this.carveTrail) t.life -= dt;
    this.carveTrail = this.carveTrail.filter(t => t.life > 0);
  },

  render(ctx) {
    const w = TaoHun.Game._logicalW;
    const h = TaoHun.Game._logicalH;
    const cx = w / 2, cy = h / 2;

    ctx.fillStyle = '#1a0c04'; ctx.fillRect(0, 0, w, h);

    // Vessel background
    const bodyGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 120);
    bodyGrad.addColorStop(0, '#c49470'); bodyGrad.addColorStop(0.5, '#a06838'); bodyGrad.addColorStop(0.9, '#6b3a1a'); bodyGrad.addColorStop(1, '#1a0c04');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.fill();

    // Completed path — gold carved line
    const doneCount = Math.floor(this.pathProgress * this.pattern.length);
    if (doneCount > 0) {
      ctx.strokeStyle = 'rgba(220,180,100,0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.pattern[0].x, this.pattern[0].y);
      for (let i = 1; i < doneCount; i++) {
        ctx.lineTo(this.pattern[i].x, this.pattern[i].y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,120,0.3)';
      ctx.lineWidth = 6; ctx.stroke();
    }

    // Remaining path — dashed guide
    if (doneCount < this.pattern.length - 1) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.pattern[Math.max(0, doneCount)].x, this.pattern[Math.max(0, doneCount)].y);
      for (let i = Math.max(1, doneCount); i < this.pattern.length; i++) {
        ctx.lineTo(this.pattern[i].x, this.pattern[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Current pointer
    if (this.isDrawing && this._lastPointer) {
      ctx.fillStyle = '#ff9940';
      ctx.beginPath(); ctx.arc(this._lastPointer.x, this._lastPointer.y, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Off-path warning
    if (this.isDrawing && !this.pointerOnPath) {
      ctx.fillStyle = 'rgba(255,60,30,0.6)';
      ctx.font = '16px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('偏离纹样!', cx, cy - 140);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('按住鼠标/手指沿纹样描画', cx, h - 30);
  },

  handleInput(e) {
    if (this.completed) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.type === 'pointerdown') {
      this.isDrawing = true;
      this._lastPointer = { x, y };
      const closest = this._getClosestPoint(x, y);
      this.pointerOnPath = closest.dist < 30;
      if (this.pointerOnPath) TaoHun.Audio.play('scratch');
    } else if (e.type === 'pointermove' && this.isDrawing) {
      this._lastPointer = { x, y };
      const closest = this._getClosestPoint(x, y);
      this.pointerOnPath = closest.dist < 30;
    } else if (e.type === 'pointerup') {
      this.isDrawing = false;
      this._lastPointer = null;
    }
  },

  isComplete() { return this.completed; },

  getScore() {
    const total = this.onPathTime + this.offPathTime || 1;
    const accuracy = this.onPathTime / total;
    const completion = this.pathProgress;
    const score = Math.round(accuracy * 60 + completion * 40);
    return { score: Math.min(100, score), details: { accuracy, completion } };
  },

  cleanup() { TaoHun.Particles.clear(); }
};
