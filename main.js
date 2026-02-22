// ══════════════════════════════════════════
//  مختصراتي — main.js
// ══════════════════════════════════════════

const STORAGE_KEY = 'mokhtasarati_v1';

let shortcuts = [];        // مصفوفة البيانات
let editingId = null;      // id الكارد اللي بنعدل عليه
let selectedColor = '#6b7280';
let dragSrcIndex = null;   // Drag & Drop
let contextTargetId = null;

// ──── Elements ────
const grid         = document.getElementById('shortcutsGrid');
const emptyState   = document.getElementById('emptyState');
const addBtn       = document.getElementById('addBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const modalTitle   = document.getElementById('modalTitle');
const btnCancel    = document.getElementById('btnCancel');
const btnSave      = document.getElementById('btnSave');
const inputUrl     = document.getElementById('inputUrl');
const inputName    = document.getElementById('inputName');
const inputDesc    = document.getElementById('inputDesc');
const colorOptions = document.querySelectorAll('.color-option');
const contextMenu  = document.getElementById('contextMenu');
const ctxEdit      = document.getElementById('ctxEdit');
const ctxDelete    = document.getElementById('ctxDelete');

// ──── Load / Save ────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    shortcuts = raw ? JSON.parse(raw) : [];
  } catch { shortcuts = []; }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

// ──── Utils ────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nextAutoName() {
  // أعلى رقم تلقائي موجود + 1
  const nums = shortcuts
    .map(s => s.name)
    .filter(n => /^مختصر #\d+$/.test(n))
    .map(n => parseInt(n.replace('مختصر #', '')));
  return `مختصر #${nums.length ? Math.max(...nums) + 1 : 1}`;
}

function getFavicon(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch { return null; }
}

function lightenColor(hex, amt = 30) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, r + amt);
  g = Math.min(255, g + amt);
  b = Math.min(255, b + amt);
  return `rgb(${r},${g},${b})`;
}

// ──── Render ────
function render() {
  // أزل الكروت القديمة (مش الـempty state)
  [...grid.querySelectorAll('.shortcut-card')].forEach(el => el.remove());

  if (shortcuts.length === 0) {
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  shortcuts.forEach((s, index) => {
    const card = buildCard(s, index);
    grid.appendChild(card);
  });
}

function buildCard(s, index) {
  const card = document.createElement('div');
  card.className = 'shortcut-card';
  card.setAttribute('draggable', true);
  card.dataset.id = s.id;
  card.dataset.index = index;
  card.style.setProperty('--card-color', s.color);
  card.style.animationDelay = `${index * 0.05}s`;

  const favicon = getFavicon(s.url);

  card.innerHTML = `
    <div class="card-color-bar" style="background:linear-gradient(90deg,${s.color},${lightenColor(s.color)})"></div>
    <div class="card-body">
      <a class="card-link" href="${s.url}" target="_blank" rel="noopener noreferrer" title="${s.url}">
        <div class="card-icon" style="border-color:${s.color}44;background:${s.color}18">
          ${favicon
            ? `<img src="${favicon}" width="22" height="22" alt="" onerror="this.replaceWith(document.createTextNode('🔗'))" />`
            : '🔗'}
        </div>
        <div class="card-info">
          <div class="card-name">${escHtml(s.name)}</div>
          <div class="card-desc">${escHtml(s.desc)}</div>
        </div>
      </a>
    </div>
    <div class="card-actions">
      <button class="card-action-btn edit" title="تعديل">✏️</button>
      <button class="card-action-btn delete" title="حذف">🗑️</button>
    </div>
  `;

  // Open link (block drag accidental clicks)
  card.querySelector('.card-link').addEventListener('click', e => {
    if (card.classList.contains('just-dragged')) {
      e.preventDefault();
      card.classList.remove('just-dragged');
    }
  });

  card.querySelector('.edit').addEventListener('click', e => {
    e.stopPropagation();
    openModal(s.id);
  });
  card.querySelector('.delete').addEventListener('click', e => {
    e.stopPropagation();
    deleteShortcut(s.id);
  });

  // Right-click context menu
  card.addEventListener('contextmenu', e => {
    e.preventDefault();
    showContextMenu(e, s.id);
  });

  // Drag & Drop
  card.addEventListener('dragstart', e => {
    dragSrcIndex = index;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    card.classList.add('just-dragged');
    clearDragOver();
    setTimeout(() => card.classList.remove('just-dragged'), 200);
  });
  card.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSrcIndex !== null && dragSrcIndex !== index) {
      clearDragOver();
      card.classList.add('drag-over');
    }
  });
  card.addEventListener('drop', e => {
    e.preventDefault();
    if (dragSrcIndex !== null && dragSrcIndex !== index) {
      const moved = shortcuts.splice(dragSrcIndex, 1)[0];
      shortcuts.splice(index, 0, moved);
      dragSrcIndex = null;
      saveData();
      render();
    }
  });

  return card;
}

function clearDragOver() {
  grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ──── Modal ────
function openModal(id = null) {
  editingId = id;
  if (id) {
    const s = shortcuts.find(x => x.id === id);
    modalTitle.textContent = 'تعديل المختصر';
    inputUrl.value  = s.url;
    inputName.value = s.name;
    inputDesc.value = s.desc === '...' ? '' : s.desc;
    selectColor(s.color);
  } else {
    modalTitle.textContent = 'إضافة مختصر جديد';
    inputUrl.value  = '';
    inputName.value = '';
    inputDesc.value = '';
    selectColor('#6b7280');
  }
  modalOverlay.classList.add('active');
  setTimeout(() => inputUrl.focus(), 350);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  editingId = null;
}

function selectColor(color) {
  selectedColor = color;
  colorOptions.forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.color === color);
  });
  // إذا اللون مش موجود في الخيارات، خليه رمادي
  if (![...colorOptions].some(o => o.dataset.color === color)) {
    colorOptions[0].classList.add('selected');
    selectedColor = colorOptions[0].dataset.color;
  }
}

function saveShortcut() {
  const url = inputUrl.value.trim();
  if (!url) {
    inputUrl.focus();
    inputUrl.style.borderColor = '#ef4444';
    setTimeout(() => inputUrl.style.borderColor = '', 1500);
    return;
  }

  // تأكد الرابط فيه بروتوكول
  let finalUrl = url;
  if (!/^https?:\/\//i.test(url)) finalUrl = 'https://' + url;

  const name = inputName.value.trim() || nextAutoName();
  const desc = inputDesc.value.trim() || '...';

  if (editingId) {
    const s = shortcuts.find(x => x.id === editingId);
    s.url   = finalUrl;
    s.name  = name;
    s.desc  = desc;
    s.color = selectedColor;
  } else {
    shortcuts.push({ id: genId(), url: finalUrl, name, desc, color: selectedColor });
  }

  saveData();
  closeModal();
  render();
}

// ──── Delete ────
function deleteShortcut(id) {
  shortcuts = shortcuts.filter(s => s.id !== id);
  saveData();

  // حذف بأنيميشن
  const card = grid.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.style.transition = 'transform .3s, opacity .3s';
    card.style.transform  = 'scale(0.7)';
    card.style.opacity    = '0';
    setTimeout(() => render(), 300);
  } else {
    render();
  }
}

// ──── Context Menu ────
function showContextMenu(e, id) {
  contextTargetId = id;
  const cm = contextMenu;
  cm.style.top  = `${e.clientY}px`;
  cm.style.left = `${e.clientX}px`;
  // تأكد مش بيطلع بره الشاشة
  cm.classList.add('active');
  requestAnimationFrame(() => {
    const rect = cm.getBoundingClientRect();
    if (rect.right > window.innerWidth)  cm.style.left  = `${e.clientX - rect.width}px`;
    if (rect.bottom > window.innerHeight) cm.style.top = `${e.clientY - rect.height}px`;
  });
}

function hideContextMenu() {
  contextMenu.classList.remove('active');
  contextTargetId = null;
}

// ──── Events ────
addBtn.addEventListener('click', () => openModal());
modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
btnSave.addEventListener('click', saveShortcut);

inputUrl.addEventListener('keydown', e => { if (e.key === 'Enter') saveShortcut(); });

colorOptions.forEach(opt => {
  opt.addEventListener('click', () => selectColor(opt.dataset.color));
});

ctxEdit.addEventListener('click', () => {
  const id = contextTargetId;
  hideContextMenu();
  if (id) openModal(id);
});
ctxDelete.addEventListener('click', () => {
  const id = contextTargetId;
  hideContextMenu();
  if (id) deleteShortcut(id);
});

document.addEventListener('click',       hideContextMenu);
document.addEventListener('contextmenu', e => { if (!e.target.closest('.shortcut-card')) hideContextMenu(); });
document.addEventListener('keydown',     e => { if (e.key === 'Escape') { closeModal(); hideContextMenu(); } });

// ──── Init ────
loadData();
render();