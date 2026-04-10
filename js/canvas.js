// ═══════════════════════════════════════════════════════
//  任务 1.2 — FlowCanvas 核心类
//
//  职责：
//    · 管理所有图形对象（nodes）
//    · 坐标系转换（屏幕坐标 → 逻辑坐标）
//    · requestAnimationFrame 重绘循环
//    · 基础交互：节点拖拽、选中、视口平移、缩放
// ═══════════════════════════════════════════════════════

class FlowCanvas {
  constructor(canvas, area) {
    this.canvas = canvas;
    this.area   = area;
    this.ctx    = canvas.getContext('2d');

    // ── 图形对象管理 ──────────────────────
    this.nodes = new Map();

    // ── 选中与悬停状态 ────────────────────
    this.selectedNode = null;
    this.hoveredNode  = null;

    // ── 拖拽状态 ──────────────────────────
    this.dragging = null;

    // ── 视口变换（平移 + 缩放） ───────────
    this.scale   = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // ── 平移状态 ──────────────────────────
    this.panning  = false;
    this.panStart = null;

    // ── 初始化 ────────────────────────────
    this._resize();
    this._bindEvents();
    this._startLoop();
  }


  // ═════════════════════════════════════════
  //  1. 视口管理
  // ═════════════════════════════════════════

  /** 使 canvas 尺寸与容器一致 */
  _resize() {
    this.canvas.width  = this.area.clientWidth;
    this.canvas.height = this.area.clientHeight;
  }

  /** 任务 1.2 — 坐标系转换：屏幕坐标 → 逻辑坐标 */
  screenToLogic(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  /** 设置缩放级别，以屏幕点 (cx, cy) 为缩放中心 */
  setZoom(z, cx, cy) {
    cx = cx ?? this.canvas.width  / 2;
    cy = cy ?? this.canvas.height / 2;

    const oldScale = this.scale;
    this.scale     = Math.max(0.2, Math.min(3, z));

    // 保持缩放中心不动
    this.offsetX = cx - (cx - this.offsetX) * (this.scale / oldScale);
    this.offsetY = cy - (cy - this.offsetY) * (this.scale / oldScale);

    document.getElementById('zoomLabel').textContent =
      Math.round(this.scale * 100) + '%';
  }


  // ═════════════════════════════════════════
  //  2. 图形对象管理
  // ═════════════════════════════════════════

  /** 添加节点到画布 */
  addNode(node) {
    this.nodes.set(node.id, node);
  }

  /** 从画布移除节点 */
  removeNode(node) {
    this.nodes.delete(node.id);
  }


  // ═════════════════════════════════════════
  //  3. 重绘机制（requestAnimationFrame 循环）
  // ═════════════════════════════════════════

  /** 任务 1.2 — 启动渲染循环 */
  _startLoop() {
    const tick = () => {
      this._draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** 每帧绘制 */
  _draw() {
    const { ctx, canvas } = this;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用视口变换
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 绘制所有节点
    for (const node of this.nodes.values()) {
      // 任务 1.3 — 调用 render(ctx) 抽象方法
      node.render(ctx);

      // 选中态高亮
      if (node === this.selectedNode) {
        node.renderSelection(ctx);
      }
    }

    ctx.restore();
  }


  // ═════════════════════════════════════════
  //  4. 基础交互事件
  // ═════════════════════════════════════════

  _bindEvents() {
    // 窗口缩放时重新适配 canvas 尺寸
    window.addEventListener('resize', () => this._resize());

    // ── 任务 2.2：左侧工具栏拖拽放置 ────────────────────
    this._bindDrop();

    // ── 任务 2.3：节点选中与移动 ─────────────────────────
    this.canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup',    e => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredNode = null;
    });

    // 滚轮缩放 
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.setZoom(
        this.scale * (e.deltaY > 0 ? 0.9 : 1.1),
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    }, { passive: false });

    // 键盘删除
    window.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !['INPUT', 'TEXTAREA'].includes(tag) &&
        this.selectedNode
      ) {
        this.removeNode(this.selectedNode);
        this.selectedNode = null;
        updatePanel(null);
        toast('节点已删除');
      }
    });
  }

  // ────────────────────────────────────────────────────
  //  任务 2.2 — 拖拽放置节点
  //
  // ────────────────────────────────────────────────────
  _bindDrop() {
    // 允许拖拽进入
    this.area.addEventListener('dragover', e => e.preventDefault());

    this.area.addEventListener('drop', e => {
      e.preventDefault();

      // 读取拖拽携带的节点类型
      const type = e.dataTransfer.getData('nodeType');
      if (!type || !NODE_TYPES[type]) return;

      // 屏幕坐标 → 逻辑坐标
      const rect = this.canvas.getBoundingClientRect();
      const lp   = this.screenToLogic(
        e.clientX - rect.left,
        e.clientY - rect.top
      );

      // 实例化节点，使节点中心对齐鼠标落点
      // 默认节点宽约 120~130，高约 44~70，各取中间值估算
      const node = new NODE_TYPES[type](lp.x - 65, lp.y - 26);

      // 加入画布并选中
      this.addNode(node);
      this.selectedNode = node;
      updatePanel(node);

      // 隐藏画布提示文字
      document.querySelector('.canvas-hint').style.display = 'none';
    });
  }

  /** 获取鼠标事件对应的逻辑坐标 */
  _canvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this.screenToLogic(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  }

  // ────────────────────────────────────────────────────
  //  任务 2.3 — mousedown
  //
  // ────────────────────────────────────────────────────
  _onMouseDown(e) {
    // 中键 或 Alt + 左键 → 启动平移
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this._startPan(e);
      return;
    }

    const lp = this._canvasPos(e);

    // 检测节点命中（逆序遍历，顶层优先）
    for (const node of [...this.nodes.values()].reverse()) {
      if (node.hitTest(lp.x, lp.y)) {
        // 选中节点
        this.selectedNode = node;

        // 记录鼠标相对于节点左上角的偏移，拖拽时保持相对位置不变
        this.dragging = {
          node,
          ox: lp.x - node.x,
          oy: lp.y - node.y,
        };

        this.canvas.style.cursor = 'move';
        updatePanel(node);
        return;
      }
    }

    // 空白处 → 取消选中 + 启动平移
    this.selectedNode = null;
    updatePanel(null);
    this._startPan(e);
  }

  // ────────────────────────────────────────────────────
  //  任务 2.3 — mousemove
  //
  // ────────────────────────────────────────────────────
  _onMouseMove(e) {
    // 平移视口
    if (this.panning && this.panStart) {
      this.offsetX = e.clientX - this.panStart.x;
      this.offsetY = e.clientY - this.panStart.y;
      return;
    }

    const lp = this._canvasPos(e);

    // 拖拽节点
    if (this.dragging) {
      const { node, ox, oy } = this.dragging;
      node.x = lp.x - ox;
      node.y = lp.y - oy;
      updatePanelPos(node);
      return;
    }

    // 悬停检测
    let hov = null;
    for (const node of [...this.nodes.values()].reverse()) {
      if (node.hitTest(lp.x, lp.y)) { hov = node; break; }
    }
    this.hoveredNode             = hov;
    this.canvas.style.cursor     = hov ? 'move' : 'default';
  }

  // ────────────────────────────────────────────────────
  //  任务 2.3 — mouseup
  //  结束拖拽 / 结束平移
  // ────────────────────────────────────────────────────
  _onMouseUp() {
    this.canvas.style.cursor = 'default';

    if (this.panning) {
      this.panning  = false;
      this.panStart = null;
      return;
    }
    // 结束节点拖拽
    if (this.dragging) {
      this.dragging = null;
    }
  }

  // ────────────────────────────────────────────────────
  //  视口平移
  // ────────────────────────────────────────────────────
  _startPan(e) {
    this.panning  = true;
    this.panStart = {
      x: e.clientX - this.offsetX,
      y: e.clientY - this.offsetY,
    };
    this.canvas.style.cursor = 'grabbing';
  }
}