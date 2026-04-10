function toast(msg, type = '', dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, dur);
}


/** 用选中节点的数据填充面板 */
function updatePanel(node) {
  const empty   = document.getElementById('panelEmpty');
  const content = document.getElementById('panelContent');

  if (!node) {
    empty.style.display   = '';
    content.style.display = 'none';
    return;
  }

  empty.style.display   = 'none';
  content.style.display = 'flex';

  document.getElementById('propText').value = node.text;
  document.getElementById('propType').value = {
    StartNode:    '开始/结束',
    ProcessNode:  '处理步骤',
    DecisionNode: '判断分支',
    IONode:       '输入/输出',
  }[node.type] || node.type;

  document.getElementById('propColor').value        = node.color;
  document.getElementById('propColorHex').value     = node.color;
  document.getElementById('propTextColor').value    = node.textColor;
  document.getElementById('propTextColorHex').value = node.textColor;
  document.getElementById('propX').value = Math.round(node.x);
  document.getElementById('propY').value = Math.round(node.y);
  document.getElementById('propW').value = Math.round(node.width);
  document.getElementById('propH').value = Math.round(node.height);
}

/** 仅更新面板中的位置数值（拖动时实时同步） */
function updatePanelPos(node) {
  if (!node) return;
  document.getElementById('propX').value = Math.round(node.x);
  document.getElementById('propY').value = Math.round(node.y);
}

const fc = new FlowCanvas(
  document.getElementById('mainCanvas'),
  document.getElementById('canvasArea')
);


/** 左侧工具栏：拖拽 */
document.querySelectorAll('.node-item').forEach(item => {
  item.addEventListener('dragstart', e => {
    e.dataTransfer.setData('nodeType', item.dataset.type);
  });
});


/** 顶部缩放按钮 */
document.getElementById('zoomIn').onclick = () =>
  fc.setZoom(fc.scale * 1.2);

document.getElementById('zoomOut').onclick = () =>
  fc.setZoom(fc.scale / 1.2);

document.getElementById('zoomReset').onclick = () => {
  fc.scale   = 1;
  fc.offsetX = 0;
  fc.offsetY = 0;
  document.getElementById('zoomLabel').textContent = '100%';
};

/** 节点文本 */
document.getElementById('propText').addEventListener('input', function () {
  if (fc.selectedNode) fc.selectedNode.text = this.value;
});

/** 填充色（拾色器）*/
document.getElementById('propColor').addEventListener('input', function () {
  if (!fc.selectedNode) return;
  fc.selectedNode.color                         = this.value;
  document.getElementById('propColorHex').value = this.value;
});

/** 填充色（Hex 输入） */
document.getElementById('propColorHex').addEventListener('change', function () {
  if (!/^#[0-9a-fA-F]{6}$/.test(this.value) || !fc.selectedNode) return;
  fc.selectedNode.color                        = this.value;
  document.getElementById('propColor').value   = this.value;
});

/** 文字色（拾色器） */
document.getElementById('propTextColor').addEventListener('input', function () {
  if (!fc.selectedNode) return;
  fc.selectedNode.textColor                         = this.value;
  document.getElementById('propTextColorHex').value = this.value;
});

/** 文字色（Hex 输入） */
document.getElementById('propTextColorHex').addEventListener('change', function () {
  if (!/^#[0-9a-fA-F]{6}$/.test(this.value) || !fc.selectedNode) return;
  fc.selectedNode.textColor                        = this.value;
  document.getElementById('propTextColor').value   = this.value;
});

/** 位置与大小 */
['propX', 'propY', 'propW', 'propH'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    if (!fc.selectedNode) return;
    const n  = fc.selectedNode;
    n.x      = +document.getElementById('propX').value;
    n.y      = +document.getElementById('propY').value;
    n.width  = Math.max(40, +document.getElementById('propW').value);
    n.height = Math.max(20, +document.getElementById('propH').value);
  });
});

/** 删除节点 */
document.getElementById('deleteNodeBtn').onclick = () => {
  if (!fc.selectedNode) return;
  fc.removeNode(fc.selectedNode);
  fc.selectedNode = null;
  updatePanel(null);
  toast('节点已删除');
};

// ── 画布拖拽进入 / 离开高亮（追加到 main.js 末尾）──
const canvasArea = document.getElementById('canvasArea');
canvasArea.addEventListener('dragenter', () =>
  canvasArea.classList.add('drag-over')
);
canvasArea.addEventListener('dragleave', e => {
  // 只在离开 canvasArea 本身时移除（避免子元素触发误判）
  if (!canvasArea.contains(e.relatedTarget)) {
    canvasArea.classList.remove('drag-over');
  }
});
canvasArea.addEventListener('drop', () =>
  canvasArea.classList.remove('drag-over')
);

// ────────────────────────────────────────────────────
//  保存按钮
// ────────────────────────────────────────────────────
document.getElementById('saveBtn').onclick     = () => fc.save();

document.getElementById('openBtn').onclick = () =>
  document.getElementById('fileInput').click();

document.getElementById('fileInput').onchange = e => {
  if (e.target.files[0]) fc.open(e.target.files[0]);
  e.target.value = '';
};
