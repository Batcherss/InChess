const pieceMap = {
  'wp': 'P', 'wr': 'R', 'wn': 'N', 'wb': 'B', 'wq': 'Q', 'wk': 'K',
  'bp': 'p', 'br': 'r', 'bn': 'n', 'bb': 'b', 'bq': 'q', 'bk': 'k'
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}


function detectBoardFlipped(board) {
  if (board.classList.contains('flipped')) return true;

  const coordSvg = board.querySelector('svg.coordinates');
  if (coordSvg) {
    const texts = coordSvg.querySelectorAll('text');
    for (const t of texts) {
      const val = t.textContent.trim();
      if (val === '1') return true;
      if (val === '8') return false;
    }
  }

  const pieces = board.querySelectorAll('.piece');
  for (const p of pieces) {
    const cls = p.className;
    if (/\bwk\b/.test(cls)) {
      const sq = cls.match(/square-(\d)(\d)/);
      if (sq) {
        const rank = parseInt(sq[2]);
        if (rank >= 7) return true;
      }
    }
  }

  return false;
}

function detectTurn(board, grid) {
  const clockSelectors = [
    '.clock-bottom.clock-running',
    '.clock-top.clock-running',
    '.clock-component.clock-bottom.clock-active',
    '.clock-component.clock-top.clock-active',
    '[class*="clock"][class*="active"]',
    '[class*="clock"][class*="running"]',
  ];
  for (const sel of clockSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const cls = el.className || '';
      if (/black/i.test(cls)) return 'b';
      if (/white/i.test(cls)) return 'w';
      if (/bottom/i.test(cls)) {
        return detectBoardFlipped(board) ? 'b' : 'w';
      }
      if (/top/i.test(cls)) {
        return detectBoardFlipped(board) ? 'w' : 'b';
      }
    }
  }

  const playerSelectors = [
    '.player-component.player-bottom.clock-active',
    '.player-component.player-top.clock-active',
    '.player-tagline-component.player-bottom.active',
    '.player-tagline-component.player-top.active',
  ];
  for (const sel of playerSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const cls = el.className || '';
      if (/bottom/i.test(cls)) return detectBoardFlipped(board) ? 'b' : 'w';
      if (/top/i.test(cls)) return detectBoardFlipped(board) ? 'w' : 'b';
    }
  }

  const timerEls = document.querySelectorAll('.clock-time-monospace, .clock-component, [class*="clock-player"]');
  for (const el of timerEls) {
    const parent = el.closest('[class*="player"]') || el;
    const cls = parent.className || '';
    const isActive = /active|running|turn/i.test(cls) || /active|running|turn/i.test(el.className || '');
    if (isActive) {
      if (/black/i.test(cls)) return 'b';
      if (/white/i.test(cls)) return 'w';
      if (/bottom/i.test(cls)) return detectBoardFlipped(board) ? 'b' : 'w';
      if (/top/i.test(cls)) return detectBoardFlipped(board) ? 'w' : 'b';
    }
  }

  const moveList = document.querySelector('.move-list-component, .vertical-move-list, .move-list, [class*="move-list"]');
  if (moveList) {
    const allMoves = moveList.querySelectorAll('.move, .white.node, .black.node, [class*="move-node"], [data-whole-move-number]');
    if (allMoves.length > 0) {
      const last = allMoves[allMoves.length - 1];
      const cls = last.className || '';
      if (/black/i.test(cls)) return 'w';
      if (/white/i.test(cls)) return 'b';
      const parent = last.closest('[class*="move"]');
      if (parent) {
        const whiteNode = parent.querySelector('.white.node, [class*="white"]');
        const blackNode = parent.querySelector('.black.node, [class*="black"]');
        if (blackNode && blackNode.textContent.trim()) return 'w';
        if (whiteNode && whiteNode.textContent.trim() && (!blackNode || !blackNode.textContent.trim())) return 'b';
      }
    }
  }

  const highlights = board.querySelectorAll('.highlight');
  let hList = Array.from(highlights);
  if (board.shadowRoot) {
    hList = hList.concat(Array.from(board.shadowRoot.querySelectorAll('.highlight')));
  }
  if (hList.length >= 2) {
    const last = hList[hList.length - 1];
    const s = (last.className || '').match(/square-(\d)(\d)/);
    if (s) {
      const col = parseInt(s[1]) - 1;
      const row = 8 - parseInt(s[2]);
      if (row >= 0 && row < 8 && col >= 0 && col < 8) {
        const pAt = grid[row][col];
        if (pAt) return (pAt === pAt.toUpperCase()) ? 'b' : 'w';
      }
    }
  }

  let totalPieces = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (grid[r][c]) totalPieces++;
  if (totalPieces === 32) return 'w';

  return 'w';
}

function getFEN() {
  const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
  if (!board) return null;

  const rect = board.getBoundingClientRect();
  const sq = rect.width / 8;
  const isFlipped = detectBoardFlipped(board);
  const grid = Array(8).fill(null).map(() => Array(8).fill(null));

  let pieces = Array.from(board.querySelectorAll('.piece'));
  if (board.shadowRoot) {
    const shadowPieces = board.shadowRoot.querySelectorAll('.piece');
    for (const p of shadowPieces) {
      if (!pieces.includes(p)) pieces.push(p);
    }
  }

  const isDragging = document.querySelector('.dragging, .ghost-piece') || (board.shadowRoot && board.shadowRoot.querySelector('.dragging, .ghost-piece'));
  if (isDragging) return null;

  let count = 0;
  pieces.forEach(p => {
    const style = window.getComputedStyle(p);
    if (style.opacity === '0' || style.display === 'none' || style.visibility === 'hidden') return;

    const pRect = p.getBoundingClientRect();
    const cx = pRect.left + pRect.width / 2;
    const cy = pRect.top + pRect.height / 2;

    if (cx < rect.left - 5 || cx > rect.right + 5 || cy < rect.top - 5 || cy > rect.bottom + 5) return;

    let col = Math.floor((cx - rect.left) / sq);
    let row = Math.floor((cy - rect.top) / sq);

    if (isFlipped) { col = 7 - col; row = 7 - row; }
    
    col = Math.max(0, Math.min(7, col));
    row = Math.max(0, Math.min(7, row));

    const tM = p.className.match(/\b([wb][prnbqk])\b/);
    if (tM) {
      grid[row][col] = pieceMap[tM[1]];
      count++;
    }
  });

  if (count < 2) return null;

  let fen = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0, rS = '';
    for (let c = 0; c < 8; c++) {
      if (!grid[r][c]) empty++;
      else { if (empty) { rS += empty; empty = 0; } rS += grid[r][c]; }
    }
    if (empty) rS += empty;
    fen.push(rS);
  }

  const turn = detectTurn(board, grid);

  return `${fen.join('/')} ${turn} - - 0 1`;
}

class Notifier {
  constructor() { this.container = document.getElementById('in-notifs') || this.create(); }
  create() {
    const el = document.createElement('div');
    el.id = 'in-notifs';
    Object.assign(el.style, { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: '1000000', display: 'flex', flexDirection: 'column-reverse', gap: '8px' });
    document.body.appendChild(el);
    this.inject();
    return el;
  }
  inject() {
    if (document.getElementById('in-styles')) return;
    const s = document.createElement('style');
    s.id = 'in-styles';
    s.textContent = `
    :root { --in-accent: #c23a2b; --in-accent-rgb: 194, 58, 43; }
    #in-notifs *, #in-panel *, #in-menu-btn * { 
      box-sizing: border-box; 
      --in-accent: inherit; 
      --in-accent-rgb: inherit; 
    }
    .in-toast { 
      background: #0a0908; 
      border: 1px solid rgba(var(--in-accent-rgb), 0.25); 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(var(--in-accent-rgb), 0.15); 
      color: #e8e4e1; 
      height: 28px;
      padding: 0 14px; 
      border-radius: 6px; 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      min-width: 200px; 
      transform: translateY(40px); 
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease;
      white-space: nowrap;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 400;
    } 
    .in-toast.show { transform: translateY(0); opacity: 1; } 
    .in-icon { display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; }
    .in-icon svg { width: 100%; height: 100%; }
    .color-success { color: var(--in-accent); fill: var(--in-accent); }
    .color-error { color: var(--in-accent); fill: var(--in-accent); }
    .color-info { color: var(--in-accent); fill: var(--in-accent); }
    .in-spin { width: 12px; height: 12px; border: 1.5px solid rgba(var(--in-accent-rgb), 0.2); border-top-color: var(--in-accent); border-radius: 50%; animation: in-s 0.6s linear infinite; } 
    @keyframes in-s { to { transform: rotate(360deg); } }
    .move-text { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: var(--in-accent); }

    #in-menu-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 42px;
      height: 42px;
      background: #0a0908;
      border: 1px solid rgba(var(--in-accent-rgb), 0.2);
      border-radius: 50%;
      cursor: pointer;
      z-index: 1000002;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 10px rgba(var(--in-accent-rgb), 0.2);
      transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28), border-color 0.3s ease;
      touch-action: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    #in-menu-btn:hover { transform: scale(1.05); border-color: var(--in-accent); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7), 0 0 15px rgba(var(--in-accent-rgb), 0.4); }
    #in-menu-btn .in-logo { 
      width: 20px; 
      height: 20px; 
      background-color: var(--in-accent);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: contain;
      mask-size: contain;
      -webkit-mask-position: center;
      mask-position: center;
      pointer-events: none;
    }

    #in-panel {
      position: fixed;
      width: 180px;
      background: #0a0908;
      border: 1px solid rgba(var(--in-accent-rgb), 0.4);
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 25px rgba(var(--in-accent-rgb), 0.1);
      z-index: 1000001;
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      font-family: 'Inter', sans-serif;
    }
    #in-panel.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

    .in-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #a39e9a; font-size: 10px; }
    .in-row:last-child { margin-bottom: 0; }
    
    .in-switch { position: relative; width: 30px; height: 16px; }
    .in-switch input { opacity: 0; width: 0; height: 0; }
    .in-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #1a1816; transition: .3s; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
    .in-slider:before { position: absolute; content: ""; height: 10px; width: 10px; left: 2px; bottom: 2px; background: #444; transition: .3s; border-radius: 50%; }
    input:checked + .in-slider { background: rgba(var(--in-accent-rgb), 0.13); border-color: rgba(var(--in-accent-rgb), 0.26); }
    input:checked + .in-slider:before { transform: translateX(14px); background: var(--in-accent); }

    .in-range { width: 80px; margin: 0 6px; -webkit-appearance: none; background: #1a1816; height: 3px; border-radius: 2px; outline: none; }
    .in-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: var(--in-accent); cursor: pointer; border: 2px solid #0a0908; }
    .in-range:disabled { opacity: 0.2; cursor: not-allowed; }

    .in-val { color: #e8e4e1; min-width: 20px; text-align: right; font-variant-numeric: tabular-nums; }
    .in-color-pick { display: flex; gap: 4px; }
    .in-color-dot { width: 12px; height: 12px; border-radius: 2px; cursor: pointer; border: 1px solid transparent; }
    .in-color-dot.active { border-color: var(--in-accent); outline: 1px solid var(--in-accent); }

    #row-rnd-range { transition: all 0.3s ease; overflow: hidden; max-height: 0; margin-bottom: 0; opacity: 0; }
    #row-rnd-range.visible { max-height: 60px; margin-bottom: 10px; opacity: 1; }
    .rnd-box { display: flex; flex-direction: column; width: 100%; gap: 4px; }
    .rnd-inputs { display: flex; align-items: center; justify-content: space-between; }

    .in-tag {
      display: inline-flex;
      align-items: center;
      height: 15px;
      padding: 0 6px;
      background: var(--in-accent);
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 3px;
      margin-left: 6px;
      white-space: nowrap;
      overflow: hidden;
      letter-spacing: 0.5px;
    }
    .typing-text::after {
      content: '|';
      animation: blink 0.8s infinite;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    `;
    document.head.appendChild(s);
  }

  show({ type, text, persist = false }) {
    const el = document.createElement('div');
    el.className = 'in-toast';
    
    let iconHTML = '';
    if (type === 'calc') iconHTML = `<div class="in-spin"></div>`;
    else if (type === 'success') iconHTML = `<div class="in-icon color-success"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>`;
    else if (type === 'error') iconHTML = `<div class="in-icon color-error"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg></div>`;
    else if (type === 'info') iconHTML = `<div class="in-icon color-info"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>`;
    
    el.innerHTML = `${iconHTML}<span>${text}</span>`;
    this.container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    if (!persist) setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
    return el;
  }
  clear() { this.container.innerHTML = ''; }
}

class Viz {
  constructor() {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(this.svg.style, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2000' });
  }
  attach(board) {
    if (getComputedStyle(board).position === 'static') board.style.position = 'relative';
    if (!this.svg.parentElement) board.appendChild(this.svg);
  }
  draw(uci, color, opacity = 0.8, isBrill = false) {
    const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
    if (!board || !uci) return;
    this.attach(board);
    
    const rect = board.getBoundingClientRect();
    const sq = rect.width / 8;
    const isFlipped = board.classList.contains('flipped');
    
    const getPos = (u) => {
      let c = u.charCodeAt(0) - 96;
      let r = parseInt(u[1]);
      if (isFlipped) { c = 9 - c; r = 9 - r; }
      return { x: (c - 0.5) * sq, y: (8.5 - r) * sq };
    };

    try {
      const p1 = getPos(uci.substring(0, 2)), p2 = getPos(uci.substring(2, 4));
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
      line.setAttribute("stroke", isBrill ? "#00e5ff" : color); 
      line.setAttribute("stroke-width", isBrill ? 7 : 5);
      line.setAttribute("opacity", isBrill ? 1.0 : opacity); 
      line.setAttribute("stroke-linecap", "round");
      
      const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circ.setAttribute("cx", p2.x); circ.setAttribute("cy", p2.y);
      circ.setAttribute("r", isBrill ? sq/3 : sq/4); 
      circ.setAttribute("fill", "none");
      circ.setAttribute("stroke", isBrill ? "#00e5ff" : color); 
      circ.setAttribute("stroke-width", isBrill ? 4 : 2.5); 
      circ.setAttribute("opacity", isBrill ? 1.0 : opacity);
      
      if (isBrill) {
        line.style.filter = "drop-shadow(0 0 8px #00e5ff)";
        circ.style.filter = "drop-shadow(0 0 8px #00e5ff)";
      }
      
      this.svg.appendChild(line); this.svg.appendChild(circ);
    } catch(e) {}
  }
  clear() { this.svg.innerHTML = ''; }
}

class Menu {
  constructor() {
    this.settings = { auto: false, delay: 1, alts: true, color: '#c23a2b', x: null, y: null, rnd: false, rndMin: 1, rndMax: 3, protect: false };
    this.init();
  }

  updateTheme(color) {
    const rgb = hexToRgb(color);
    const root = document.documentElement;
    root.style.setProperty('--in-accent', color);
    root.style.setProperty('--in-accent-rgb', rgb);
    document.querySelectorAll('#in-notifs, #in-panel, #in-menu-btn').forEach(el => {
      el.style.setProperty('--in-accent', color);
      el.style.setProperty('--in-accent-rgb', rgb);
    });
  }


  async init() {
    const saved = await chrome.storage.local.get('in_sets');
    if (saved.in_sets) Object.assign(this.settings, saved.in_sets);
    this.updateTheme(this.settings.color);
    this.render();
  }

  render() {
    const btn = document.createElement('div');
    btn.id = 'in-menu-btn';
    const logoUrl = chrome.runtime.getURL('icons/icon128.png');
    btn.innerHTML = `<div class="in-logo" style="-webkit-mask-image: url(${logoUrl}); mask-image: url(${logoUrl});"></div>`;
    if (this.settings.x !== null) {
      btn.style.left = this.settings.x + 'px';
      btn.style.top = this.settings.y + 'px';
      btn.style.bottom = 'auto';
      btn.style.right = 'auto';
    }
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'in-panel';
    panel.innerHTML = `
      <div class="in-row">
        <span>Авто-ход</span>
        <label class="in-switch"><input type="checkbox" id="set-auto" ${this.settings.auto ? 'checked' : ''}><span class="in-slider"></span></label>
      </div>
      <div class="in-row">
        <span>Нейм-протект</span>
        <label class="in-switch"><input type="checkbox" id="set-protect" ${this.settings.protect ? 'checked' : ''}><span class="in-slider"></span></label>
      </div>
      <div class="in-row">
        <span>Рандом КД</span>
        <label class="in-switch"><input type="checkbox" id="set-rnd" ${this.settings.rnd ? 'checked' : ''}><span class="in-slider"></span></label>
      </div>
      <div id="row-rnd-range" class="in-row ${this.settings.rnd ? 'visible' : ''}">
        <div class="rnd-box">
          <div class="rnd-inputs">
            <span>Мин:</span>
            <input type="range" id="set-rnd-min" class="in-range" value="${this.settings.rndMin}" min="0.5" max="5" step="0.5">
            <span class="in-val" id="val-rnd-min">${this.settings.rndMin}с</span>
          </div>
          <div class="rnd-inputs">
            <span>Макс:</span>
            <input type="range" id="set-rnd-max" class="in-range" value="${this.settings.rndMax}" min="1" max="10" step="0.5">
            <span class="in-val" id="val-rnd-max">${this.settings.rndMax}с</span>
          </div>
        </div>
      </div>
      <div class="in-row" id="row-delay" style="${this.settings.rnd ? 'display:none' : ''}">
        <span>Задержка</span>
        <input type="range" id="set-delay" class="in-range" value="${this.settings.delay}" min="0.5" max="6" step="0.5">
        <span class="in-val" id="val-delay">${this.settings.delay}с</span>
      </div>
      <div class="in-row">
        <span>Альт. ходы</span>
        <label class="in-switch"><input type="checkbox" id="set-alts" ${this.settings.alts ? 'checked' : ''}><span class="in-slider"></span></label>
      </div>
      <div class="in-row">
        <div class="in-color-pick" id="set-colors">
          <div class="in-color-dot" style="background:#c23a2b" data-c="#c23a2b"></div>
          <div class="in-color-dot" style="background:#3d9a6d" data-c="#3d9a6d"></div>
          <div class="in-color-dot" style="background:#4a7fc2" data-c="#4a7fc2"></div>
          <div class="in-color-dot" style="background:#ff9800" data-c="#ff9800"></div>
          <div class="in-color-dot" style="background:#9c27b0" data-c="#9c27b0"></div>
        </div>
        <span style="font-size:9px; color:#555">InChess v0.2</span>
      </div>
    `;
    document.body.appendChild(panel);

    const updatePanelPos = () => {
      const bR = btn.getBoundingClientRect();
      const pW = panel.offsetWidth || 200, pH = panel.offsetHeight || 100;
      let nx = bR.left + bR.width / 2 - pW / 2;
      let ny = bR.top - pH - 12;
      
      nx = Math.max(10, Math.min(window.innerWidth - pW - 10, nx));
      if (ny < 10) ny = bR.top + bR.height + 12;
      
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
    };

    let startX, startY, initialX, initialY, isMoving = false;
    btn.onpointerdown = (e) => {
      startX = e.clientX; startY = e.clientY;
      const bR = btn.getBoundingClientRect();
      initialX = bR.left; initialY = bR.top;
      btn.setPointerCapture(e.pointerId);
      btn.style.transition = 'none';
      isMoving = false;
    };
    btn.onpointermove = (e) => {
      if (!btn.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!isMoving && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) isMoving = true;
      if (isMoving) {
        let nx = initialX + dx, ny = initialY + dy;
        nx = Math.max(0, Math.min(window.innerWidth - 48, nx));
        ny = Math.max(0, Math.min(window.innerHeight - 48, ny));
        btn.style.left = nx + 'px'; btn.style.top = ny + 'px';
        btn.style.bottom = 'auto'; btn.style.right = 'auto';
        this.settings.x = nx; this.settings.y = ny;
        if (panel.classList.contains('show')) updatePanelPos();
      }
    };
    btn.onpointerup = (e) => {
      btn.releasePointerCapture(e.pointerId);
      btn.style.transition = '';
      if (!isMoving) {
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) setTimeout(updatePanelPos, 0);
      } else {
        chrome.storage.local.set({ in_sets: this.settings });
      }
      isMoving = false;
    };

    document.addEventListener('pointerdown', (e) => {
      if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('show');
      }
    });

    panel.querySelector('#set-auto').onchange = (e) => this.update('auto', e.target.checked);
    panel.querySelector('#set-protect').onchange = (e) => this.update('protect', e.target.checked);
    panel.querySelector('#set-rnd').onchange = (e) => {
      this.update('rnd', e.target.checked);
      panel.querySelector('#row-rnd-range').classList.toggle('visible', e.target.checked);
      panel.querySelector('#row-delay').style.display = e.target.checked ? 'none' : 'flex';
    };
    panel.querySelector('#set-rnd-min').oninput = (e) => {
      let val = parseFloat(e.target.value);
      const max = parseFloat(panel.querySelector('#set-rnd-max').value);
      if (val > max) { val = max; e.target.value = max; }
      panel.querySelector('#val-rnd-min').textContent = val + 'с';
      this.update('rndMin', val);
    };
    panel.querySelector('#set-rnd-max').oninput = (e) => {
      let val = parseFloat(e.target.value);
      const min = parseFloat(panel.querySelector('#set-rnd-min').value);
      if (val < min) { val = min; e.target.value = min; }
      panel.querySelector('#val-rnd-max').textContent = val + 'с';
      this.update('rndMax', val);
    };
    panel.querySelector('#set-delay').oninput = (e) => {
      panel.querySelector('#val-delay').textContent = e.target.value + 'с';
      this.update('delay', parseFloat(e.target.value));
    };

    panel.querySelector('#set-alts').onchange = (e) => this.update('alts', e.target.checked);
    
    const colors = panel.querySelectorAll('.in-color-dot');
    colors.forEach(d => {
      if (d.dataset.c === this.settings.color) d.classList.add('active');
      d.onclick = () => {
        colors.forEach(c => c.classList.remove('active'));
        d.classList.add('active');
        this.updateTheme(d.dataset.c);
        this.update('color', d.dataset.c);
      };
    });
  }

  update(key, val) {
    this.settings[key] = val;
    chrome.storage.local.set({ in_sets: this.settings });
    chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED', settings: this.settings });
  }
}

const notifier = new Notifier();
const viz = new Viz();
const menu = new Menu();
let tT = null;
let isMoving = false;

async function makeMove(uci) {
  if (isMoving) return;
  isMoving = true;
  try {
    const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
  if (!board || !uci) return;
  
  const from = uci.substring(0, 2), to = uci.substring(2, 4);
  const isFlipped = detectBoardFlipped(board);
  const rect = board.getBoundingClientRect();
  const sq = rect.width / 8;
  
  const getCoords = (s) => {
    let c = s.charCodeAt(0) - 96;
    let r = parseInt(s[1]);
    if (isFlipped) { c = 9 - c; r = 9 - r; }
    const offX = (Math.random() - 0.5) * (sq * 0.4);
    const offY = (Math.random() - 0.5) * (sq * 0.4);
    return {
      x: rect.left + (c - 0.5) * sq + offX,
      y: rect.top + (8.5 - r) * sq + offY
    };
  };

  const p1 = getCoords(from), p2 = getCoords(to);
  const dispatch = (type, {x, y}) => {
    board.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, view: window, isTrusted: true,
      pointerId: 1, pointerType: 'mouse',
      clientX: x, clientY: y, buttons: (type === 'pointerdown' || type === 'pointermove') ? 1 : 0
    }));
  };

  dispatch('pointerdown', p1);
  
  const steps = 3 + Math.floor(Math.random() * 3);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const curX = p1.x + (p2.x - p1.x) * t + (Math.random() - 0.5) * 5;
    const curY = p1.y + (p2.y - p1.y) * t + (Math.random() - 0.5) * 5;
    dispatch('pointermove', { x: curX, y: curY });
    await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
  }
  
  dispatch('pointerup', p2);
  } finally {
    isMoving = false;
  }
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'SHOW_NOTIFICATION') {
    if (msg.notifType === 'calc') {
      if (tT) { tT.remove(); tT = null; }
      tT = notifier.show({ type: msg.notifType, text: msg.text, persist: msg.persist });
    } else {
      if (tT) { tT.remove(); tT = null; }
      notifier.show({ type: msg.notifType, text: msg.text, persist: msg.persist });
    }
  } else if (msg.type === 'UPDATE_CALC') {
    if (tT) {
      const span = tT.querySelector('span');
      if (span) span.textContent = msg.text;
    }
  } else if (msg.type === 'DRAW_MOVE') {
    viz.clear();
    const m = msg.moves;
    const sets = menu.settings;
    if (m.best) viz.draw(m.best, sets.color, 0.9, m.isBrill);
    if (sets.alts) {
      if (m.alt1) viz.draw(m.alt1, sets.color, 0.5);
      if (m.alt2) viz.draw(m.alt2, sets.color, 0.3);
    }

  } else if (msg.type === 'AUTO_MOVE') {
    const s = menu.settings;
    const currentFen = getFEN();
    if (msg.sourceFen && currentFen !== msg.sourceFen) {
      console.log('InChess: Skipping AUTO_MOVE - FEN mismatch', { current: currentFen, source: msg.sourceFen });
      return;
    }
    if (isMoving) return;

    const d = s.rnd ? (Math.random() * (s.rndMax - s.rndMin) + s.rndMin) : s.delay;
    notifier.show({ type: 'info', text: `Ходим через ${d.toFixed(1)}с...` });
    setTimeout(() => {
      const finalFen = getFEN();
      if (msg.sourceFen && finalFen !== msg.sourceFen) return;
      makeMove(msg.uci);
    }, d * 1000);
  }

});

let lastF = '';
let stableCount = 0;

const tagData = new Map();
const playerPhrases = [
  "UNSTOPPABLE MASTER", "GENIUS AT WORK", "CALCULATING MAT IN 15", 
  "GODLIKE PRECISION", "BRAIN EXPANDED", "NEURAL NETWORK ACTIVE",
  "FUTURE GRANDMASTER", "100% ACCURACY", "OMEGA BRAIN"
];
const oppPhrases = [
  "BLUNDER MACHINE", "ERROR 404: SKILL NOT FOUND", "WHY EVEN TRY?", 
  "JUST RESIGN ALREADY", "CHESS IS NOT FOR YOU", "EASY VICTORY",
  "CLOWN AT THE BOARD", "MISTAKE FACTORY", "TOTALLY LOST"
];

function applyProtect() {
  const isEnabled = menu.settings.protect;
  const board = document.querySelector('wc-chess-board, .board');
  const isFlipped = board ? detectBoardFlipped(board) : false;
  const logo = chrome.runtime.getURL('icons/icon128.png');

  const rows = document.querySelectorAll('.player-row-component, .player-component, .player-tagline-component, .player-info');
  rows.forEach(row => {
    const nameEl = row.querySelector('[data-test-element="user-tagline-username"], .user-tagline-username, .username');
    if (!nameEl) return;

    const avatar = row.querySelector('.cc-avatar-img, .avatar, [data-cy="avatar"], img[class*="avatar"]');
    let tag = row.querySelector('.in-tag');

    if (isEnabled) {
      if (!nameEl.hasAttribute('data-orig-name')) nameEl.setAttribute('data-orig-name', nameEl.textContent);
      if (nameEl.textContent !== 'InChess') {
        nameEl.textContent = 'InChess';
        nameEl.style.display = 'inline-flex';
        nameEl.style.alignItems = 'center';
      }

      if (avatar) {
        if (!avatar.hasAttribute('data-orig-src')) avatar.setAttribute('data-orig-src', avatar.src);
        if (!avatar.hasAttribute('data-orig-srcset')) avatar.setAttribute('data-orig-srcset', avatar.srcset || "");
        if (avatar.src !== logo) avatar.src = logo;
        if (avatar.srcset) avatar.srcset = "";
      }

      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'in-tag';
        nameEl.after(tag);
      }

      const isBottom = row.id === 'board-layout-player-bottom' || row.closest('#board-layout-player-bottom') || row.classList.contains('player-bottom') || row.closest('.player-bottom');
      const isTop = row.id === 'board-layout-player-top' || row.closest('#board-layout-player-top') || row.classList.contains('player-top') || row.closest('.player-top');
      
      let isActualPlayer = isBottom;
      if (isFlipped) isActualPlayer = isTop;
      if (!isBottom && !isTop) isActualPlayer = row.closest('.player-row-bottom') || row.classList.contains('bottom');

      if (!tagData.has(tag)) {
        const phrases = isActualPlayer ? playerPhrases : oppPhrases;
        const text = phrases[Math.floor(Math.random() * phrases.length)];
        tagData.set(tag, { full: text, current: "", idx: 0, isPlayer: isActualPlayer, state: 'typing', waitStart: 0 });
      }

      const data = tagData.get(tag);
      if (data.state === 'waiting') {
        if (Date.now() - data.waitStart > 4000) data.state = 'deleting';
        return;
      }

      if (data.state === 'typing') {
        if (data.idx < data.full.length) {
          data.current += data.full[data.idx];
          tag.textContent = data.current;
          tag.classList.add('typing-text');
          data.idx++;
          if (data.idx === data.full.length) {
            data.state = 'waiting';
            data.waitStart = Date.now();
            tag.classList.remove('typing-text');
          }
        }
      } else if (data.state === 'deleting') {
        if (data.current.length > 0) {
          data.current = data.current.substring(0, data.current.length - 1);
          tag.textContent = data.current;
          tag.classList.add('typing-text');
        } else {
          const phrases = data.isPlayer ? playerPhrases : oppPhrases;
          let nextText;
          do { nextText = phrases[Math.floor(Math.random() * phrases.length)]; } while (nextText === data.full && phrases.length > 1);
          data.full = nextText;
          data.idx = 0;
          data.state = 'typing';
          tag.classList.remove('typing-text');
        }
      }
    } else {
      if (nameEl.hasAttribute('data-orig-name')) {
        nameEl.textContent = nameEl.getAttribute('data-orig-name');
        nameEl.removeAttribute('data-orig-name');
      }
      if (avatar) {
        if (avatar.hasAttribute('data-orig-src')) {
          avatar.src = avatar.getAttribute('data-orig-src');
          avatar.removeAttribute('data-orig-src');
        }
        if (avatar.hasAttribute('data-orig-srcset')) {
          avatar.srcset = avatar.getAttribute('data-orig-srcset');
          avatar.removeAttribute('data-orig-srcset');
        }
      }
      if (tag) {
        tag.remove();
        tagData.delete(tag);
      }
    }
  });
}


setInterval(applyProtect, 150);

setInterval(() => {
  const f = getFEN();
  if (f && f !== lastF) {
    stableCount++;
    if (stableCount >= 2) {
      lastF = f;
      stableCount = 0;
      viz.clear();
      const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
      const myColor = board ? (detectBoardFlipped(board) ? 'b' : 'w') : 'w';
      
      const oppEl = document.querySelector('.player-top [data-test-element="user-tagline-username"], .player-top .user-tagline-username');
      const oppName = oppEl ? oppEl.textContent.trim() : null;
      
      chrome.runtime.sendMessage({ type: 'BOARD_CHANGED', fen: f, myColor, oppName });
    }
  } else {
    stableCount = 0;
  }
}, 100);