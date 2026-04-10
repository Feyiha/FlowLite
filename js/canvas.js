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

    // 图形对象管理
    this.nodes = new Map();
    this.connections = [];

    // 选中与悬停状态
    this.selectedNode = null;
    this.selectedConn = null;
    this.hoveredNode  = null;

    // 拖拽状态
    this.dragging = null;

    // 视口变换（平移 + 缩放）
    this.scale   = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // 平移状态
    this.panning  = false;
    this.panStart = null;

    // 连线拖拽状态
    this.connecting = null;

    // 初始化
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
    // 同时移除与该节点相关的所有连线
    this.connections = this.connections.filter(
      c => c.sourceNodeId !== node.id && c.targetNodeId !== node.id
    );
  }

  /** 添加连线 */
  addConnection(conn) {
    const duplicate = this.connections.find(c =>
      c.sourceNodeId === conn.sourceNodeId &&
      c.sourceAnchor === conn.sourceAnchor &&
      c.targetNodeId === conn.targetNodeId &&
      c.targetAnchor === conn.targetAnchor
    );
    if (duplicate) return false;
    this.connections.push(conn);
    return true;
  }

  // ═════════════════════════════════════════
  //  3. 重绘机制（requestAnimationFrame 循环）
  // ═════════════════════════════════════════

  /** 任务 1.2  启动渲染循环 */
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
    
    // 绘制所有正式连线
    // 实时获取端点坐标，节点移动时连线自动跟随，无需手动更新。
    for (const conn of this.connections) {
      conn.render(ctx, this.nodes, conn === this.selectedConn);
    }

    // 绘制临时预览连线
    // 任务 3.3：正在拖拽创建连线时，绘制从源锚点到鼠标的虚线
    this._drawTempLine(ctx);

    // 绘制所有节点
    for (const node of this.nodes.values()) {
      node.render(ctx);

      // 选中态：虚线框 + 四角控制点
      if (node === this.selectedNode) {
        node.renderSelection(ctx);
      }

     // 任务 3.1：选中或悬停时显示锚点
      if (node === this.selectedNode || node === this.hoveredNode) {
        node.renderAnchors(ctx, node === this.hoveredNode);
      }
    }

    ctx.restore();
  }

  // ────────────────────────────────────────────────────
  //  任务 3.3 — 绘制临时预览线
  // ────────────────────────────────────────────────────
  _drawTempLine(ctx) {
    if (!this.connecting) return;

    const srcNode = this.nodes.get(this.connecting.srcId);
    if (!srcNode) return;

    const p1 = srcNode.anchors[this.connecting.srcAnchor];
    const { mx, my } = this.connecting;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(mx, my);

    ctx.strokeStyle = '#4ef0b8';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);   // 恢复实线

    // 在鼠标位置绘制小圆点，增强"正在连接"的视觉感
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4ef0b8';
    ctx.fill();
  }



  // ═════════════════════════════════════════
  //  4. 基础交互事件
  // ═════════════════════════════════════════

  _bindEvents() {
    
    window.addEventListener('resize', () => this._resize());
    this._bindDrop();

    // ── 任务 2.3：节点选中与移动 ─────────────────────────
    this.canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup',    e => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredNode = null;
      // 鼠标离开画布时取消连线拖拽，防止状态残留
      this.connecting  = null;
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
      if (['INPUT', 'TEXTAREA'].includes(tag)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedNode) {
          this.removeNode(this.selectedNode);
          this.selectedNode = null;
          updatePanel(null);
          toast('节点已删除');
        } else if (this.selectedConn) {
          this.connections  = this.connections.filter(c => c !== this.selectedConn);
          this.selectedConn = null;
          toast('连线已删除');
        }
      }

      // Escape 键取消连线拖拽
      if (e.key === 'Escape') {
        this.connecting = null;
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
      const node = new NODE_TYPES[type](lp.x - 65, lp.y - 26);

      // 加入画布并选中
      this.addNode(node);
      this.selectedNode = node;
      this.selectedConn = null;
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

    //  检测锚点命中（逆序遍历，顶层优先）
    for (const node of [...this.nodes.values()].reverse()) {
      const anchorName = node.hitAnchor(lp.x, lp.y, 10 / this.scale);
      if (anchorName) {
        // 开始连线拖拽，记录源节点和源锚点
        this.connecting = {
          srcId:     node.id,
          srcAnchor: anchorName,
          mx: lp.x,
          my: lp.y,
        };
        return;   // 不进入节点移动逻辑
      }
    }

    // 检测节点命中（逆序遍历，顶层优先）
    for (const node of [...this.nodes.values()].reverse()) {
      if (node.hitTest(lp.x, lp.y)) {
        // 选中节点
        this.selectedNode = node;
        this.selectedConn = null;
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

    // 检测连线命中
    for (const conn of [...this.connections].reverse()) {
      if (conn.hitTest(lp.x, lp.y, this.nodes, 8 / this.scale)) {
        this.selectedConn = conn;
        this.selectedNode = null;
        updatePanel(null);
        return;
      }
    }

    // 空白处 → 取消选中 + 启动平移
    this.selectedNode = null;
    this.selectedConn = null;
    updatePanel(null);
    this._startPan(e);
  }

  // ────────────────────────────────────────────────────
  //  任务 3.3 — mousemove
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

    // 连线拖拽
    if (this.connecting) {
      this.connecting.mx = lp.x;
      this.connecting.my = lp.y;
      return;
    }

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
  //  任务 3.3 — mouseup
  //  结束拖拽 / 结束平移
  // ────────────────────────────────────────────────────
  _onMouseUp(e) {
    this.canvas.style.cursor = 'default';

    // 结束视口平移
    if (this.panning) {
      this.panning  = false;
      this.panStart = null;
      return;
    }

    // 结束节点拖拽
    if (this.dragging) {
      this.dragging = null;
      return;
    }

    // 结束连线拖拽
    if (this.connecting) {
      const lp = this._canvasPos(e);
      this._tryCreateConnection(lp.x, lp.y);
      this.connecting = null;
    }
  }


  // ────────────────────────────────────────────────────
  //  任务 3.3 — 尝试创建连线
 // ────────────────────────────────────────────────────
  _tryCreateConnection(px, py) {
    // 目标锚点的命中半径略大于源锚点，提升连接成功率
    const hitRadius = 14 / this.scale;

    for (const node of [...this.nodes.values()].reverse()) {
      // 不允许自连（源节点和目标节点相同）
      if (node.id === this.connecting.srcId) continue;

      const anchorName = node.hitAnchor(px, py, hitRadius);
      if (anchorName) {
        const conn = new Connection(
          this.connecting.srcId,
          this.connecting.srcAnchor,
          node.id,
          anchorName
        );

        if (this.addConnection(conn)) {
          toast('连线已创建', 'success');
        } else {
          toast('连线已存在', 'warn');
        }
        return;   // 只连接第一个命中的锚点
      }
    }
    // 未命中任何锚点：静默取消，不提示
  }

  //  视口平移
  _startPan(e) {
    this.panning  = true;
    this.panStart = {
      x: e.clientX - this.offsetX,
      y: e.clientY - this.offsetY,
    };
    this.canvas.style.cursor = 'grabbing';
  }

  // ─────────────────────────────────────
  //  任务 4.1 序列化 / 反序列化
  // ─────────────────────────────────────
  _serialize() {
    return {
      nodes: [...this.nodes.values()].map(n => n.toJSON()),
      edges: this.connections.map(c => c.toJSON()),
    };
  }

  _deserialize(data) {
    this.nodes.clear();
    this.connections = [];

    for (const nd of data.nodes) {
      const Cls = NODE_TYPES[nd.type];
      if (!Cls) continue;
      const node      = new Cls(nd.x, nd.y, nd.text);
      node.id         = nd.id;
      node.width      = nd.width;
      node.height     = nd.height;
      node.color      = nd.color;
      node.textColor  = nd.textColor;
      this.nodes.set(node.id, node);
    }

    for (const ed of data.edges) {
      const c  = new Connection(ed.sourceNodeId, ed.sourceAnchor,
                                ed.targetNodeId, ed.targetAnchor);
      c.id     = ed.id;
      c.label  = ed.label || '';
      this.connections.push(c);
    }
  }

  // ─────────────────────────────────────
  //  任务 4.2 save和open方法
  // ─────────────────────────────────────
  save() {
    const json = JSON.stringify(this._serialize(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'flowlite-' + Date.now() + '.json';
    a.click();
    toast('已保存到本地', 'success');
  }

  open(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        this._deserialize(data);
        this.selectedNode = null;
        this.selectedConn = null;
        updatePanel(null);
        this.snapshot();
        toast('文件加载成功', 'success');
        document.querySelector('.canvas-hint').style.display = 'none';
      } catch {
        toast('文件格式错误', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ─────────────────────────────────────
  //  任务 5.0 清空画布
  // ─────────────────────────────────────
  clear() {
    if (this.nodes.size === 0) return;
    if (!confirm('确认清空画布？此操作不可撤销。')) return;
    this.nodes.clear();
    this.connections  = [];
    this.selectedNode = null;
    this.selectedConn = null;
    this.histIdx      = -1;
    this.history      = [];
    this.snapshot();
    updatePanel(null);
    document.querySelector('.canvas-hint').style.display = '';
    toast('画布已清空');
  }

  // ─────────────────────────────────────
  //  任务 5.2 校验
  // ─────────────────────────────────────
  validate() {
    if (this.nodes.size === 0) {
      toast('画布为空，请先添加节点', 'warn');
      return;
    }

    const issues = [];
    const inDeg  = new Map();
    const outDeg = new Map();

    for (const id of this.nodes.keys()) {
      inDeg.set(id, 0);
      outDeg.set(id, 0);
    }
    for (const c of this.connections) {
      outDeg.set(c.sourceNodeId, (outDeg.get(c.sourceNodeId) || 0) + 1);
      inDeg.set(c.targetNodeId,  (inDeg.get(c.targetNodeId)  || 0) + 1);
    }

    for (const node of this.nodes.values()) {
      const i       = inDeg.get(node.id);
      const o       = outDeg.get(node.id);
      const isStart = node.type === 'StartNode';
      if (!isStart && i === 0 && o === 0)
        issues.push(`"${node.text}" 是孤立节点`);
      if (node.type === 'DecisionNode' && o < 2)
        issues.push(`"${node.text}" 判断节点应有至少2条出线`);
      if (isStart && i > 0)
        issues.push(`"${node.text}" 开始/结束节点有入线`);
    }

    if (issues.length === 0) {
      toast('✓ 流程校验通过，无异常', 'success', 3000);
    } else {
      toast('⚠ 发现 ' + issues.length + ' 个问题（见控制台）', 'warn', 4000);
      console.group('[FlowLite] 校验结果');
      issues.forEach(i => console.warn(i));
      console.groupEnd();
      alert('流程校验问题：\n\n' + issues.join('\n'));
    }
  }

  // ─────────────────────────────────────
  //  任务 5.3 导出图片
  // ─────────────────────────────────────
  exportPNG() {
    const off  = document.createElement('canvas');
    off.width  = this.canvas.width;
    off.height = this.canvas.height;
    const octx = off.getContext('2d');

    // 背景
    octx.fillStyle = '#0e0f11';
    octx.fillRect(0, 0, off.width, off.height);

    // 网格
    octx.strokeStyle = '#1e2126';
    octx.lineWidth   = 1;
    const gs = 28 * this.scale;
    for (let x = this.offsetX % gs; x < off.width;  x += gs) {
      octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, off.height); octx.stroke();
    }
    for (let y = this.offsetY % gs; y < off.height; y += gs) {
      octx.beginPath(); octx.moveTo(0, y); octx.lineTo(off.width, y); octx.stroke();
    }

    // 内容
    octx.save();
    octx.translate(this.offsetX, this.offsetY);
    octx.scale(this.scale, this.scale);
    for (const c    of this.connections) c.render(octx, this.nodes, false);
    for (const node of this.nodes.values()) node.render(octx);
    octx.restore();

    const a    = document.createElement('a');
    a.href     = off.toDataURL('image/png');
    a.download = 'flowlite-export.png';
    a.click();
    toast('PNG 已导出', 'success');
  }
}