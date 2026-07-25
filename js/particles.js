window.TaoHun = window.TaoHun || {};

TaoHun.Particles = {
  emitters: [],

  emit(config) {
    const particles = [];
    for (let i = 0; i < (config.count || 10); i++) {
      const angle = (Math.PI * 2 / config.count) * i + (Math.random() - 0.5) * (config.spread || 1);
      const speed = (config.speed || 100) * (0.5 + Math.random());
      particles.push({
        type: config.type || 'chip',
        x: config.x, y: config.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (config.type === 'spark' ? speed * 0.3 : 0),
        life: config.life || 0.6,
        maxLife: config.life || 0.6,
        size: config.size || (2 + Math.random() * 3),
        color: config.color || '#c49470',
      });
    }
    this.emitters.push({ particles, age: 0 });
  },

  update(dt) {
    for (const emitter of this.emitters) {
      emitter.age += dt;
      for (const p of emitter.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.type === 'spark') p.vy -= 80 * dt;  // 火星上升
        if (p.type === 'chip') p.vy += 200 * dt;  // 泥屑下落
      }
    }
    // 清理过期粒子
    this.emitters = this.emitters.filter(e => e.age < 2);
  },

  render(ctx) {
    for (const emitter of this.emitters) {
      for (const p of emitter.particles) {
        if (p.life <= 0) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.type === 'spark') {
          ctx.globalAlpha = alpha * 0.25;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.3, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'bubble') {
          // 气泡：半透明白色圆
          const grad = ctx.createRadialGradient(p.x - 1, p.y - 1, 0, p.x, p.y, p.size);
          grad.addColorStop(0, 'rgba(255,255,255,0.6)');
          grad.addColorStop(0.6, 'rgba(200,180,150,0.3)');
          grad.addColorStop(1, 'rgba(200,180,150,0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else {
          // 泥屑：不规则小点
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
  },

  clear() {
    this.emitters = [];
  }
};
