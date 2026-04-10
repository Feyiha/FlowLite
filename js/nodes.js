const uid = () => Math.random().toString(36).slice(2, 10);


// ═══════════════════════════════════════════════════════
//  任务 1.3 — 抽象基类 BaseNode
//
//  属性：x, y, width, height, color, text, textColor
//  抽象方法：render(ctx)  —— 子类必须实现
// ═══════════════════════════════════════════════════════
class BaseNode {
  constructor(x, y, w, h, text, color = '#7c6af7', textColor = '#ffffff') {
    if (new.target === BaseNode) {
      throw new Error('BaseNode 是抽象类，不可直接实例化');
    }
    this.id        = uid();
    this.x         = x;
    this.y         = y;
    this.width     = w;
    this.height    = h;
    this.text      = text;
    this.color     = color;
    this.textColor = textColor;
    this.type      = 'BaseNode';
  }

  /** 抽象方法（子类必须重写）*/
  render(ctx) {
    throw new Error(`${this.constructor.name} 必须实现 render(ctx)`);
  }

  // ────────────────────────────────────────────────────
  //  任务 3.1 — 锚点坐标（实时计算）
  // ────────────────────────────────────────────────────
  get anchors() {
    const { x, y, width: w, height: h } = this;
    return {
      top:    { x: x + w / 2, y: y         },
      bottom: { x: x + w / 2, y: y + h     },
      left:   { x: x,         y: y + h / 2 },
      right:  { x: x + w,     y: y + h / 2 },
    };
  }

  // ────────────────────────────────────────────────────
  //  任务 3.1 — hitAnchor：检测点是否命中某个锚点
  // ────────────────────────────────────────────────────
  hitAnchor(px, py, radius = 10) {
    for (const [name, pt] of Object.entries(this.anchors)) {
      if (Math.hypot(px - pt.x, py - pt.y) <= radius) {
        return name;   // 'top' | 'bottom' | 'left' | 'right'
      }
    }
    return null;
  }

  // ────────────────────────────────────────────────────
  //  任务 3.1 — renderAnchors：绘制四个锚点圆点
  // ────────────────────────────────────────────────────
  renderAnchors(ctx, isHovered = false) {
    for (const pt of Object.values(this.anchors)) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);

      // 填充色：悬停时更亮
      ctx.fillStyle = isHovered
        ? '#4ef0b8'
        : 'rgba(78, 240, 184, 0.5)';
      ctx.fill();

      // 描边
      ctx.strokeStyle = '#0e0f11';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
  }


  /** 任务2.1   在指定区域内居中绘制自动换行文本 */
  drawText(ctx, x, y, w, h) {
    ctx.fillStyle    = this.textColor;
    ctx.font         = '500 12px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    //自动换行
    const maxLineW = w - 12;   // 左右各留 6px padding
    const lines    = [];
    let   line     = '';

    for (const ch of this.text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxLineW && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    //垂直居中多行文本
    const lineHeight = 15;
    // 整体文本块的起始 y，使其在区域内垂直居中
    const blockStartY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((l, i) =>
      ctx.fillText(l, x + w / 2, blockStartY + i * lineHeight)
    );
  }

  /** 任务 2.3  矩形碰撞检测 */
  hitTest(px, py) {
    return (
      px >= this.x &&
      px <= this.x + this.width &&
      py >= this.y &&
      py <= this.y + this.height
    );
  }

  /** 任务 2.3  绘制选中态：虚线框 + 四角控制点 */
  renderSelection(ctx) {
    const pad = 4;   // 选中框与节点的间距

    // ① 虚线边框
    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(
      this.x - pad,
      this.y - pad,
      this.width  + pad * 2,
      this.height + pad * 2
    );
    ctx.setLineDash([]);   // 恢复实线，避免影响后续绘制

    // ② 四角控制点（6×6 实心矩形）
    const handles = [
      [this.x - pad,              this.y - pad             ],  // 左上
      [this.x + this.width + pad, this.y - pad             ],  // 右上
      [this.x - pad,              this.y + this.height + pad],  // 左下
      [this.x + this.width + pad, this.y + this.height + pad],  // 右下
    ];
    ctx.fillStyle = '#7c6af7';
    for (const [hx, hy] of handles) {
      ctx.fillRect(hx - 3, hy - 3, 6, 6);
    }
  }

  toJSON() {
    return {
      id: this.id, type: this.type,
      x: this.x,   y: this.y,
      width: this.width,  height: this.height,
      text: this.text,
      color: this.color,  textColor: this.textColor,
    };
  }
}


// ═══════════════════════════════════════════════════════
//  任务 2.1 — StartNode（圆角矩形）
//
// ═══════════════════════════════════════════════════════
class StartNode extends BaseNode {
  constructor(x, y, text = '开始') {
    super(x, y, 120, 44, text, '#1a2e28', '#4ef0b8');
    this.type = 'StartNode';
  }

  /** 绘制胶囊形圆角矩形 */
  render(ctx) {
    // 圆角半径 = 高度一半，形成胶囊形
    const radius = this.height / 2;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);

    // 填充
    ctx.fillStyle = this.color;
    ctx.fill();

    // 描边
    ctx.strokeStyle = '#4ef0b8';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // 居中文本（文本区域 = 节点整体区域）
    this.drawText(ctx, this.x, this.y, this.width, this.height);
  }
}


// ═══════════════════════════════════════════════════════
//  任务 2.1 — ProcessNode（圆角矩形）
//
// ═══════════════════════════════════════════════════════
class ProcessNode extends BaseNode {
  constructor(x, y, text = '处理步骤') {
    super(x, y, 130, 52, text, '#1a1630', '#c4bef7');
    this.type = 'ProcessNode';
  }

  /** 绘制圆角矩形 */
  render(ctx) {
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 6);

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // 居中文本
    this.drawText(ctx, this.x, this.y, this.width, this.height);
  }
}


// ═══════════════════════════════════════════════════════
//  任务 2.1 — DecisionNode（菱形）
// 
// ═══════════════════════════════════════════════════════
class DecisionNode extends BaseNode {
  constructor(x, y, text = '判断?') {
    super(x, y, 130, 70, text, '#2a1e0e', '#f5c87a');
    this.type = 'DecisionNode';
  }

  /** 绘制菱形 */
  render(ctx) {
    // 菱形四个顶点（上、右、下、左）
    const cx = this.x + this.width  / 2;   // 水平中心
    const cy = this.y + this.height / 2;   // 垂直中心

    ctx.beginPath();
    ctx.moveTo(cx,              this.y             );   // 上顶点
    ctx.lineTo(this.x + this.width,  cy            );   // 右顶点
    ctx.lineTo(cx,              this.y + this.height);  // 下顶点
    ctx.lineTo(this.x,          cy                 );   // 左顶点
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.strokeStyle = '#f0a44e';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── 文本绘制在菱形内切矩形区域内 ──────
    //  内切矩形：水平缩进 width/4，垂直缩进 height/4
    const insetX = this.width  / 4;
    const insetY = this.height / 4;
    this.drawText(
      ctx,
      this.x + insetX,
      this.y + insetY,
      this.width  - insetX * 2,
      this.height - insetY * 2
    );
  }

  /** 任务 2.3  菱形精确碰撞检测 */
  hitTest(px, py) {
    const cx    = this.x + this.width  / 2;
    const cy    = this.y + this.height / 2;
    const normX = Math.abs(px - cx) / (this.width  / 2);
    const normY = Math.abs(py - cy) / (this.height / 2);
    return normX + normY <= 1;
  }
}


// ═══════════════════════════════════════════════════════
//  IONode（平行四边形）
// ═══════════════════════════════════════════════════════
class IONode extends BaseNode {
  constructor(x, y, text = '输入/输出') {
    super(x, y, 130, 50, text, '#2a0e0e', '#f59090');
    this.type = 'IONode';
  }

  render(ctx) {
    const skew = 14;   // 水平错切量
    ctx.beginPath();
    ctx.moveTo(this.x + skew,              this.y             );
    ctx.lineTo(this.x + this.width,        this.y             );
    ctx.lineTo(this.x + this.width - skew, this.y + this.height);
    ctx.lineTo(this.x,                     this.y + this.height);
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.strokeStyle = '#f05c5c';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // 文本区域水平收窄 skew/2，避免文字超出斜边
    this.drawText(
      ctx,
      this.x + skew / 2,
      this.y,
      this.width - skew,
      this.height
    );
  }
}

const NODE_TYPES = {
  StartNode,
  ProcessNode,
  DecisionNode,
  IONode,
};
