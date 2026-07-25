window.TaoHun = window.TaoHun || {};

TaoHun.UI = {
  showMenu(onStart) {
    const ui = document.getElementById('uiLayer');
    ui.innerHTML = `
      <div class="menu-container" style="
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:24px;
      ">
        <div class="game-title" style="margin-bottom:8px;">陶 魂</div>
        <div class="game-subtitle">荣昌陶器 · 节奏技艺之旅</div>
        <div style="margin-top:20px;display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
          ${['碗','罐','瓶','坛'].map(s => `
            <div class="shape-card" data-shape="${s}" style="
              width:100px;height:100px;border:2px solid #5a3a1a;
              border-radius:50%;display:flex;align-items:center;justify-content:center;
              cursor:pointer;background:rgba(139,90,48,0.15);
              transition:all 0.3s;color:var(--clay-pale);font-size:20px;
              letter-spacing:2px;
            ">${s}</div>
          `).join('')}
        </div>
        <p style="color:var(--clay-mid);font-size:13px;margin-top:8px;">选择器型开始制陶</p>
      </div>
    `;
    ui.querySelectorAll('.shape-card').forEach(card => {
      card.addEventListener('pointerenter', () => {
        card.style.borderColor = 'var(--fire-bright)';
        card.style.background = 'rgba(255,153,64,0.2)';
      });
      card.addEventListener('pointerleave', () => {
        card.style.borderColor = '#5a3a1a';
        card.style.background = 'rgba(139,90,48,0.15)';
      });
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const shape = card.dataset.shape;
        ui.innerHTML = '';
        TaoHun.Audio.play('transition');
        onStart(shape);
      });
    });
  },

  showStageIntro(name, onDone) {
    const ui = document.getElementById('uiLayer');
    const titles = {
      '练泥': ['揉泥去浊', '排除泥中气泡，使泥料均匀'],
      '拉坯': ['轮转成形', '把握提拉时机，塑造器型'],
      '修坯': ['刀走泥落', '削去多余泥料，修整器壁'],
      '刻花': ['铁笔生花', '沿纹样刻画，赋予器物灵魂'],
      '烧制': ['烈火成器', '掌控窑温，淬炼出釉色'],
    };
    const [sub, hint] = titles[name] || [name, ''];
    ui.innerHTML = `
      <div class="intro-overlay" style="
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        background:rgba(26,12,4,0.85);z-index:20;
      ">
        <div style="font-family:var(--title-font);font-size:clamp(22px, 8vw, 36px);color:var(--text-pale);
          letter-spacing:6px;text-shadow:0 0 30px rgba(255,150,50,0.3);">${name}</div>
        <div style="font-family:var(--title-font);font-size:22px;color:var(--fire-bright);
          letter-spacing:8px;margin-top:12px;">${sub}</div>
        <div style="color:var(--clay-mid);font-size:14px;margin-top:16px;letter-spacing:2px;">${hint}</div>
      </div>
    `;
    setTimeout(() => {
      ui.innerHTML = '';
      if (onDone) onDone();
      TaoHun.Audio.init();
    }, 2000);
  },

  renderHUD(ctx, stageIndex, score) {
    const names = ['练泥', '拉坯', '修坯', '刻花', '烧制'];
    const w = TaoHun.Game._logicalW;
    const barW = 300, barH = 4;
    const barX = (w - barW) / 2;
    const barY = 30;

    // 进度条背景
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);

    // 进度条填充
    const progress = (stageIndex + (score > 0 ? 0.5 : 0)) / 5;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#ff6b35'); grad.addColorStop(1, '#ff9940');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * progress, barH);

    // 环节名和分数
    ctx.fillStyle = '#e8c8a0';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${names[stageIndex]} · 得分 ${Math.round(score)}`, barX + barW / 2, barY - 10);

    // 环节指示器圆点
    const dotY = barY + 20, dotSpacing = barW / 4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(barX + dotSpacing * i, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = i < stageIndex ? '#ff9940'
        : i === stageIndex ? '#e8c8a0'
        : 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.fillStyle = '#8b5a30';
      ctx.font = '10px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(names[i].charAt(0), barX + dotSpacing * i, dotY + 18);
    }
  },

  showTransition(onDone) {
    TaoHun.Audio.play('transition');
    const ui = document.getElementById('uiLayer');
    ui.innerHTML = `
      <div class="transition-overlay" style="
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        background:rgba(26,12,4,0.7);z-index:20;
      ">
        <div style="color:var(--fire-bright);font-size:24px;letter-spacing:6px;
          animation: pulse 0.8s ease-in-out;">
          下一环节...
        </div>
      </div>
      <style>
        @keyframes pulse { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
      </style>
    `;
    setTimeout(() => { ui.innerHTML = ''; onDone(); }, 1500);
  },

  showResult(scores, onRestart) {
    TaoHun.Audio.play('complete');
    const total = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    let rank, rankColor;
    if (total >= 95) { rank = '神品'; rankColor = '#ffcc00'; }
    else if (total >= 85) { rank = '精品'; rankColor = '#ff9940'; }
    else if (total >= 70) { rank = '良品'; rankColor = '#7ab8a0'; }
    else { rank = '习作'; rankColor = '#8b5a30'; }

    const names = ['练泥', '拉坯', '修坯', '刻花', '烧制'];
    const scoreRows = names.map((n, i) => `
      <div style="display:flex;justify-content:space-between;width:240px;
        padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="color:#c49470;">${n}</span>
        <span style="color:#e8c8a0;font-weight:bold;">${scores[i]}</span>
      </div>
    `).join('');

    const ui = document.getElementById('uiLayer');
    ui.innerHTML = `
      <div class="result-overlay" style="
        position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:16px;
        background:rgba(26,12,4,0.9);z-index:20;
      ">
        <div class="game-title" style="font-size:28px;">陶成</div>
        <div style="font-size:clamp(32px, 12vw, 56px);color:${rankColor};letter-spacing:8px;
          text-shadow:0 0 40px ${rankColor}44;">${rank}</div>
        <div style="font-size:18px;color:var(--clay-pale);">总评 ${total} / 100</div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
          ${scoreRows}
        </div>
        <div class="btn" style="margin-top:20px;" id="restartBtn">重 新 制 陶</div>
      </div>
    `;
    document.getElementById('restartBtn').addEventListener('pointerdown', () => {
      ui.innerHTML = '';
      onRestart();
    });
  }
};
