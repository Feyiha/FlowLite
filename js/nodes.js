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
    throw new Error(`${this.constructor.name} 必须实现 render(ctx) 方法`);
  }

  /** 碰撞检测 */
  hitTest(px, py) {
    return (
      px >= this.x &&
      px <= this.x + this.width &&
      py >= this.y &&
      py <= this.y + this.height
    );
  }

  /** 在节点内绘制自动换行文本 */
  drawText(ctx, x, y, w, h) {
    ctx.fillStyle    = this.textColor;
    ctx.font         = '500 12px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const maxW  = w - 12;
    const lines = [];
    let line    = '';

    for (const ch of this.text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineHeight = 15;
    const startY     = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) =>
      ctx.fillText(l, x + w / 2, startY + i * lineHeight)
    );
  }

  /** 绘制选中状态的虚线边框与角点手柄 */
  renderSelection(ctx) {
    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8);
    ctx.setLineDash([]);

    const handles = [
      [this.x - 4,              this.y - 4],
      [this.x + this.width + 4, this.y - 4],
      [this.x - 4,              this.y + this.height + 4],
      [this.x + this.width + 4, this.y + this.height + 4],
    ];
    ctx.fillStyle = '#7c6af7';
    for (const [hx, hy] of handles) {
      ctx.fillRect(hx - 3, hy - 3, 6, 6);
    }
  }

  /** 序列化为纯对象（用于保存 / 导出）*/
  toJSON() {
    return {
      id:        this.id,
      type:      this.type,
      x:         this.x,
      y:         this.y,
      width:     this.width,
      height:    this.height,
      text:      this.text,
      color:     this.color,
      textColor: this.textColor,
    };
  }
}

};
