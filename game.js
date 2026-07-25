// ============================================================
//  纸境迷踪 (PaperMaze) — 大足剪纸主题解谜游戏
//  基于 Phaser 3 + Canvas 程序化绘制
// ============================================================

// ============================================================
//  SECTION 0: 游戏配置与常量
// ============================================================

const GAME_W = 960;
const GAME_H = 640;

// ---- 暖木纸艺色彩体系 ----
const C = {
    // 纸张色系
    PAPER:      0xfcf8f2,  // 米白纸色（主背景）
    PAPER_WARM: 0xf5efe8,  // 暖纸色
    PAPER_AGED: 0xe8d5b0,  // 旧纸色（水印等）
    PAPER_SHADOW:0xcbb8a5, // 纸阴影色
    // 剪纸色系
    RED:        0xbf4343,  // 复古红（剪纸主色）
    RED_DARK:   0x8b2e2e,  // 深红（镂空阴影）
    RED_DEEP:   0x5a1a1a,  // 深红（背景层）
    // 暖木色系（UI）
    WOOD:       0xd4a373,  // 暖木色（UI主色）
    WOOD_DARK:  0xb08968,  // 深木色
    WOOD_LIT:   0xe8c9a0,  // 亮木色
    // 金属色
    GOLD:       0xc9a84c,  // 金边
    GOLD_DIM:   0x8b7530,  // 暗金
    // 墨色系
    INK:        0x2c1810,  // 深褐色（文字/墨色）
    INK_LIGHT:  0x4a3528,  // 浅墨
    // 地面
    BROWN:      0x6b4a35,  // 深褐（平台）
    BROWN_LIT:  0x8b6a52,  // 亮褐
};

// --- 形状定义 ---
// hitbox 为相对玩家中心的偏移（用于 setSize + setOffset）
const SHAPE_DEFS = {
    normal: {
        name: '原形',   w: 44, h: 52,
        speedMul: 1.0,  jump: -420,
        canGlide: false, canGrapple: false, canInteract: false
    },
    slim: {
        name: '细条',   w: 20, h: 32,
        speedMul: 1.3,  jump: -280,
        canGlide: false, canGrapple: false, canInteract: false
    },
    wings: {
        name: '翅膀',   w: 56, h: 36,
        speedMul: 0.9,  jump: -380,
        canGlide: true,  canGrapple: false, canInteract: false
    },
    hook: {
        name: '钩子',   w: 44, h: 58,
        speedMul: 0.6,  jump: -300,
        canGlide: false, canGrapple: true,  canInteract: false
    },
    gear: {
        name: '齿轮',   w: 48, h: 48,
        speedMul: 0.7,  jump: 0,
        canGlide: false, canGrapple: false, canInteract: true
    }
};

// --- 锚点定义（8个，相对玩家中心的偏移） ---
const ANCHOR_OFFSETS = [
    { x: -18, y: -20 },  // 0: 左肩
    { x: -18, y:   0 },  // 1: 左腰
    { x: -18, y:  18 },  // 2: 左脚
    { x:  18, y:  18 },  // 3: 右脚
    { x:  18, y:   0 },  // 4: 右腰
    { x:  18, y: -20 },  // 5: 右肩
    { x:   0, y: -26 },  // 6: 头顶
    { x:   0, y:  22 }   // 7: 底中
];

// --- 切割模式：锚点对 → 形状 ---
// 每个条目: { anchors: [a,b], shape: 'xxx', desc: '...' }
const CUT_PATTERNS = [
    { anchors: [6, 7], shape: 'slim',  desc: '竖切——瘦身钻过低檐' },
    { anchors: [0, 5], shape: 'wings', desc: '上方横切——展翅滑翔' },
    { anchors: [1, 4], shape: 'hook',  desc: '中段横切——钩爪攀爬' },
    { anchors: [0, 3], shape: 'gear',  desc: '对角斜切——齿轮转动' }
];

// 损伤阈值
const DAMAGE_PER_CUT = 25;
const PASTE_HEAL = 30;

// ============================================================
//  SECTION 1: 房间数据
// ============================================================

const ROOMS = [
    // ===== Room 1: 入门·低檐 =====
    // 地面 y=580，天花板底部 y=545，间隙 35px
    // normal 头顶 y=528 → 撞头  slim 头顶 y=548 → 通过
    {
        id: 1, name: '第一关 · 低檐',
        playerSpawn: { x: 120, y: 540 },
        exit: { x: 870, y: 540, w: 40, h: 60 },
        maxCuts: 3,
        bgColor: C.PAPER,
        platforms: [
            { x: 0, y: 580, w: 960, h: 60 },
            { x: 480, y: 465, w: 360, h: 80 }     // 底 y=545
        ],
        pasteItems: [ { x: 250, y: 540 }, { x: 800, y: 540 } ],
        hint: '画竖线变细条，爬过低矮的屋檐！(6→7)'
    },

    // ===== Room 2: 断崖·滑翔 =====
    // 从地面直接跳+滑翔，无需平台。断崖 150px 宽
    // 翅膀跳 -380=80px高，滑翔重力 80，轻松飞过 150px
    {
        id: 2, name: '第二关 · 断崖',
        playerSpawn: { x: 150, y: 540 },
        exit: { x: 850, y: 540, w: 40, h: 60 },
        maxCuts: 3,
        bgColor: C.PAPER_WARM,
        platforms: [
            { x: 0, y: 580, w: 420, h: 60 },       // 左地面，右边界 x=420
            { x: 570, y: 580, w: 390, h: 60 }       // 右地面，左边界 x=570
            // 断崖 x=420 到 x=570 = 150px
        ],
        pasteItems: [ { x: 200, y: 540 }, { x: 680, y: 540 } ],
        hint: '跑到悬崖边→切翅膀→跳起来→空中自动滑翔！(0→5)'
    },

    // ===== Room 3: 高台·钩爪 =====
    // 钩点在平台左上方，玩家从侧面飞上去
    {
        id: 3, name: '第三关 · 高台',
        playerSpawn: { x: 100, y: 540 },
        exit: { x: 850, y: 290, w: 40, h: 40 },
        maxCuts: 3,
        bgColor: C.PAPER_WARM,
        platforms: [
            { x: 0, y: 580, w: 960, h: 60 },        // 地面
            { x: 860, y: 320, w: 120, h: 30 },       // 高台 x:800-920 顶y=320
            { x: 720, y: 380, w: 14, h: 14 }         // 钩挂点 平台左下方
        ],
        pasteItems: [ { x: 200, y: 540 }, { x: 740, y: 540 } ],
        hint: '走到左边钩挂点下方→切钩子→按↑飞起→右移落到高台！'
    },

    // ===== Room 4: 齿轮·机关 =====
    {
        id: 4, name: '第四关 · 机关',
        playerSpawn: { x: 100, y: 540 },
        exit: { x: 870, y: 540, w: 40, h: 60 },
        maxCuts: 3,
        bgColor: C.PAPER,
        platforms: [
            { x: 0, y: 580, w: 960, h: 60 },
            { x: 560, y: 480, w: 24, h: 100 }       // 机关墙
        ],
        pasteItems: [ { x: 250, y: 540 }, { x: 780, y: 540 } ],
        hint: '画对角斜线变齿轮，靠近机关墙自动开门！(0→3)'
    },

    // ===== Room 5: 综合试炼 =====
    {
        id: 5, name: '第五关 · 综合试炼',
        playerSpawn: { x: 100, y: 540 },
        exit: { x: 850, y: 290, w: 40, h: 40 },
        maxCuts: 5,
        bgColor: C.PAPER_WARM,
        platforms: [
            // 第1段：低檐 (slim) 底y=545
            { x: 0, y: 580, w: 480, h: 60 },
            { x: 320, y: 465, w: 100, h: 80 },
            // 第2段：齿轮墙 (gear) 地面 x:480-570 墙 x:545
            { x: 480, y: 580, w: 90, h: 60 },
            { x: 545, y: 480, w: 22, h: 100 },
            // 第3段：断崖 (wings) 80px — 翅膀跳+滑翔轻松过
            { x: 650, y: 580, w: 310, h: 60 },
            // 第4段：钩爪 (hook) — 钩点左边，平台右边
            { x: 860, y: 320, w: 120, h: 30 },
            { x: 720, y: 380, w: 14, h: 14 }
        ],
        pasteItems: [ { x: 200, y: 540 }, { x: 430, y: 540 }, { x: 780, y: 540 } ],
        hint: '四形全用！低檐(slim)→齿轮(gear)→断崖(wings)→钩爪(hook)'
    }
];

// ============================================================
//  SECTION 2: BootScene — 程序化纹理生成
// ============================================================

class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    create() {
        this.generatePlayerTextures();
        this.generateUITextures();
        this.generateObstacleTextures();
        this.scene.start('MenuScene');
    }

    generatePlayerTextures() {
        const shapes = ['normal', 'slim', 'wings', 'hook', 'gear'];
        const pad = 5;

        shapes.forEach(shape => {
            const def = SHAPE_DEFS[shape];
            const w = def.w, h = def.h;
            const tw = w + pad * 2, th = h + pad * 2;
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const ox = pad, oy = pad;

            // 阴影（带模糊感——用多层偏移模拟）
            g.fillStyle(C.INK, 0.08);
            g.fillRect(ox+3, oy+3, w, h);
            g.fillStyle(C.INK, 0.05);
            g.fillRect(ox+2, oy+2, w, h);

            // 主体红色剪纸
            this.drawPaperBody(g, shape, ox, oy, w, h);

            // 镂空花纹
            g.fillStyle(C.PAPER, 1);
            this.drawPaperHoles(g, shape, ox, oy, w, h);

            // 暗红层次装饰
            g.fillStyle(C.RED_DARK, 0.45);
            this.drawPaperDetails(g, shape, ox, oy, w, h);

            // 金色边框 2px
            g.lineStyle(2, C.GOLD, 0.85);
            this.drawPaperBodyStroke(g, shape, ox, oy, w, h);

            // 纸白切边 1px 偏移
            g.lineStyle(1, C.PAPER, 0.5);
            this.drawPaperBodyStroke(g, shape, ox+0.5, oy+0.5, w, h);

            g.generateTexture('player_' + shape, tw, th);
            g.destroy();
        });
    }

    // ---- 主体绘制 ----
    drawPaperBody(g, shape, ox, oy, w, h) {
        const cx = ox + w/2;
        g.fillStyle(C.RED, 1);

        if (shape === 'normal') {
            // 八角形头部
            const hr = 9;
            g.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = Math.PI*2*i/8 - Math.PI/2;
                const rr = i%2===0 ? hr : hr*0.75;
                const px = cx + Math.cos(a)*rr, py = oy+hr + Math.sin(a)*rr;
                if (i===0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath(); g.fillPath();
            // 颈部
            g.fillRect(cx-3, oy+17, 6, 4);
            // 身体（梯形曲线）
            g.beginPath();
            g.moveTo(cx-13, oy+21);
            g.lineTo(cx-15, oy+38);
            g.lineTo(cx-9, oy+50);
            g.lineTo(cx-4, oy+50);
            g.lineTo(cx-2, oy+38);
            g.lineTo(cx+2, oy+38);
            g.lineTo(cx+4, oy+50);
            g.lineTo(cx+9, oy+50);
            g.lineTo(cx+15, oy+38);
            g.lineTo(cx+13, oy+21);
            g.closePath(); g.fillPath();
        } else if (shape === 'slim') {
            // 细长菱形
            g.beginPath();
            g.moveTo(cx, oy);
            g.lineTo(cx+w/2-2, oy+h*0.15);
            g.lineTo(cx+w/2-1, oy+h*0.85);
            g.lineTo(cx, oy+h);
            g.lineTo(cx-w/2+1, oy+h*0.85);
            g.lineTo(cx-w/2+2, oy+h*0.15);
            g.closePath(); g.fillPath();
        } else if (shape === 'wings') {
            // 中央身体
            g.fillRect(cx-5, oy+h*0.25, 10, h*0.5);
            // 左翼（多段折线+锯齿）
            g.beginPath();
            g.moveTo(cx-5, oy+h*0.3);
            g.lineTo(ox, oy-h*0.05); g.lineTo(ox+4, oy);
            g.lineTo(ox+6, oy+h*0.1);
            for (let i=0;i<5;i++) {
                const t=i/5;
                g.lineTo(ox+8-i*1.5, oy+h*(0.2+t*0.15));
            }
            g.lineTo(cx-3, oy+h*0.9);
            g.closePath(); g.fillPath();
            // 右翼
            g.beginPath();
            g.moveTo(cx+5, oy+h*0.3);
            g.lineTo(ox+w, oy-h*0.05); g.lineTo(ox+w-4, oy);
            g.lineTo(ox+w-6, oy+h*0.1);
            for (let i=0;i<5;i++) {
                const t=i/5;
                g.lineTo(ox+w-8+i*1.5, oy+h*(0.2+t*0.15));
            }
            g.lineTo(cx+3, oy+h*0.9);
            g.closePath(); g.fillPath();
        } else if (shape === 'hook') {
            // 身体
            g.fillRect(cx-6, oy+18, 12, h-18);
            // 钩臂（折线+小弧模拟）
            g.beginPath();
            g.moveTo(cx-3, oy+18);
            g.lineTo(cx-3, oy+4); g.lineTo(cx-1, oy);
            g.lineTo(ox+w-4, oy);
            g.lineTo(ox+w, oy+4); g.lineTo(ox+w-2, oy+8);
            g.lineTo(ox+w-8, oy+8);
            g.lineTo(ox+w-10, oy+6); g.lineTo(cx-1, oy+4);
            g.lineTo(cx+1, oy+16);
            g.closePath(); g.fillPath();
        } else if (shape === 'gear') {
            // 真正齿轮：12齿
            const cx = ox+w/2, cy = oy+h/2;
            const r = Math.min(w,h)/2 - 2;
            g.beginPath();
            for (let i=0;i<12;i++) {
                const a = Math.PI*2*i/12 - Math.PI/2;
                const rr = i%2===0 ? r : r*0.65;
                const px = cx + Math.cos(a)*rr;
                const py = cy + Math.sin(a)*rr;
                if (i===0) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.closePath(); g.fillPath();
        }
    }

    drawPaperBodyStroke(g, shape, ox, oy, w, h) {
        const cx = ox+w/2;
        if (shape==='normal'){
            const hr=9;
            g.beginPath();
            for(let i=0;i<8;i++){const a=Math.PI*2*i/8-Math.PI/2,rr=i%2===0?hr:hr*0.75;const px=cx+Math.cos(a)*rr,py=oy+hr+Math.sin(a)*rr;i===0?g.moveTo(px,py):g.lineTo(px,py);}
            g.closePath();g.strokePath();
            g.strokeRect(cx-3,oy+17,6,4);
            g.beginPath();g.moveTo(cx-13,oy+21);g.lineTo(cx-15,oy+38);g.lineTo(cx-9,oy+50);g.lineTo(cx-4,oy+50);g.lineTo(cx-2,oy+38);g.lineTo(cx+2,oy+38);g.lineTo(cx+4,oy+50);g.lineTo(cx+9,oy+50);g.lineTo(cx+15,oy+38);g.lineTo(cx+13,oy+21);g.closePath();g.strokePath();
        } else if (shape==='slim'){
            g.beginPath();g.moveTo(cx,oy);g.lineTo(cx+w/2-2,oy+h*.15);g.lineTo(cx+w/2-1,oy+h*.85);g.lineTo(cx,oy+h);g.lineTo(cx-w/2+1,oy+h*.85);g.lineTo(cx-w/2+2,oy+h*.15);g.closePath();g.strokePath();
        } else if (shape==='wings'){
            g.strokeRect(cx-5,oy+h*.25,10,h*.5);
            g.beginPath();g.moveTo(cx-5,oy+h*.3);g.lineTo(ox,oy-h*.05);g.lineTo(ox+4,oy);g.lineTo(ox+6,oy+h*.1);for(let i=0;i<5;i++){const t=i/5;g.lineTo(ox+8-i*1.5,oy+h*(.2+t*.15));}g.lineTo(cx-3,oy+h*.9);g.closePath();g.strokePath();
            g.beginPath();g.moveTo(cx+5,oy+h*.3);g.lineTo(ox+w,oy-h*.05);g.lineTo(ox+w-4,oy);g.lineTo(ox+w-6,oy+h*.1);for(let i=0;i<5;i++){const t=i/5;g.lineTo(ox+w-8+i*1.5,oy+h*(.2+t*.15));}g.lineTo(cx+3,oy+h*.9);g.closePath();g.strokePath();
        } else if (shape==='hook'){
            g.strokeRect(cx-6,oy+18,12,h-18);
            g.beginPath();g.moveTo(cx-3,oy+18);g.lineTo(cx-3,oy+4);g.lineTo(cx-1,oy);g.lineTo(ox+w-4,oy);g.lineTo(ox+w,oy+4);g.lineTo(ox+w-2,oy+8);g.lineTo(ox+w-8,oy+8);g.lineTo(ox+w-10,oy+6);g.lineTo(cx-1,oy+4);g.lineTo(cx+1,oy+16);g.closePath();g.strokePath();
        } else if (shape==='gear'){
            const cx=ox+w/2,cy=oy+h/2,r=Math.min(w,h)/2-2;
            g.beginPath();for(let i=0;i<12;i++){const a=Math.PI*2*i/12-Math.PI/2,rr=i%2===0?r:r*.65;const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;i===0?g.moveTo(px,py):g.lineTo(px,py);}g.closePath();g.strokePath();
        }
    }

    // ---- 镂空花纹（万字纹、梅花、卷草） ----
    drawPaperHoles(g, shape, ox, oy, w, h) {
        const cx=ox+w/2,cy=oy+h/2;
        if (shape==='normal'){
            // 胸腹万字纹
            this.drawSwastika(g,cx-5,oy+30,2.5);
            this.drawSwastika(g,cx+5,oy+30,2.5);
            // 腿根卷草
            this.drawVine(g,cx-6,oy+44,5,1);
            this.drawVine(g,cx+6,oy+44,-5,1);
            // 眼睛
            g.fillRect(cx-4,oy+6,2.5,2.5);
            g.fillRect(cx+2,oy+6,2.5,2.5);
        } else if (shape==='slim'){
            for(let i=0;i<5;i++)this.drawSwastika(g,cx,oy+4+i*10,1.2);
        } else if (shape==='wings'){
            this.drawSwastika(g,cx-8,oy+14,1.5);
            this.drawSwastika(g,cx+8,oy+14,1.5);
            g.fillCircle(cx,oy+h*.45,2);
            for(let i=0;i<3;i++)g.fillRect(ox+6,oy+14+i*6,2,3);
            for(let i=0;i<3;i++)g.fillRect(ox+w-8,oy+14+i*6,2,3);
        } else if (shape==='hook'){
            this.drawSwastika(g,cx-3,oy+26,1.5);
            this.drawSwastika(g,cx+3,oy+36,1.5);
            g.fillCircle(cx,oy+8,1.5);
        } else if (shape==='gear'){
            g.fillCircle(cx,cy,4.5);
            for(let i=0;i<4;i++){
                const a=Math.PI*2*i/4+Math.PI/4;
                g.fillCircle(cx+Math.cos(a)*9,cy+Math.sin(a)*9,1.5);
            }
        }
    }

    // 万字纹（卍简化）
    drawSwastika(g,x,y,s){
        g.fillRect(x-s,y-s*0.5,s*2.5,s);
        g.fillRect(x+s*0.5,y-s*0.5,s,s*2);
        g.fillRect(x-s,y+s*0.5,s*2.5,s);
        g.fillRect(x-s*0.5,y-s,s,s*2);
    }

    // 卷草纹
    drawVine(g,x,y,len,dir){
        g.fillCircle(x,y,1.2);
        g.fillCircle(x+dir*3,y-2,1);
        g.fillCircle(x+dir*5,y,1.2);
    }

    // ---- 暗红装饰线 ----
    drawPaperDetails(g, shape, ox, oy, w, h) {
        const cx=ox+w/2;
        if (shape==='normal'){
            g.fillRect(cx-6,oy+3,12,0.8);
            g.fillRect(cx-0.5,oy+22,1,12);
            g.fillRect(cx-4,oy+21,8,0.7);
        } else if (shape==='slim'){
            g.fillRect(cx-0.5,oy+3,1,h-6);
            g.fillRect(ox+2,oy+h/2,w-4,0.7);
        } else if (shape==='wings'){
            g.fillRect(cx-0.5,oy+h*.3,1,h*.4);
            g.fillRect(cx-4,oy+h*.45,3,0.6);
            g.fillRect(cx+1,oy+h*.45,3,0.6);
        } else if (shape==='hook'){
            g.fillRect(cx-0.5,oy+22,1,12);
        }
    }

    generateUITextures() {
        // 浆糊图标：陶瓷罐 + 金盖 + 花纹
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(C.PAPER, 1);
        g.fillRoundedRect(3, 6, 16, 18, 4);
        g.fillStyle(C.WOOD_DARK, 1);
        g.fillRoundedRect(5, 2, 12, 6, 3);
        g.fillStyle(C.GOLD, 0.7);
        g.fillRoundedRect(6, 3, 10, 3, 2);
        g.lineStyle(1.5, C.GOLD, 0.7);
        g.strokeRoundedRect(3, 6, 16, 18, 4);
        // 罐身花纹
        g.lineStyle(0.8, C.GOLD_DIM, 0.5);
        g.lineBetween(6, 12, 16, 12);
        g.lineBetween(6, 15, 16, 15);
        g.generateTexture('paste_icon', 22, 26);
        g.destroy();

        // 锚点：团花星
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(C.GOLD, 0.85);
        g.beginPath();
        for (let i=0;i<8;i++){
            const a=Math.PI*2*i/8-Math.PI/2;
            const r=i%2===0?5:2;
            const px=5+Math.cos(a)*r,py=5+Math.sin(a)*r;
            i===0?g.moveTo(px,py):g.lineTo(px,py);
        }
        g.closePath();g.fillPath();
        g.lineStyle(1,C.PAPER,0.5);
        g.strokePath();
        g.generateTexture('anchor_point', 10, 10);
        g.destroy();

        // 出口标记：拱门+门环+红顶
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(C.PAPER, 0.9);
        g.fillRect(3, 14, 24, 36);
        // 拱形顶
        g.fillStyle(C.RED, 1);
        g.beginPath();
        g.arc(15,14,13,Math.PI,0);
        g.closePath();g.fillPath();
        g.lineStyle(1.5,C.GOLD,0.7);
        g.arc(15,14,13,Math.PI,0);g.strokePath();
        // 门框
        g.lineStyle(1.5,C.RED,0.8);
        g.strokeRect(3,14,24,36);
        // 门环
        g.fillStyle(C.GOLD,0.8);
        g.fillCircle(15,34,3);
        g.fillCircle(15,34,1.5);
        g.generateTexture('exit_marker', 30, 52);
        g.destroy();

        // 纸屑粒子：随机多边形
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(C.RED, 1);
        g.beginPath();
        g.moveTo(3,0);g.lineTo(7,2);g.lineTo(5,5);g.lineTo(1,4);g.lineTo(0,1);
        g.closePath();g.fillPath();
        g.generateTexture('particle', 8, 6);
        g.destroy();
    }

    generateObstacleTextures() {
        // 普通墙体
        let g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x4a2c17, 1);
        g.fillRect(0, 0, 32, 32);
        g.lineStyle(1, C.GOLD_DIM, 1);
        g.strokeRect(0, 0, 32, 32);
        // 砖纹
        g.lineStyle(1, 0x3d2010, 0.5);
        g.lineBetween(0, 16, 32, 16);
        g.lineBetween(16, 0, 16, 16);
        g.generateTexture('wall_tile', 32, 32);
        g.destroy();

        // 地面
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x3d2817, 1);
        g.fillRect(0, 0, 64, 32);
        g.lineStyle(1, 0x5a3d22, 1);
        g.strokeRect(0, 0, 64, 32);
        g.lineStyle(1, 0x2a1a0f, 0.4);
        g.lineBetween(0, 16, 64, 16);
        g.generateTexture('ground_tile', 64, 32);
        g.destroy();
    }
}

// ============================================================
//  SECTION 3: MenuScene — 标题画面
// ============================================================

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    init(data) {
        this.isVictory = data && data.victory;
    }

    create() {
        const cx = GAME_W / 2, cy = GAME_H / 2;

        // 背景：深纸色打底
        this.cameras.main.setBackgroundColor('#f5efe8');

        // ---- 多层剪纸背景 ----
        const bg = this.add.graphics();
        // 外层装饰框
        bg.fillStyle(C.RED_DEEP, 0.25);
        bg.fillRect(30, 30, GAME_W-60, GAME_H-60);
        bg.lineStyle(2, C.RED, 0.6);
        bg.strokeRect(30, 30, GAME_W-60, GAME_H-60);
        bg.lineStyle(1, C.GOLD, 0.35);
        bg.strokeRect(44, 44, GAME_W-88, GAME_H-88);
        // 四角团花
        this.drawCornerFlower(bg, 44, 44, 1, 1);
        this.drawCornerFlower(bg, GAME_W-44, 44, -1, 1);
        this.drawCornerFlower(bg, 44, GAME_H-44, 1, -1);
        this.drawCornerFlower(bg, GAME_W-44, GAME_H-44, -1, -1);
        // 边框回纹
        bg.lineStyle(1, C.RED_DARK, 0.25);
        for (let x = 80; x < GAME_W-80; x += 48) {
            bg.strokeRect(x, 38, 10, 5);
            bg.strokeRect(x+10, 38, 5, 10);
        }
        for (let x = 80; x < GAME_W-80; x += 48) {
            bg.strokeRect(x, GAME_H-43, 10, 5);
            bg.strokeRect(x+10, GAME_H-48, 5, 10);
        }

        // ---- 标题 ----
        this.add.text(cx, 155, '纸 境 迷 踪', {
            fontFamily: 'FangSong, STFangsong, KaiTi, STKaiti, serif',
            fontSize: '78px',
            color: '#fff8f0',
            stroke: '#8b0f0f',
            strokeThickness: 7
        }).setOrigin(0.5);
        bg.lineStyle(2, C.GOLD, 0.5);
        bg.lineBetween(cx-170, 195, cx+170, 195);

        // ---- 副标题 ----
        this.add.text(cx, 238, 'D A Z U  ·  大 足 剪 纸  ·  P A P E R  M A Z E', {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '16px', color: '#8b4a4a',
        }).setOrigin(0.5);

        // ---- 通关提示 ----
        if (this.isVictory) {
            const vt = this.add.text(cx, 290, '恭 喜 通 关', {
                fontFamily: 'FangSong, STFangsong, KaiTi, serif',
                fontSize: '28px',
                color: '#fff8f0',
                stroke: '#c41a1a',
                strokeThickness: 4
            }).setOrigin(0.5);
            this.tweens.add({ targets: vt, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });
        }

        // ---- 剪纸小人展示 ----
        this.add.image(cx, 360, 'player_normal').setScale(3.5);

        // ---- 操作提示（仿宋小字） ----
        const hints = [
            '← → 或 A D  移 动    ↑ 或 空 格  跳 跃',
            '在角色身上拖动鼠标 = 剪纸变形',
            '每剪一次损耗纸力，剪太多会碎…'
        ];
        hints.forEach((t, i) => {
            this.add.text(cx, 440 + i * 28, t, {
                fontFamily: 'FangSong, STFangsong, SimSun, serif',
                fontSize: '14px', color: '#6b5a4a'
            }).setOrigin(0.5);
        });

        // ---- 印章风按钮（直角、红底白字） ----
        const btnW = 200, btnH = 52;
        const btnX = cx - btnW / 2, btnY = 540;
        const btnBg = this.add.graphics();
        const drawBtn = (hover) => {
            btnBg.clear();
            btnBg.fillStyle(hover ? C.WOOD : C.WOOD_DARK, 1);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
            btnBg.lineStyle(1.5, C.WOOD_LIT, 0.6);
            btnBg.strokeRoundedRect(btnX+2,btnY+2,btnW-4,btnH-4, 12);
        };
        drawBtn(false);

        this.add.text(cx, btnY + btnH/2, '开  始  游  戏', {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '26px', color: '#fcf8f2'
        }).setOrigin(0.5);
        drawBtn(false);

        this.add.text(cx, btnY + btnH / 2, '开  始  游  戏', {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '27px',
            color: '#fff8f0'
        }).setOrigin(0.5);

        const btnZone = this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
        btnZone.on('pointerover', () => drawBtn(true));
        btnZone.on('pointerout', () => drawBtn(false));
        btnZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene', { roomIndex: 0 });
            });
        });

        // ---- 关卡选择 ----
        this.add.text(cx, 595, '— 选择关卡 —', {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '14px', color: '#8b6a52'
        }).setOrigin(0.5);

        const lvlStartX = cx - 220;
        const lvlY = 616;
        const lvlW = 82;
        const lvlH = 26;
        ROOMS.forEach((room, idx) => {
            const lx = lvlStartX + idx * (lvlW + 6);
            const lvlBg = this.add.graphics();
            lvlBg.fillStyle(C.WOOD_DARK, 0.7);
            lvlBg.fillRoundedRect(lx, lvlY, lvlW, lvlH, 8);
            lvlBg.lineStyle(1, C.WOOD_LIT, 0.5);
            lvlBg.strokeRoundedRect(lx, lvlY, lvlW, lvlH, 8);

            this.add.text(lx + lvlW/2, lvlY + lvlH/2, '第'+room.id+'关', {
                fontFamily: 'FangSong, STFangsong, SimSun, serif',
                fontSize: '13px', color: '#fcf8f2'
            }).setOrigin(0.5);

            const lvlZone = this.add.zone(lx + lvlW/2, lvlY + lvlH/2, lvlW, lvlH)
                .setInteractive({ useHandCursor: true });
            lvlZone.on('pointerover', () => {
                lvlBg.clear();
                lvlBg.fillStyle(C.WOOD, 1);
                lvlBg.fillRoundedRect(lx, lvlY, lvlW, lvlH, 8);
                lvlBg.lineStyle(1, C.WOOD_LIT, 0.7);
                lvlBg.strokeRoundedRect(lx, lvlY, lvlW, lvlH, 8);
            });
            lvlZone.on('pointerout', () => {
                lvlBg.clear();
                lvlBg.fillStyle(C.WOOD_DARK, 0.7);
                lvlBg.fillRoundedRect(lx, lvlY, lvlW, lvlH, 8);
                lvlBg.lineStyle(1, C.WOOD_LIT, 0.5);
                lvlBg.strokeRoundedRect(lx, lvlY, lvlW, lvlH, 8);
            });
            lvlZone.on('pointerdown', () => {
                this.cameras.main.fadeOut(400, 0, 0, 0);
                this.time.delayedCall(400, () => {
                    this.scene.start('GameScene', { roomIndex: idx });
                });
            });
        });

        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    drawCornerFlower(g, x, y, dx, dy) {
        // 多层弧形角花
        for (let i = 0; i < 4; i++) {
            g.lineStyle(1.2, i === 0 ? C.RED : C.GOLD, 0.3 + i * 0.05);
            const r = 8 + i * 11;
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI / 2, false);
            g.strokePath();
        }
        // 装饰小圆点沿弧
        g.fillStyle(C.GOLD, 0.3);
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI / 6) * (i + 1);
            const r = 24;
            g.fillCircle(x + Math.cos(a)*r*dx, y + Math.sin(a)*r*dy, 1.5);
        }
        // 中心菱形
        const mx = x + dx * 18, my = y + dy * 18;
        g.fillStyle(C.RED, 0.45);
        g.beginPath();
        g.moveTo(mx, my - 5*dy);
        g.lineTo(mx + 5*dx, my);
        g.lineTo(mx, my + 5*dy);
        g.lineTo(mx - 5*dx, my);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, C.GOLD, 0.4);
        g.strokePath();
    }
}

// ============================================================
//  SECTION 4: GameScene — 核心游戏逻辑
// ============================================================

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    init(data) {
        this.roomIndex = data.roomIndex || 0;
    }

    create() {
        const room = ROOMS[this.roomIndex];

        // --- 背景 ---
        this.cameras.main.setBackgroundColor(room.bgColor);
        this.drawPaperBackground();

        // --- 物理组 ---
        this.platforms = this.physics.add.staticGroup();
        this.pasteGroup = this.physics.add.staticGroup();
        this.exitZone = null;

        // --- 玩家状态 ---
        this.currentShape = 'normal';
        this.health = 100;
        this.cutsUsed = 0;
        this.maxCuts = room.maxCuts;
        this.isCutting = false;
        this.cutStartAnchor = -1;
        this.cutEndAnchor = -1;
        this.cutStartPos = null;
        this.isDead = false;

        // --- 图形层 ---
        this.bgGraphics = this.add.graphics();
        this.cutGraphics = this.add.graphics();
        this.anchorGraphics = this.add.graphics();
        this.cutGraphics.setDepth(10);
        this.anchorGraphics.setDepth(9);

        // --- 锚点精灵 ---
        this.anchorSprites = [];

        // --- 创建玩家 ---
        this.createPlayer(room.playerSpawn);

        // --- 创建锚点 ---
        this.createAnchorPoints();

        // --- 加载房间 ---
        this.buildRoom(room);

        // --- 浆糊道具 ---
        room.pasteItems.forEach(p => {
            const paste = this.physics.add.staticImage(p.x, p.y, 'paste_icon');
            paste.setData('collected', false);
            paste.setDepth(3);
            this.pasteGroup.add(paste);
            // 浮动动画
            this.tweens.add({
                targets: paste, y: p.y - 6,
                duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });

        // --- 碰撞 ---
        this.physics.add.collider(this.player, this.platforms);

        // --- 出口 ---
        this.createExit(room.exit);

        // --- 输入 ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyR = this.input.keyboard.addKey('R');
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.setupCuttingInput();

        // --- 提示文字 ---
        this.showHint(room.hint);

        // --- UI ---
        this.scene.launch('UIScene', { gameScene: this });

        // --- 入场 ---
        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    // ==================== 背景 ====================

    drawPaperBackground() {
        // ---- 第1层：远景大足水印（更淡更细腻） ----
        const farBg = this.add.graphics();
        farBg.setDepth(-3);
        this.drawOxSilhouette(farBg, 680, 530, 0.55);
        this.drawChickenSilhouette(farBg, 180, 540, 0.4);
        this.drawPagodaSilhouette(farBg, 780, 510, 0.35);
        this.drawCloudPattern(farBg, 300, 350, 180, 0.08);
        this.drawCloudPattern(farBg, 650, 300, 140, 0.06);

        // ---- 第2层：中景多层山 ----
        const midBg = this.add.graphics();
        midBg.setDepth(-2);
        // 远山
        midBg.fillStyle(C.RED_DARK, 0.2);
        this.drawCutMountain(midBg, 60, 560, 200, 250);
        this.drawCutMountain(midBg, 480, 540, 280, 300);
        this.drawCutMountain(midBg, 830, 560, 170, 230);
        // 中山
        midBg.fillStyle(C.RED_DARK, 0.35);
        this.drawCutMountain(midBg, 230, 570, 170, 190);
        this.drawCutMountain(midBg, 660, 550, 190, 240);
        // 近山
        midBg.fillStyle(C.RED_DEEP, 0.45);
        this.drawCutMountain(midBg, 400, 580, 150, 140);
        // 山间祥云
        midBg.fillStyle(C.PAPER, 0.08);
        this.drawCloudPattern(midBg, 380, 470, 120, 0.15);

        // ---- 第3层：装饰边框 (更精致的传统纹样) ----
        const fg = this.add.graphics();
        fg.setDepth(-1);
        this.drawOrnateFrame(fg);

        // ---- 第4层：纸纤维纹理（极细噪点） ----
        const tex = this.add.graphics();
        tex.setDepth(-0.5);
        tex.lineStyle(0.5, C.PAPER_SHADOW, 0.04);
        for (let y = 0; y < GAME_H; y += 5) {
            tex.lineBetween(0, y + Phaser.Math.Between(-1, 1), GAME_W, y + Phaser.Math.Between(-1, 1));
        }
        for (let x = 0; x < GAME_W; x += 40) {
            tex.lineBetween(x + Phaser.Math.Between(-1, 0), 0, x + Phaser.Math.Between(-1, 1), GAME_H);
        }
        // 细小纤维点
        tex.fillStyle(C.PAPER_SHADOW, 0.03);
        for (let i = 0; i < 60; i++) {
            tex.fillCircle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), Phaser.Math.Between(1, 3));
        }
        // 横纹水印带
        tex.fillStyle(C.PAPER, 0.04);
        tex.fillRect(0, GAME_H*0.25, GAME_W, Phaser.Math.Between(6, 14));
        tex.fillRect(0, GAME_H*0.65, GAME_W, Phaser.Math.Between(6, 14));
    }

    // ---- 水印图形 ----
    drawOxSilhouette(g, x, y, scale) {
        const s = scale;
        g.fillStyle(C.PAPER_AGED, 0.12);
        g.fillRect(x, y - 22*s, 50*s, 26*s);
        g.fillRect(x + 42*s, y - 36*s, 22*s, 18*s);
        g.beginPath();
        g.moveTo(x + 52*s, y - 36*s);
        g.lineTo(x + 48*s, y - 50*s);
        g.lineTo(x + 58*s, y - 38*s);
        g.closePath(); g.fillPath();
        g.fillRect(x + 6*s, y + 4*s, 5*s, 16*s);
        g.fillRect(x + 16*s, y + 4*s, 5*s, 16*s);
        g.fillRect(x + 30*s, y + 4*s, 5*s, 16*s);
        g.fillRect(x + 40*s, y + 4*s, 5*s, 16*s);
        g.lineStyle(1.5*s, C.PAPER_AGED, 0.2);
        g.beginPath(); g.moveTo(x, y - 18*s); g.lineTo(x - 8*s, y - 30*s); g.strokePath();
    }
    drawChickenSilhouette(g, x, y, scale) {
        const s = scale;
        g.fillStyle(C.PAPER_AGED, 0.1);
        g.fillRect(x, y - 12*s, 16*s, 14*s);
        g.fillRect(x + 10*s, y - 22*s, 10*s, 11*s);
        g.fillRect(x + 8*s, y - 28*s, 8*s, 5*s);
        g.fillRect(x + 18*s, y - 18*s, 7*s, 2*s);
        g.fillRect(x + 2*s, y + 2*s, 2*s, 10*s);
        g.fillRect(x + 10*s, y + 2*s, 2*s, 10*s);
    }
    drawPagodaSilhouette(g, x, y, scale) {
        const s = scale;
        g.fillStyle(C.PAPER_AGED, 0.15);
        for (let i = 0; i < 4; i++) {
            const bw = 40*s - i*8*s;
            g.fillRect(x - bw/2 + 20*s, y - i*22*s, bw, 14*s);
        }
        g.fillRect(x + 12*s, y - 88*s, 16*s, 10*s);
    }
    drawCloudPattern(g, cx, baseY, w, alpha) {
        g.fillStyle(C.PAPER, alpha);
        const h = w * 0.35;
        for (let i = 0; i < 5; i++) {
            const rx = cx - w/2 + (w/5)*i + w/10;
            g.fillCircle(rx, baseY, w/10);
            g.fillCircle(rx + w/20, baseY - h/2, w/14);
            g.fillCircle(rx + w/10, baseY, w/12);
        }
    }

    // ---- 剪纸山形（更精细的锯齿） ----
    drawCutMountain(g, cx, baseY, w, h) {
        g.beginPath();
        g.moveTo(cx - w/2, baseY);
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            g.lineTo(cx - w/2 + w*t, baseY - h*(0.25 + 0.75*Math.sin(t*Math.PI)));
        }
        g.lineTo(cx, baseY - h);
        for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            g.lineTo(cx + w/2*t, baseY - h*(0.25 + 0.75*Math.sin((1-t/2)*Math.PI)));
        }
        g.lineTo(cx + w/2, baseY);
        g.closePath(); g.fillPath();
        // 内部镂空纹
        g.lineStyle(1, C.PAPER, 0.12);
        for (let i = 1; i <= 3; i++) {
            const ly = baseY - h/4*i;
            g.lineBetween(cx - w*0.18, ly, cx + w*0.18, ly);
        }
    }

    // ---- 精致装饰边框 ----
    drawOrnateFrame(g) {
        const m = 22;
        // 外框
        g.lineStyle(2, C.RED, 0.5);
        g.strokeRect(m, m, GAME_W - m*2, GAME_H - m*2);
        // 内框
        g.lineStyle(1, C.GOLD, 0.3);
        g.strokeRect(m + 6, m + 6, GAME_W - (m+6)*2, GAME_H - (m+6)*2);

        // 四角——传统团花纹
        const corners = [
            { x: m + 10, y: m + 10, dx: 1, dy: 1 },
            { x: GAME_W - m - 10, y: m + 10, dx: -1, dy: 1 },
            { x: m + 10, y: GAME_H - m - 10, dx: 1, dy: -1 },
            { x: GAME_W - m - 10, y: GAME_H - m - 10, dx: -1, dy: -1 }
        ];
        corners.forEach(c => {
            g.fillStyle(C.RED, 0.4);
            g.lineStyle(1, C.GOLD, 0.35);
            // 三层弧形角花
            for (let i = 0; i < 4; i++) {
                const r = 8 + i*10;
                g.beginPath();
                const sa = c.dx > 0 ? 0 : Math.PI;
                g.arc(c.x, c.y, r, sa, sa + Math.PI/2, false);
                g.strokePath();
            }
            // 中心菱形
            const mx = c.x + c.dx*18, my = c.y + c.dy*18;
            g.beginPath();
            g.moveTo(mx, my - 5*c.dy);
            g.lineTo(mx + 5*c.dx, my);
            g.lineTo(mx, my + 5*c.dy);
            g.lineTo(mx - 5*c.dx, my);
            g.closePath(); g.fillPath(); g.strokePath();
        });

        // 上下边框——回纹/万字纹
        g.lineStyle(1, C.RED_DARK, 0.3);
        const drawFret = (y, dir) => {
            for (let x = 100; x < GAME_W - 80; x += 56) {
                const s = 5;
                g.strokeRect(x, y, s*3, s);
                g.strokeRect(x + s*3, y, s, s*2);
                g.strokeRect(x + s*4, y + s, s*3, s);
                // 小装饰点
                g.fillStyle(C.GOLD, 0.25);
                g.fillCircle(x + s*1.5, y + s*0.5, 1);
                g.fillCircle(x + s*5.5, y + s*1.5, 1);
            }
        };
        drawFret(m - 2, 1);
        drawFret(GAME_H - m - 8, 1);
    }

    // ==================== 玩家 ====================

    createPlayer(spawn) {
        this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player_normal');
        this.player.setOrigin(0.5, 0.5);
        this.player.setCollideWorldBounds(false);
        this.player.setDepth(5);
        const nd = SHAPE_DEFS['normal'];
        this.player.body.setSize(nd.w, nd.h);
        this.player.body.setOffset(4, 4); // pad=4 居中
    }

    // ==================== 锚点 ====================

    createAnchorPoints() {
        for (let i = 0; i < ANCHOR_OFFSETS.length; i++) {
            const dot = this.add.image(0, 0, 'anchor_point');
            dot.setDepth(8);
            dot.setAlpha(0.4);
            dot.setVisible(true);
            this.anchorSprites.push(dot);
        }
    }

    updateAnchorPositions() {
        if (!this.player || !this.player.active) return;
        for (let i = 0; i < ANCHOR_OFFSETS.length; i++) {
            const off = ANCHOR_OFFSETS[i];
            this.anchorSprites[i].setPosition(
                this.player.x + off.x,
                this.player.y + off.y
            );
        }
    }

    getAnchorWorldPos(index) {
        const off = ANCHOR_OFFSETS[index];
        return { x: this.player.x + off.x, y: this.player.y + off.y };
    }

    // ==================== 房间构建 ====================

    buildRoom(room) {
        room.platforms.forEach(p => {
            // 用 Zone 做物理碰撞体（不可见）
            const zone = this.add.zone(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h);
            this.physics.add.existing(zone, true);
            this.platforms.add(zone);

            const pg = this.add.graphics();
            pg.setDepth(1);
            const isNarrow = p.w <= 30; // 挂钩点/机关墙
            const isThin = p.h <= 25;   // 薄平台（高台）

            if (isNarrow) {
                // 挂钩点/机关墙：深红配金边
                pg.fillStyle(C.RED_DEEP, 0.9);
                pg.fillRect(p.x, p.y, p.w, p.h);
                pg.lineStyle(1.5, C.GOLD, 0.7);
                pg.strokeRect(p.x, p.y, p.w, p.h);
                // 齿轮齿纹装饰
                pg.fillStyle(C.GOLD, 0.4);
                for (let gy = p.y + 6; gy < p.y + p.h - 4; gy += 10) {
                    pg.fillRect(p.x + 2, gy, p.w - 4, 3);
                }
            } else {
                // 普通平台：暖褐底色 + 纸白顶线
                pg.fillStyle(C.BROWN, 1);
                pg.fillRect(p.x, p.y, p.w, p.h);
                // 顶面：纸白切边（模拟剪纸断面）
                pg.fillStyle(C.PAPER, 0.5);
                pg.fillRect(p.x, p.y, p.w, 3);
                // 金边
                pg.lineStyle(1, C.GOLD_DIM, 0.5);
                pg.strokeRect(p.x, p.y, p.w, p.h);
                // 内部回纹装饰
                pg.lineStyle(1, C.BROWN_LIT, 0.3);
                for (let lx = p.x + 20; lx < p.x + p.w - 10; lx += 40) {
                    pg.lineBetween(lx, p.y + 6, lx + 10, p.y + 6);
                    pg.lineBetween(lx + 10, p.y + 6, lx + 10, p.y + 14);
                }
            }

            zone.setData('platDef', p);
            zone.setData('graphics', pg);
        });
    }

    createExit(exitDef) {
        // 出口可视化：纸白发光门
        const eg = this.add.graphics();
        eg.setDepth(2);
        eg.fillStyle(C.PAPER, 0.25);
        eg.fillRect(exitDef.x, exitDef.y, exitDef.w, exitDef.h);
        eg.lineStyle(2, C.RED, 0.6);
        eg.strokeRect(exitDef.x, exitDef.y, exitDef.w, exitDef.h);
        // 内框
        eg.lineStyle(1, C.GOLD, 0.3);
        eg.strokeRect(exitDef.x + 4, exitDef.y + 4, exitDef.w - 8, exitDef.h - 8);

        this.add.image(exitDef.x + exitDef.w / 2, exitDef.y - 6, 'exit_marker')
            .setDepth(3);

        this.exitZone = this.add.zone(
            exitDef.x + exitDef.w / 2,
            exitDef.y + exitDef.h / 2,
            exitDef.w, exitDef.h
        );
        this.physics.add.existing(this.exitZone, true);

        this.tweens.add({
            targets: eg,
            alpha: { from: 0.25, to: 0.7 },
            duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    // ==================== 切割输入 ====================

    setupCuttingInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.isDead) return;
            if (this.cutsUsed >= this.maxCuts) {
                this.showMessage('切割次数已用完！', '#ff4444');
                return;
            }
            // 检查是否在玩家附近
            const dist = Phaser.Math.Distance.Between(
                pointer.x, pointer.y,
                this.player.x, this.player.y
            );
            if (dist < 60) {
                this.startCut(pointer);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isCutting) {
                this.updateCut(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.isCutting) {
                this.endCut(pointer);
            }
        });

        // 右键取消
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown() && this.isCutting) {
                this.cancelCut();
            }
        });
    }

    startCut(pointer) {
        this.isCutting = true;

        // 找最近的锚点
        let minDist = 40;
        let nearest = -1;
        for (let i = 0; i < ANCHOR_OFFSETS.length; i++) {
            const pos = this.getAnchorWorldPos(i);
            const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, pos.x, pos.y);
            if (d < minDist) {
                minDist = d;
                nearest = i;
            }
        }

        this.cutStartAnchor = nearest;
        if (nearest >= 0) {
            this.cutStartPos = this.getAnchorWorldPos(nearest);
            // 高亮开始锚点
            this.anchorSprites[nearest].setAlpha(1);
            this.anchorSprites[nearest].setScale(1.6);
        } else {
            this.cutStartPos = { x: pointer.x, y: pointer.y };
        }

        // 高亮所有锚点
        this.anchorSprites.forEach(s => s.setAlpha(0.7));
    }

    updateCut(pointer) {
        this.cutGraphics.clear();

        // 找最近的锚点用于吸附
        let minDist = 30;
        let nearest = -1;
        for (let i = 0; i < ANCHOR_OFFSETS.length; i++) {
            if (i === this.cutStartAnchor) continue;
            const pos = this.getAnchorWorldPos(i);
            const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, pos.x, pos.y);
            if (d < minDist) {
                minDist = d;
                nearest = i;
            }
        }

        // 端点：吸附或自由位置
        const endX = nearest >= 0 ? this.getAnchorWorldPos(nearest).x : pointer.x;
        const endY = nearest >= 0 ? this.getAnchorWorldPos(nearest).y : pointer.y;

        // 高亮候选锚点
        this.anchorSprites.forEach((s, i) => {
            if (i === this.cutStartAnchor) return;
            s.setAlpha(i === nearest ? 1 : 0.5);
            s.setScale(i === nearest ? 1.5 : 1);
        });

        // ---- 剪纸切割线效果 ----
        const sx = this.cutStartPos.x, sy = this.cutStartPos.y;
        // 1. 外层白色切痕（模拟剪刀切开的纸纤维断面）
        this.cutGraphics.lineStyle(6, C.PAPER, 0.7);
        this.cutGraphics.lineBetween(sx, sy, endX, endY);
        // 2. 金边
        this.cutGraphics.lineStyle(3, C.GOLD, 0.7);
        this.cutGraphics.lineBetween(sx, sy, endX, endY);
        // 3. 红色切缝（核心切割线）
        this.cutGraphics.lineStyle(1.5, C.RED_DARK, 0.9);
        this.cutGraphics.lineBetween(sx, sy, endX, endY);
        // 4. 细微裂纹（切割线两侧的小短线）
        this.cutGraphics.lineStyle(1, C.PAPER, 0.35);
        const dx = endX - sx, dy = endY - sy;
        for (let t = 0.15; t < 0.9; t += 0.15) {
            const px = sx + dx * t, py = sy + dy * t;
            const nx = -dy * 0.04, ny = dx * 0.04; // 法线方向
            this.cutGraphics.lineBetween(px + nx, py + ny, px + nx * 2.5, py + ny * 2.5);
            this.cutGraphics.lineBetween(px - nx, py - ny, px - nx * 2.5, py - ny * 2.5);
        }
        // 5. 端点剪刀标记
        this.cutGraphics.fillStyle(C.PAPER, 0.9);
        this.cutGraphics.fillCircle(endX, endY, 4);
        this.cutGraphics.lineStyle(1, C.RED, 0.8);
        this.cutGraphics.strokeCircle(endX, endY, 4);

        this.cutEndAnchor = nearest;
    }

    endCut(pointer) {
        this.isCutting = false;
        this.cutGraphics.clear();
        this.anchorSprites.forEach(s => { s.setAlpha(0.4); s.setScale(1); });

        // 验证切割
        if (this.cutStartAnchor < 0 || this.cutEndAnchor < 0) {
            this.showMessage('无效切割 — 请连接锚点', '#ff8888');
            return;
        }

        const a = Math.min(this.cutStartAnchor, this.cutEndAnchor);
        const b = Math.max(this.cutStartAnchor, this.cutEndAnchor);
        if (a === b) {
            this.showMessage('无效切割 — 起点终点相同', '#ff8888');
            return;
        }

        // 匹配形状
        const match = this.matchShape(a, b);
        if (match) {
            this.applyCut(match);
        } else {
            this.showMessage('无效切割 — 未匹配到形状', '#ff8888');
        }
    }

    cancelCut() {
        this.isCutting = false;
        this.cutGraphics.clear();
        this.anchorSprites.forEach(s => { s.setAlpha(0.4); s.setScale(1); });
        this.showMessage('已取消', '#aaaaaa');
    }

    // ==================== 形状匹配 ====================

    matchShape(a, b) {
        for (const pat of CUT_PATTERNS) {
            const [p0, p1] = pat.anchors;
            if ((a === p0 && b === p1) || (a === p1 && b === p0)) {
                return pat;
            }
        }
        return null;
    }

    // ==================== 执行切割 ====================

    applyCut(match) {
        if (this.cutsUsed >= this.maxCuts) return;
        if (this.isDead) return;

        this.cutsUsed++;

        // 纸屑粒子
        this.spawnPaperParticles();

        // 扣血
        this.health = Math.max(0, this.health - DAMAGE_PER_CUT);

        // 切换形状
        this.currentShape = match.shape;
        const def = SHAPE_DEFS[match.shape];
        // 记住切之前的脚底位置
        const feetY = this.player.body.bottom;
        this.player.setTexture('player_' + match.shape);
        this.player.body.setSize(def.w, def.h);
        const texW = def.w + 8, texH = def.h + 8;
        this.player.body.setOffset(
            (texW - def.w) / 2,
            (texH - def.h) / 2
        );
        // 修正脚底位置——身体变高时保持脚不离地
        if (this.player.body.blocked.down || this.player.body.touching.down || feetY > 500) {
            this.player.y = feetY - this.player.body.halfHeight - this.player.body.offset.y;
            this.player.body.updateBounds();
        }

        this.updateAnchorPositions();

        // 切割闪光（暖金色）
        this.player.setTint(0xffe8c0);
        this.time.delayedCall(80, () => {
            if (this.player.active) this.player.clearTint();
            this.time.delayedCall(60, () => {
                if (this.player.active) { this.player.setTint(0xffe8c0); }
                this.time.delayedCall(80, () => {
                    if (this.player.active) this.player.clearTint();
                });
            });
        });

        // 切换动画
        this.tweens.add({
            targets: this.player,
            scaleX: 0.8, scaleY: 1.2,
            duration: 80, yoyo: true,
            onComplete: () => { if (this.player.active) this.player.setScale(1); }
        });

        // 消息
        this.showMessage('✂ ' + match.desc + '！', '#d4a843');

        // 更新 UI
        this.events.emit('cutApplied', {
            shape: match.shape,
            cutsUsed: this.cutsUsed,
            maxCuts: this.maxCuts,
            health: this.health
        });

        // 检查死亡
        if (this.health <= 0) {
            this.time.delayedCall(500, () => this.playerDeath('剪纸碎裂成纸屑…'));
        }
    }

    // ==================== 粒子效果 ====================

    spawnPaperParticles() {
        const colors = [C.RED, C.RED_DARK, C.PAPER, C.GOLD, C.WOOD, C.PAPER_SHADOW];
        for (let i = 0; i < 28; i++) {
            const px = this.player.x + (Math.random() - 0.5) * 48;
            const py = this.player.y + (Math.random() - 0.5) * 56;
            const p = this.add.image(px, py, 'particle');
            p.setDepth(11);
            p.setTint(colors[Math.floor(Math.random() * colors.length)]);
            p.setAlpha(0.85 + Math.random() * 0.15);
            p.setScale(0.8 + Math.random() * 2.5);
            p.setAngle(Math.random() * 360);
            this.tweens.add({
                targets: p,
                x: px + (Math.random() - 0.5) * 160,
                y: py + (Math.random() - 0.5) * 160 - 50,
                alpha: 0,
                angle: p.angle + Math.random() * 720 - 360,
                scaleX: 0.05 + Math.random() * 0.25,
                scaleY: 0.05 + Math.random() * 0.25,
                duration: 350 + Math.random() * 600,
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy()
            });
        }
        // 额外金色闪光粒子
        for (let i = 0; i < 5; i++) {
            const gx = this.player.x + (Math.random() - 0.5) * 30;
            const gy = this.player.y + (Math.random() - 0.5) * 40;
            const gp = this.add.image(gx, gy, 'particle');
            gp.setDepth(12);
            gp.setTint(C.GOLD);
            gp.setAlpha(1);
            gp.setScale(1.5);
            this.tweens.add({
                targets: gp,
                alpha: 0, scale: 0.1,
                duration: 250 + Math.random() * 200,
                onComplete: () => gp.destroy()
            });
        }
    }

    // ==================== 玩家死亡 ====================

    playerDeath(msg) {
        if (this.isDead) return;
        this.isDead = true;

        // 碎裂粒子
        for (let i = 0; i < 25; i++) {
            const px = this.player.x + (Math.random() - 0.5) * 50;
            const py = this.player.y + (Math.random() - 0.5) * 56;
            const frag = this.add.image(px, py, 'particle');
            frag.setDepth(11);
            frag.setTint(C.RED);
            frag.setScale(2 + Math.random() * 3);
            this.tweens.add({
                targets: frag,
                x: px + (Math.random() - 0.5) * 200,
                y: py + (Math.random() - 0.5) * 200 - 50,
                alpha: 0, angle: Math.random() * 720, scale: 0.1,
                duration: 800 + Math.random() * 600,
                onComplete: () => frag.destroy()
            });
        }
        this.player.setVisible(false);
        this.player.body.enable = false;

        // 弹窗
        this.time.delayedCall(400, () => this.showDeathOverlay(msg || '你碎了…'));
    }

    showDeathOverlay(msg) {
        const cx = GAME_W / 2, cy = GAME_H / 2;

        // 半透明遮罩
        const mask = this.add.graphics();
        mask.setDepth(90);
        mask.fillStyle(0x000000, 0.55);
        mask.fillRect(0, 0, GAME_W, GAME_H);

        // 弹窗面板（暖木玻璃风）
        const pw = 360, ph = 220;
        const px = cx - pw/2, py = cy - ph/2;
        const panel = this.add.graphics();
        panel.setDepth(91);
        panel.fillStyle(0xfcf8f2, 0.92);
        panel.fillRoundedRect(px, py, pw, ph, 20);
        panel.lineStyle(1.5, C.WOOD, 0.5);
        panel.strokeRoundedRect(px, py, pw, ph, 20);

        // 标题
        const title = this.add.text(cx, py + 40, '游 戏 失 败', {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '30px', color: '#4a3528'
        }).setOrigin(0.5).setDepth(92);

        this.add.text(cx, py + 78, msg, {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '15px', color: '#8b6a52'
        }).setOrigin(0.5).setDepth(92);

        // 重新开始按钮
        const btnW = 140, btnH = 40;
        const btn1X = cx - btnW - 10, btnY = py + 135;
        this._makeDeathButton(btn1X, btnY, btnW, btnH, '重 新 挑 战', () => {
            this.scene.stop('UIScene');
            this.scene.restart({ roomIndex: this.roomIndex });
        });

        // 回到主页按钮
        const btn2X = cx + 10;
        this._makeDeathButton(btn2X, btnY, btnW, btnH, '回 到 主 页', () => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });

        // R 键也可重试
        this._deathKeyHandler = this.input.keyboard.on('keydown-R', () => {
            this.scene.stop('UIScene');
            this.scene.restart({ roomIndex: this.roomIndex });
        });
    }

    _makeDeathButton(x, y, w, h, text, callback) {
        const bg = this.add.graphics();
        bg.setDepth(92);
        const draw = (hover) => {
            bg.clear();
            bg.fillStyle(hover ? C.WOOD : C.WOOD_DARK, 1);
            bg.fillRoundedRect(x, y, w, h, 12);
            bg.lineStyle(1.5, C.WOOD_LIT, 0.6);
            bg.strokeRoundedRect(x+2, y+2, w-4, h-4, 10);
        };
        draw(false);

        this.add.text(x + w/2, y + h/2, text, {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '18px', color: '#fcf8f2'
        }).setOrigin(0.5).setDepth(93);

        const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true }).setDepth(94);
        zone.on('pointerover', () => draw(true));
        zone.on('pointerout', () => draw(false));
        zone.on('pointerdown', callback);
    }

    resetRoom() {
        this.scene.restart({ roomIndex: this.roomIndex });
    }

    // ==================== 消息系统 ====================

    showMessage(text, color) {
        const msg = this.add.text(GAME_W / 2, GAME_H / 2 - 80, text, {
            fontFamily: 'KaiTi, STKaiti, serif',
            fontSize: '22px',
            color: color || '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(50);

        this.tweens.add({
            targets: msg,
            y: msg.y - 40,
            alpha: 0,
            duration: 1500,
            onComplete: () => msg.destroy()
        });
    }

    showHint(text) {
        const hint = this.add.text(GAME_W / 2, 30, text, {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '13px',
            color: '#fff8f0',
            stroke: '#8b0f0f',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(50).setAlpha(0.9);

        this.tweens.add({
            targets: hint,
            alpha: 0,
            delay: 5000,
            duration: 1000,
            onComplete: () => hint.destroy()
        });
    }

    // ==================== 每帧更新 ====================

    update(time, delta) {
        if (this.isDead) return;

        // ESC 返回菜单
        if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
            return;
        }

        // 掉坑检测
        if (this.player.y > 700) {
            this.playerDeath('纸片飘落深渊…');
            return;
        }

        this.handleMovement();
        this.handleShapeBehaviors();
        this.updateAnchorPositions();
        this.checkPasteCollection();
        this.checkExit();
        this.applyDamagePenalties();
    }

    // ==================== 移动 ====================

    handleMovement() {
        const def = SHAPE_DEFS[this.currentShape];
        const speed = 200 * def.speedMul;
        const onGround = this.player.body.blocked.down || this.player.body.touching.down;

        // 移动端虚拟按键
        const uiScene = this.scene.get('UIScene');
        const mobL = uiScene && uiScene.mobileLeft;
        const mobR = uiScene && uiScene.mobileRight;
        const mobJ = uiScene && uiScene.mobileJump;

        // 左右移动
        if (this.cursors.left.isDown || this.keyA.isDown || mobL) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown || this.keyD.isDown || mobR) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        const wantUp = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown || mobJ;
        const justUp = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                       Phaser.Input.Keyboard.JustDown(this.keyW) ||
                       Phaser.Input.Keyboard.JustDown(this.keySpace) ||
                       mobJ;
        const tryUp = wantUp || justUp;

        // 钩爪优先：钩子形态按↑先尝试钩取
        let didGrapple = false;
        if (def.canGrapple && tryUp) {
            didGrapple = this.performGrapple();
        }

        // 跳跃：没钩到 且 有跳跃能力 且 在地上
        if (!didGrapple && def.jump !== 0 && onGround && tryUp) {
            this.player.setVelocityY(def.jump);
        }
    }

    // ==================== 钩爪 ====================

    performGrapple() {
        // 500ms 冷却防止连发
        const now = this.time.now;
        if (this._lastGrapple && now - this._lastGrapple < 500) return false;
        this._lastGrapple = now;

        const hookPoint = this.findNearestGrapplePoint();
        if (hookPoint && Phaser.Math.Distance.Between(
            this.player.x, this.player.y, hookPoint.x, hookPoint.y
        ) < 350) {
            const dx = hookPoint.x - this.player.x;
            const dy = hookPoint.y - this.player.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const speed = 550;
            this.player.setVelocityX(0);
            this.player.setVelocityY(-speed);
            this.showMessage('钩住！', '#d4a843');

            const line = this.add.graphics();
            line.setDepth(4);
            line.lineStyle(2, C.GOLD, 0.8);
            line.lineBetween(this.player.x, this.player.y, hookPoint.x, hookPoint.y);
            this.time.delayedCall(300, () => line.destroy());
            return true;
        }
        return false;
    }

    findNearestGrapplePoint() {
        const room = ROOMS[this.roomIndex];
        let nearest = null;
        let minDist = 350;
        room.platforms.forEach(p => {
            if (p.w <= 30 && p.h <= 30 && p.y < this.player.y) {
                const cx = p.x + p.w / 2;
                const cy = p.y + p.h / 2;
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy);
                if (d < minDist) {
                    minDist = d;
                    nearest = { x: cx, y: cy };
                }
            }
        });
        return nearest;
    }

    // ==================== 形状特殊行为 ====================

    handleShapeBehaviors() {
        const def = SHAPE_DEFS[this.currentShape];

        // 滑翔：大幅降低重力 + 限速
        if (def.canGlide && this.player.body.velocity.y > 5) {
            this.player.body.gravity.y = 150; // 适中重力，不会飞太远
            this.player.body.velocity.y = Math.min(this.player.body.velocity.y, 160);
            if (this.cursors.right.isDown || this.keyD.isDown) {
                this.player.body.velocity.x = Math.max(this.player.body.velocity.x, 220);
            }
            if (this.cursors.left.isDown || this.keyA.isDown) {
                this.player.body.velocity.x = Math.min(this.player.body.velocity.x, -220);
            }
        } else if (!def.canGlide) {
            this.player.body.gravity.y = 900; // 恢复正常重力
        }

        // 齿轮互动：靠近机关墙时自动触发
        if (def.canInteract) {
            this.checkGearInteract();
        }
    }

    checkGearInteract() {
        const room = ROOMS[this.roomIndex];
        // 查找机关墙（窄墙）
        const zonesToRemove = [];
        this.platforms.children.entries.forEach(zone => {
            const p = zone.getData('platDef');
            if (!p || p._gearActivated) return;
            if (p.w <= 40 && p.w >= 20) {
                const pcx = p.x + p.w / 2;
                const pcy = p.y + p.h / 2;
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, pcx, pcy);
                if (d < 60) {
                    p._gearActivated = true;
                    // 机关墙震动后消失
                    this.cameras.main.shake(200, 0.005);
                    this.showMessage('⚙ 齿轮转动！机关开启！', '#d4a843');
                    zonesToRemove.push({ zone, p });
                }
            }
        });

        // 移除机关墙
        zonesToRemove.forEach(({ zone, p }) => {
            const gfx = zone.getData('graphics');
            if (gfx) {
                this.tweens.add({
                    targets: gfx, alpha: 0, duration: 500,
                    onComplete: () => gfx.destroy()
                });
            }
            // 房间背景色覆盖
            const cover = this.add.graphics();
            cover.fillStyle(room.bgColor, 1);
            cover.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
            cover.setDepth(0);

            zone.body.enable = false;
            this.time.delayedCall(100, () => zone.destroy());
        });
    }

    // ==================== 浆糊收集 ====================

    checkPasteCollection() {
        this.pasteGroup.children.entries.forEach(paste => {
            if (paste.getData('collected')) return;
            const d = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                paste.x, paste.y
            );
            if (d < 35) {
                paste.setData('collected', true);
                this.health = Math.min(100, this.health + PASTE_HEAL);
                paste.setVisible(false);
                paste.body.enable = false;

                this.showMessage('🧴 收集浆糊！+' + PASTE_HEAL + '%', '#88ff88');

                this.events.emit('pasteCollected', {
                    health: this.health
                });

                // 收集动画
                const fx = this.add.image(paste.x, paste.y, 'paste_icon');
                fx.setDepth(15);
                this.tweens.add({
                    targets: fx,
                    y: fx.y - 30, alpha: 0, scale: 2,
                    duration: 400,
                    onComplete: () => fx.destroy()
                });
            }
        });
    }

    // ==================== 损伤惩罚 ====================

    applyDamagePenalties() {
        const def = SHAPE_DEFS[this.currentShape];
        const baseSpeed = 200 * def.speedMul;
        let speedMul = 1.0;

        if (this.health <= 25) {
            speedMul = 0;
            // 无法移动
            if (this.currentShape === 'normal') {
                this.player.setVelocityX(0);
            }
        } else if (this.health <= 50) {
            speedMul = 0.4;
        } else if (this.health <= 75) {
            speedMul = 0.7;
        }

        // 限制最大速度
        if (speedMul < 1.0) {
            const vx = this.player.body.velocity.x;
            const maxVx = baseSpeed * speedMul;
            if (Math.abs(vx) > maxVx) {
                this.player.setVelocityX(Math.sign(vx) * maxVx);
            }
        }
    }

    // ==================== 出口检测 ====================

    checkExit() {
        if (!this.exitZone || this.isDead) return;
        const d = Phaser.Math.Distance.Between(
            this.player.x, this.player.y,
            this.exitZone.x, this.exitZone.y
        );
        if (d < 50) {
            this.completeRoom();
        }
    }

    completeRoom() {
        if (this.isDead) return;
        this.isDead = true;
        this.player.body.enable = false;

        const room = ROOMS[this.roomIndex];
        this.showMessage('✨ ' + room.name + ' 完成！', '#ffdd44');

        this.time.delayedCall(800, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                const nextIdx = this.roomIndex + 1;
                if (nextIdx < ROOMS.length) {
                    this.scene.stop('UIScene');
                    this.scene.restart({ roomIndex: nextIdx });
                } else {
                    // 全部通关！
                    this.scene.stop('UIScene');
                    this.scene.start('MenuScene', { victory: true });
                }
            });
        });
    }
}

// ============================================================
//  SECTION 5: UIScene — HUD 叠加层
// ============================================================

class UIScene extends Phaser.Scene {
    constructor() { super('UIScene'); }

    init(data) {
        this.gameScene = data.gameScene;
    }

    create() {
        // 监听游戏事件
        this.gameScene.events.on('cutApplied', this.updateHUD, this);
        this.gameScene.events.on('pasteCollected', this.updateHUD, this);

        // ---- HUD 面板（玻璃质感） ----
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0xfcf8f2, 0.55);
        panelBg.fillRoundedRect(10, 10, 242, 104, 16);
        panelBg.lineStyle(1, 0xffffff, 0.4);
        panelBg.strokeRoundedRect(10, 10, 242, 104, 16);
        panelBg.fillStyle(C.WOOD, 0.3);
        [[15,15],[243,15],[15,106],[243,106]].forEach(([cx,cy]) => panelBg.fillCircle(cx,cy,2.5));

        const room = ROOMS[this.gameScene.roomIndex];
        this.add.text(24, 18, room.name, {
            fontFamily: 'FangSong, STFangsong, KaiTi, serif',
            fontSize: '15px', color: '#4a3528'
        });

        this.shapeText = this.add.text(24, 38, '形状：原形', {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '12px', color: '#6b5a4a'
        });

        this.add.text(24, 58, '纸力', {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '12px', color: '#6b5a4a'
        });
        this.healthBarBg = this.add.graphics();
        this.healthBarBg.fillStyle(0xe8d5b0, 1);
        this.healthBarBg.fillRoundedRect(58, 60, 120, 8, 4);
        this.healthBar = this.add.graphics();
        this.drawHealthBar(100);

        this.cutsText = this.add.text(24, 76, '', {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '12px', color: '#6b5a4a'
        });

        this.pasteText = this.add.text(24, 93, '', {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '12px', color: '#6b5a4a'
        });

        // 移动端虚拟按键
        this.mobileLeft = false;
        this.mobileRight = false;
        this.mobileJump = false;
        if (!this.sys.game.device.os.desktop) {
            this._createMobileControls();
        }

        this.add.text(GAME_W - 16, GAME_H - 16, 'R 重来  ·  ESC 菜单', {
            fontFamily: 'FangSong, STFangsong, SimSun, serif',
            fontSize: '10px', color: '#8b5a5a'
        }).setOrigin(1, 1);

        // 初始刷新
        this.updateHUD({
            shape: 'normal',
            cutsUsed: 0,
            maxCuts: room.maxCuts,
            health: 100
        });
    }

    _createMobileControls() {
        const bw = 52, bh = 52, margin = 16, bottom = GAME_H - bh - margin;
        const btnStyle = { fontFamily:'FangSong, STFangsong, serif', fontSize:'28px', color:'#4a3528' };
        const lx = margin;
        this._makeMobBtn(lx, bottom, bw, bh, '◀', btnStyle, (down) => { this.mobileLeft = down; });
        const rx = margin + bw + 8;
        this._makeMobBtn(rx, bottom, bw, bh, '▶', btnStyle, (down) => { this.mobileRight = down; });
        const jx = GAME_W - margin - bw*2 - 16;
        this._makeMobBtn(jx, bottom, bw*2+8, bh, '▲ 跳', btnStyle, (down) => { this.mobileJump = down; });
    }

    _makeMobBtn(x, y, w, h, label, style, callback) {
        const bg = this.add.graphics();
        bg.fillStyle(0xfcf8f2, 0.5);
        bg.fillRoundedRect(x, y, w, h, 14);
        bg.lineStyle(1.5, C.WOOD, 0.5);
        bg.strokeRoundedRect(x, y, w, h, 14);
        this.add.text(x + w/2, y + h/2, label, style).setOrigin(0.5);
        const zone = this.add.zone(x + w/2, y + h/2, w, h).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => { callback(true); bg.clear(); bg.fillStyle(0xfcf8f2, 0.75); bg.fillRoundedRect(x,y,w,h,14); bg.lineStyle(1.5,C.WOOD,0.7); bg.strokeRoundedRect(x,y,w,h,14); });
        zone.on('pointerup', () => { callback(false); bg.clear(); bg.fillStyle(0xfcf8f2, 0.5); bg.fillRoundedRect(x,y,w,h,14); bg.lineStyle(1.5,C.WOOD,0.5); bg.strokeRoundedRect(x,y,w,h,14); });
        zone.on('pointerout', () => { callback(false); bg.clear(); bg.fillStyle(0xfcf8f2, 0.5); bg.fillRoundedRect(x,y,w,h,14); bg.lineStyle(1.5,C.WOOD,0.5); bg.strokeRoundedRect(x,y,w,h,14); });
    }

    updateHUD(data) {
        if (data.shape !== undefined) {
            this.shapeText.setText('形状：' + SHAPE_DEFS[data.shape].name);
        }
        if (data.cutsUsed !== undefined) {
            this.cutsText.setText(
                '切割：' + data.cutsUsed + ' / ' + data.maxCuts +
                (data.cutsUsed >= data.maxCuts ? ' ⚠' : '')
            );
            // 数字弹跳
            this.tweens.add({
                targets: this.cutsText,
                scaleX: 1.15, scaleY: 1.15,
                duration: 100, yoyo: true, ease: 'Quad.easeOut'
            });
        }
        if (data.health !== undefined) {
            this.drawHealthBar(data.health);
            // 血量变动闪烁
            this.tweens.add({
                targets: this.healthBar,
                alpha: 0.6, duration: 80, yoyo: true
            });
        }
    }

    drawHealthBar(health) {
        this.healthBar.clear();
        let color;
        if (health > 75) color = C.RED;          // 正红（完好）
        else if (health > 50) color = C.GOLD;     // 金色（微损）
        else if (health > 25) color = 0xcc8844;   // 橙色（破损）
        else color = 0x884444;                     // 暗红（碎裂）

        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRoundedRect(59, 61, Math.max(0, 118*health/100), 6, 3);
    }
}

// ============================================================
//  SECTION 6: 游戏启动
// ============================================================

const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: 'game-container',
    backgroundColor: '#f5efe8',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H
    },
    roundPixels: true,
    autoRound: true,
    input: {
        activePointers: 1,
        touch: { capture: true }
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, GameScene, UIScene]
};

// 隐藏加载提示
const loadMsg = document.getElementById('loading-msg');
if (loadMsg) loadMsg.style.display = 'none';

// 启动游戏
if (typeof Phaser !== 'undefined') {
    const game = new Phaser.Game(config);
} else {
    console.error('Phaser not loaded!');
    if (loadMsg) {
        loadMsg.textContent = 'Phaser 库加载失败，请刷新重试';
        loadMsg.style.display = 'block';
    }
}
