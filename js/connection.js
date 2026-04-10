// ═══════════════════════════════════════════════════════
//  任务 3.2 — Connection 类
// ═══════════════════════════════════════════════════════
class Connection {
  constructor(sourceNodeId, sourceAnchor, targetNodeId, targetAnchor) {
    this.id           = uid();
    this.sourceNodeId = sourceNodeId;
    this.sourceAnchor = sourceAnchor;
    this.targetNodeId = targetNodeId;
    this.targetAnchor = targetAnchor;
    this.label        = '';
  }


  // ────────────────────────────────────────────────────
  //  关键点：动态获取端点坐标
  // ────────────────────────────────────────────────────
  _getEndpoints(nodes) {
    const src = nodes.get(this.sourceNodeId);
    const tgt = nodes.get(this.targetNodeId);
    if (!src || !tgt) return null;

    return {
      p1: src.anchors[this.sourceAnchor],  // 实时计算，跟随节点位置
      p2: tgt.anchors[this.targetAnchor],
    };
  }


  // ────────────────────────────────────────────────────
  //  任务 3.2 — 计算贝塞尔控制点
  // ────────────────────────────────────────────────────
  _calcControlPoints(p1, p2) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const cp   = Math.min(Math.max(dist * 0.4, 40), 120);

    // 控制点初始值 = 端点位置
    let c1x = p1.x, c1y = p1.y;
    let c2x = p2.x, c2y = p2.y;

    // 源端控制点：沿锚点方向向外偏移
    switch (this.sourceAnchor) {
      case 'right':  c1x += cp; break;
      case 'left':   c1x -= cp; break;
      case 'bottom': c1y += cp; break;
      case 'top':    c1y -= cp; break;
    }

    // 目标端控制点：沿锚点反方向向外偏移（"迎接"曲线）
    switch (this.targetAnchor) {
      case 'left':   c2x -= cp; break;
      case 'right':  c2x += cp; break;
      case 'top':    c2y -= cp; break;
      case 'bottom': c2y += cp; break;
    }

    return { c1x, c1y, c2x, c2y };
  }


  // ────────────────────────────────────────────────────
  //  任务 3.2 — render：绘制贝塞尔曲线连线 + 箭头
  // ────────────────────────────────────────────────────
  render(ctx, nodes, selected = false) {
    const pts = this._getEndpoints(nodes);
    if (!pts) return;

    const { p1, p2 } = pts;
    const { c1x, c1y, c2x, c2y } = this._calcControlPoints(p1, p2);

    // 绘制贝塞尔曲线主体
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);

    ctx.strokeStyle = selected ? '#e2fe10' : 'rgba(139, 144, 158, 0.6)';
    ctx.lineWidth   = selected ? 2         : 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // 绘制箭头
    //  在曲线末端附近（t=0.98）取切线方向，
    //  绘制等腰三角形箭头，使其与曲线方向一致。
    this._drawArrow(ctx, p1, p2, c1x, c1y, c2x, c2y, selected);
  }

  /** 绘制箭头（三角形） */
  _drawArrow(ctx, p1, p2, c1x, c1y, c2x, c2y, selected) {
    // 在 t=0.98 处采样，获取箭头根部坐标，用于计算方向角
    const t  = 0.98;
    const mt = 1 - t;
    const ax = mt**3*p1.x + 3*mt**2*t*c1x + 3*mt*t**2*c2x + t**3*p2.x;
    const ay = mt**3*p1.y + 3*mt**2*t*c1y + 3*mt*t**2*c2y + t**3*p2.y;

    // 箭头方向角 = 从 t=0.98 处指向 p2 的角度
    const angle      = Math.atan2(p2.y - ay, p2.x - ax);
    const arrowSize  = 9;
    const arrowSpread = 0.4;   // 箭头半张角（弧度）

    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(
      p2.x - arrowSize * Math.cos(angle - arrowSpread),
      p2.y - arrowSize * Math.sin(angle - arrowSpread)
    );
    ctx.lineTo(
      p2.x - arrowSize * Math.cos(angle + arrowSpread),
      p2.y - arrowSize * Math.sin(angle + arrowSpread)
    );
    ctx.closePath();

    ctx.fillStyle = selected ? '#e2fe10' : 'rgba(139, 144, 158, 0.8)';
    ctx.fill();
  }


  // ────────────────────────────────────────────────────
  //  连线碰撞检测（点到贝塞尔曲线的近似距离）
  //
  // ────────────────────────────────────────────────────
  hitTest(px, py, nodes, threshold = 8) {
    const pts = this._getEndpoints(nodes);
    if (!pts) return false;

    const { p1, p2 } = pts;

    // 预筛
    const { c1x, c1y, c2x, c2y } = this._calcControlPoints(p1, p2);

    const minX = Math.min(p1.x, p2.x, c1x, c2x) - threshold;
    const maxX = Math.max(p1.x, p2.x, c1x, c2x) + threshold;
    const minY = Math.min(p1.y, p2.y, c1y, c2y) - threshold;
    const maxY = Math.max(p1.y, p2.y, c1y, c2y) + threshold;
    if (px < minX || px > maxX || py < minY || py > maxY) return false;

    // 30 段采样
    for (let i = 0; i <= 30; i++) {
      const t  = i / 30;
      const mt = 1 - t;
      const bx = mt**3*p1.x + 3*mt**2*t*c1x + 3*mt*t**2*c2x + t**3*p2.x;
      const by = mt**3*p1.y + 3*mt**2*t*c1y + 3*mt*t**2*c2y + t**3*p2.y;
      if (Math.hypot(px - bx, py - by) < threshold) return true;
    }
    return false;
  }


  toJSON() {
    return {
      id:           this.id,
      sourceNodeId: this.sourceNodeId,
      sourceAnchor: this.sourceAnchor,
      targetNodeId: this.targetNodeId,
      targetAnchor: this.targetAnchor,
      label:        this.label,
    };
  }
}
