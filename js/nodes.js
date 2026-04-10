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

}
