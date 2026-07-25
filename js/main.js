// 全局命名空间
window.TaoHun = window.TaoHun || {};

TaoHun.Game = {
  canvas: null,
  ctx: null,
  state: 'menu',    // menu | intro | playing | transition | result
  currentStage: 0,
  scores: [0, 0, 0, 0, 0],
  currentInstance: null,
  selectedShape: '碗',
  stageNames: ['练泥', '拉坯', '修坯', '刻花', '烧制'],
  stageKeys: ['knead', 'throw', 'trim', 'carve', 'fire'],

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.resize(), 150);
    });
    this._lastTime = performance.now();
    this.loop(this._lastTime);
    this.showMenu();
  },

  resize() {
    this._dpr = Math.min(devicePixelRatio || 1, 2);
    this._logicalW = window.innerWidth;
    this._logicalH = window.innerHeight;
    this.canvas.width = this._logicalW * this._dpr;
    this.canvas.height = this._logicalH * this._dpr;
    this.canvas.style.width = this._logicalW + 'px';
    this.canvas.style.height = this._logicalH + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this._dpr, this._dpr);
  },

  loop(timestamp) {
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this.state === 'playing' && this.currentInstance) {
      this.currentInstance.update(dt);
      if (this.currentInstance.isComplete()) {
        this.onStageComplete();
      }
    }

    TaoHun.Particles.update(dt);
    if (this.state !== 'menu') this.render();
  },

  render() {
    if (this.state === 'menu') return;
    const ctx = this.ctx;
    const w = this._logicalW;
    const h = this._logicalH;

    ctx.fillStyle = '#1a0c04';
    ctx.fillRect(0, 0, w, h);

    if ((this.state === 'playing' || this.state === 'intro') && this.currentInstance) {
      this.currentInstance.render(ctx);
    }

    if (this.state === 'playing') {
      TaoHun.UI.renderHUD(ctx, this.currentStage, this.scores[this.currentStage]);
    }

    TaoHun.Particles.render(ctx);
  },

  showMenu() {
    this.state = 'menu';
    this.currentInstance = null;
    TaoHun.UI.showMenu((shape) => {
      this.selectedShape = shape;
      this.startGame();
    });
  },

  startGame() {
    this.currentStage = 0;
    this.scores = [0, 0, 0, 0, 0];
    this.startStage();
  },

  startStage() {
    const key = this.stageKeys[this.currentStage];
    const StageCtor = TaoHun.Stages[key.charAt(0).toUpperCase() + key.slice(1)];
    this.currentInstance = Object.create(StageCtor);
    this.currentInstance.init(this.ctx, this.canvas);
    this.currentInstance.start();
    this.state = 'intro';
    TaoHun.UI.showStageIntro(this.stageNames[this.currentStage], () => {
      this.state = 'playing';
    });
  },

  onStageComplete() {
    const result = this.currentInstance.getScore();
    this.scores[this.currentStage] = result.score;
    this.currentInstance.cleanup();
    this.currentInstance = null;

    this.state = 'transition';
    this.currentStage++;
    if (this.currentStage >= 5) {
      this.showResult();
    } else {
      TaoHun.UI.showTransition(() => this.startStage());
    }
  },

  showResult() {
    this.state = 'result';
    // 'complete' sound is played by TaoHun.UI.showResult
    TaoHun.UI.showResult(this.scores, () => this.showMenu());
  },

  handleInput(e) {
    if (this.state === 'playing' && this.currentInstance) {
      this.currentInstance.handleInput(e);
    }
  }
};

// 全局 pointer 事件
document.addEventListener('pointerdown', e => TaoHun.Game.handleInput(e));
document.addEventListener('pointermove', e => TaoHun.Game.handleInput(e));
document.addEventListener('pointerup', e => TaoHun.Game.handleInput(e));
document.addEventListener('keydown', e => TaoHun.Game.handleInput(e));
document.addEventListener('keyup', e => TaoHun.Game.handleInput(e));

// 启动
window.addEventListener('DOMContentLoaded', () => TaoHun.Game.init());
