window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

window.InChess.ui.menu = (function () {
  const { hexToRgb, rgbToHsv, hsvToRgb, rgbToHex } = window.InChess.ui.theme;

  const ELO_LEVELS = ['auto', '800', '1200', '1600', '2000', '2400', 'unlimited'];
  const ELO_LABELS = ['Авто', '800', '1200', '1600', '2000', '2400', 'Макс'];

  class Menu {
    constructor() {
      this.settings = {
        auto: false, delay: 1, alts: true, thoughts: false, evalBar: false, heatmap: false,
        vo: false, color: '#c23a2b', x: null, y: null, rnd: false, rndMin: 1, rndMax: 3,
        protect: false, detector: true, opacity: 1,
        depth: 'auto', predicts: false,
        playEloEnabled: false, playEloLevel: 6, playElo: 'unlimited',
        arrayList: false, arrayListStyle: 'inroute', arrayListPos: 'top-left', arrayListGlow: false, arrayListRainbow: false, arrayListBrackets: '[]',
        watermark: false, watermarkStyle: 'inroute', watermarkPos: 'top-left', watermarkShowFeatures: true, watermarkShowMoves: true, watermarkShowWinrate: true,
        notifEnabled: true, notifStyle: 'inroute',
        notifCalc: true, notifSuccess: true, notifInfo: true, notifError: true,
        collapsed: false
      };
      this.evalBar = null;
      this.collapsed = false;
      this.hidden = false;
      this.idleTimer = null;
      this.currentTab = 'attack';
      this.expanded = { auto: false, detector: false, al: false, wm: false, notif: false };
      this.init();
    }

    getEloLabel(level) {
      const lvl = level === undefined || level === null ? 6 : level;
      const i = Math.max(0, Math.min(6, parseInt(lvl) || 0));
      return ELO_LABELS[i];
    }

    updateTheme(color) {
      const rgb = hexToRgb(color);
      document.documentElement.style.setProperty('--in-accent', color);
      document.documentElement.style.setProperty('--in-accent-rgb', rgb);
      document.querySelectorAll('#in-notifs, #in-notifs-celestial, #in-app, #in-arraylist, #in-watermark').forEach(el => {
        el.style.setProperty('--in-accent', color);
        el.style.setProperty('--in-accent-rgb', rgb);
      });
    }

    async init() {
      const saved = await chrome.storage.local.get('in_sets');
      if (saved.in_sets) {
        const allowed = ['auto', 'delay', 'alts', 'thoughts', 'evalBar', 'heatmap', 'vo', 'color', 'x', 'y', 'rnd', 'rndMin', 'rndMax', 'protect', 'detector', 'opacity', 'depth', 'predicts', 'playEloEnabled', 'playEloLevel', 'playElo', 'arrayList', 'arrayListStyle', 'arrayListPos', 'arrayListGlow', 'arrayListRainbow', 'arrayListBrackets', 'watermark', 'watermarkStyle', 'watermarkPos', 'watermarkShowFeatures', 'watermarkShowMoves', 'watermarkShowWinrate', 'notifEnabled', 'notifStyle', 'notifCalc', 'notifSuccess', 'notifInfo', 'notifError', 'collapsed'];
        for (const k of allowed) if (saved.in_sets[k] !== undefined) this.settings[k] = saved.in_sets[k];

        if (saved.in_sets.playEloEnabled === undefined) {
          const old = saved.in_sets.playElo || 'unlimited';
          const idx = ELO_LEVELS.indexOf(old);
          if (idx >= 0 && old !== 'unlimited') {
            this.settings.playEloEnabled = true;
            this.settings.playEloLevel = idx;
          } else {
            this.settings.playEloEnabled = false;
            this.settings.playEloLevel = 6;
          }
        }
      }
      this.updateTheme(this.settings.color);
      this.injectStyles();
      this.render();
      if (this.settings.evalBar && this.evalBar) this.evalBar.show();
      if (this.settings.collapsed) this.setCollapsed(true);
    }

    injectStyles() {
      const old = document.getElementById('in-app-styles');
      if (old) old.remove();
      const s = document.createElement('style');
      s.id = 'in-app-styles';
      s.textContent = `
      #in-app *, #in-app *::before, #in-app *::after { box-sizing: border-box; margin: 0; padding: 0; }
      #in-app {
        position: fixed;
        z-index: 1000001;
        width: 600px;
        height: 400px;
        max-width: 92vw;
        max-height: 70vh;
        background: #050505;
        border: 1px solid #1a1a1a;
        border-radius: 10px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.8);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-weight: 300;
        color: #ececec;
        overflow: hidden;
        user-select: none;
        -webkit-font-smoothing: antialiased;
        display: flex;
        flex-direction: column;
        opacity: var(--in-opacity, 1);
        transition: opacity 0.25s ease, width 0.25s cubic-bezier(0.4,0,0.2,1), height 0.25s cubic-bezier(0.4,0,0.2,1), border-radius 0.25s ease;
      }
      #in-app.in-hidden { display: none !important; }
      #in-app.collapsed {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #0a0908;
        opacity: 0.4;
      }
      #in-app.collapsed:hover { opacity: 1; }
      #in-app.collapsed.in-idle { opacity: 0.15; }
      #in-app.collapsed.in-idle:hover { opacity: 1; }
      #in-app.collapsed .in-upper,
      #in-app.collapsed .in-body { opacity: 0; pointer-events: none; }
      #in-app.collapsed .in-collapse-strip { display: flex; }
      #in-app .in-collapse-strip {
        display: none;
        position: absolute;
        inset: 0;
        align-items: center;
        justify-content: center;
        cursor: move;
        color: var(--in-accent);
        transition: color 0.2s;
        touch-action: none;
      }
      #in-app .in-collapse-strip svg { width: 15px; height: 15px; }
      #in-app .in-collapse-strip .in-arrow { animation: in-bounce 1.6s infinite ease-in-out; }
      @keyframes in-bounce {
        0%, 100% { transform: translateY(1px); }
        50% { transform: translateY(-1px); }
      }

      #in-app .in-upper { position: relative; transition: opacity 0.2s ease; flex-shrink: 0; }
      #in-app .in-topbar {
        display: flex;
        align-items: center;
        padding: 10px 14px;
        cursor: move;
        position: relative;
        justify-content: center;
        touch-action: none;
      }
      #in-app .in-tabs-row { display: flex; justify-content: center; }
      #in-app .in-icon-btn {
        width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 4px; cursor: pointer;
        background: transparent; border: none; color: #666;
        transition: color 0.15s; flex-shrink: 0;
      }
      #in-app .in-icon-btn:hover { color: var(--in-accent); }
      #in-app .in-icon-btn svg { width: 14px; height: 14px; }
      #in-app .in-actions {
        display: flex; align-items: center; gap: 2px;
        position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      }

      #in-app .in-tabs {
        position: relative;
        display: flex;
        gap: 2px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        padding: 2px;
        border-radius: 16px;
      }
      #in-app .in-pill {
        position: absolute; top: 2px; left: 2px;
        height: calc(100% - 4px);
        background: var(--in-accent);
        border-radius: 14px;
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1);
        z-index: 1; pointer-events: none;
      }
      #in-app .in-tab {
        position: relative; z-index: 2;
        background: transparent; border: none;
        color: #777; padding: 4px 14px;
        font-family: inherit; font-size: 11px; font-weight: 300;
        cursor: pointer; border-radius: 14px;
        transition: color 0.2s; letter-spacing: 0.5px;
      }
      #in-app .in-tab:hover { color: #ccc; }
      #in-app .in-tab.active { color: #000; font-weight: 400; }

      #in-app .in-body {
        position: relative; flex: 1; overflow: hidden;
        transition: opacity 0.2s ease;
      }
      #in-app .in-pages {
        display: flex; width: 400%; height: 100%;
        transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      }
      #in-app .in-page {
        width: 25%; height: 100%;
        overflow-y: auto; padding: 4px 14px 14px;
        display: flex; flex-direction: column;
      }
      #in-app .in-page::-webkit-scrollbar { width: 4px; }
      #in-app .in-page::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }

      #in-app .in-module { border-bottom: 1px solid #141414; }
      #in-app .in-module:last-child { border-bottom: none; }
      #in-app .in-module-row {
        display: flex; align-items: center; gap: 8px;
        padding: 11px 2px;
        font-size: 12px; color: #d1d1d1; font-weight: 300;
        cursor: default;
      }
      #in-app .in-module-row[data-toggle] { cursor: pointer; }
      #in-app .in-module-row .in-label { flex: 1; }
      #in-app .in-chevron {
        width: 10px; height: 10px; color: #555;
        transition: transform 0.25s ease, color 0.2s;
        flex-shrink: 0;
      }
      #in-app .in-module.expanded .in-chevron { transform: rotate(180deg); color: var(--in-accent); }
      #in-app .in-module-details {
        max-height: 0; overflow: hidden;
        transition: max-height 0.3s ease;
      }
      #in-app .in-module.expanded .in-module-details { max-height: 600px; }
      #in-app .in-details-inner {
        padding: 0 2px 12px;
        display: flex; flex-direction: column; gap: 10px;
      }
      #in-app .in-detail-row {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 11px; color: #888; font-weight: 300; gap: 8px;
      }
      #in-app .in-detail-row .in-label { flex: 1; }
      #in-app .in-hint { font-size: 9px; color: #555; font-weight: 300; margin-left: 4px; }

      #in-app .in-elo-slider-row {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        padding-top: 4px;
      }
      #in-app .in-elo-slider-row .in-range { width: 100%; }
      #in-app .in-elo-labels {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #555;
        font-weight: 300;
        letter-spacing: 0.3px;
        margin-top: 2px;
      }
      #in-app .in-elo-labels .in-elo-cur {
        color: var(--in-accent);
        font-weight: 400;
      }

      #in-app .in-switch { position: relative; width: 28px; height: 15px; flex-shrink: 0; }
      #in-app .in-switch input { opacity: 0; width: 0; height: 0; }
      #in-app .in-slider { position: absolute; cursor: pointer; inset: 0; background: #141414; transition: .2s; border-radius: 20px; border: 1px solid #262626; }
      #in-app .in-slider:before { position: absolute; content: ""; height: 9px; width: 9px; left: 2px; top: 2px; background: #666; transition: .2s; border-radius: 50%; }
      #in-app input:checked + .in-slider { background: var(--in-accent); border-color: var(--in-accent); }
      #in-app input:checked + .in-slider:before { transform: translateX(13px); background: #000; }

      #in-app .in-range { width: 110px; -webkit-appearance: none; appearance: none; background: #141414; height: 2px; border-radius: 1px; outline: none; }
      #in-app .in-range::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: var(--in-accent); cursor: pointer; border: none; }
      #in-app .in-val { color: #888; min-width: 30px; text-align: right; font-variant-numeric: tabular-nums; font-size: 10px; font-weight: 300; }

      #in-app .in-select {
        background: #141414;
        border: 1px solid #262626;
        color: #d1d1d1;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 10px;
        font-weight: 300;
        cursor: pointer;
        outline: none;
      }
      #in-app .in-select:hover { border-color: #333; }
      #in-app .in-select:focus { border-color: var(--in-accent); }
      #in-app .in-select option { background: #0a0908; color: #d1d1d1; }

      #in-app .in-settings-section {
        padding: 8px 2px;
        border-bottom: 1px solid #141414;
      }
      #in-app .in-settings-section:last-child { border-bottom: none; }
      #in-app .in-section-title {
        font-size: 9px; color: #555;
        text-transform: uppercase; letter-spacing: 1.2px;
        margin-bottom: 10px; font-weight: 300;
      }
      #in-app .in-hue {
        position: relative; width: 100%; height: 8px;
        border-radius: 4px; cursor: pointer;
        background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
      }
      #in-app .in-hue-cursor {
        position: absolute; top: 50%;
        width: 12px; height: 12px; border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.6);
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      #in-app .in-color-info {
        display: flex; align-items: center; gap: 8px;
        margin-top: 8px; font-size: 10px; color: #888; font-weight: 300;
      }
      #in-app .in-color-swatch {
        width: 14px; height: 14px; border-radius: 3px;
        border: 1px solid #262626;
      }

      #in-app .in-btn {
        background: transparent;
        border: 1px solid #262626;
        color: #a39e9a;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 10px; font-weight: 300;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s;
        font-family: inherit;
      }
      #in-app .in-btn:hover { border-color: var(--in-accent); color: var(--in-accent); }

      #in-app .in-about {
        font-size: 10px; color: #666;
        line-height: 1.8; font-weight: 300;
      }
      #in-app .in-about strong { color: #aaa; font-weight: 400; }
      `;
      document.head.appendChild(s);
    }

    render() {
      const app = document.createElement('div');
      app.id = 'in-app';
      if (this.settings.x !== null && this.settings.y !== null) {
        const pad = 4;
        const maxX = Math.max(pad, window.innerWidth - 60 - pad);
        const maxY = Math.max(pad, window.innerHeight - 40 - pad);
        const nx = Math.max(pad, Math.min(maxX, this.settings.x));
        const ny = Math.max(pad, Math.min(maxY, this.settings.y));
        app.style.left = nx + 'px';
        app.style.top = ny + 'px';
        this.settings.x = nx;
        this.settings.y = ny;
      } else {
        app.style.right = '20px';
        app.style.bottom = '20px';
      }
      app.style.opacity = this.settings.opacity;

      app.innerHTML = `
        <div class="in-collapse-strip">
          <svg class="in-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="in-upper">
          <div class="in-topbar">
            <div class="in-tabs-row">
              <div class="in-tabs">
                <div class="in-pill"></div>
                <button class="in-tab active" data-tab="attack">Attack</button>
                <button class="in-tab" data-tab="visuals">Visuals</button>
                <button class="in-tab" data-tab="misc">Misc</button>
              </div>
            </div>
            <div class="in-actions">
              <button class="in-icon-btn" id="in-settings-btn" title="Настройки">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              <button class="in-icon-btn" id="in-collapse-btn" title="Свернуть">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="in-body">
          <div class="in-pages">
            <div class="in-page" data-page="attack">${this.renderAttack()}</div>
            <div class="in-page" data-page="visuals">${this.renderVisuals()}</div>
            <div class="in-page" data-page="misc">${this.renderMisc()}</div>
            <div class="in-page" data-page="settings">${this.renderSettings()}</div>
          </div>
        </div>
      `;
      document.body.appendChild(app);
      this.el = app;
      this.bindEvents();
      requestAnimationFrame(() => this.updatePill());
    }

    renderAttack() {
      const s = this.settings;
      const sliderHidden = s.playEloEnabled ? '' : 'style="display: none;"';
      return `
        <div class="in-module ${this.expanded.detector ? 'expanded' : ''}">
          <div class="in-module-row" data-toggle="detector">
            <svg class="in-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            <span class="in-label">Детектор</span>
            <label class="in-switch" onclick="event.stopPropagation()"><input type="checkbox" data-key="detector" ${s.detector ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
          <div class="in-module-details">
            <div class="in-details-inner">
              <div class="in-detail-row">
                <span class="in-label">Глубина</span>
                <select class="in-select" data-key="depth">
                  <option value="auto" ${s.depth === 'auto' ? 'selected' : ''}>Auto</option>
                  <option value="2" ${s.depth === '2' ? 'selected' : ''}>2</option>
                  <option value="3" ${s.depth === '3' ? 'selected' : ''}>3</option>
                  <option value="4" ${s.depth === '4' ? 'selected' : ''}>4</option>
                  <option value="5" ${s.depth === '5' ? 'selected' : ''}>5</option>
                  <option value="6" ${s.depth === '6' ? 'selected' : ''}>6</option>
                  <option value="7" ${s.depth === '7' ? 'selected' : ''}>7</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Предикты <span class="in-hint">может увеличить время сканирования</span></span>
                <label class="in-switch"><input type="checkbox" data-key="predicts" ${s.predicts ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Ограничение Elo <span class="in-hint">имитация слабого игрока</span></span>
                <label class="in-switch"><input type="checkbox" data-key="playEloEnabled" ${s.playEloEnabled ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row in-elo-slider-row" ${sliderHidden}>
                <input type="range" class="in-range" data-key="playEloLevel" min="0" max="6" step="1" value="${s.playEloLevel ?? 6}">
                <div class="in-elo-labels">
                  <span>Авто</span>
                  <span class="in-elo-cur" data-elo-label>${this.getEloLabel(s.playEloLevel)}</span>
                  <span>Макс</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="in-module ${this.expanded.auto ? 'expanded' : ''}" data-module="auto">
          <div class="in-module-row" data-toggle="auto">
            <svg class="in-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            <span class="in-label">Авто-ход</span>
            <label class="in-switch" onclick="event.stopPropagation()"><input type="checkbox" data-key="auto" ${s.auto ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
          <div class="in-module-details">
            <div class="in-details-inner">
              <div class="in-detail-row">
                <span class="in-label">Рандом КД</span>
                <label class="in-switch"><input type="checkbox" data-key="rnd" ${s.rnd ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Мин</span>
                <input type="range" class="in-range" data-key="rndMin" min="0.5" max="5" step="0.5" value="${s.rndMin}">
                <span class="in-val" data-val="rndMin">${s.rndMin}с</span>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Макс</span>
                <input type="range" class="in-range" data-key="rndMax" min="1" max="10" step="0.5" value="${s.rndMax}">
                <span class="in-val" data-val="rndMax">${s.rndMax}с</span>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Задержка</span>
                <input type="range" class="in-range" data-key="delay" min="0.5" max="6" step="0.5" value="${s.delay}">
                <span class="in-val" data-val="delay">${s.delay}с</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    renderVisuals() {
      const s = this.settings;
      return `
        <div class="in-module">
          <div class="in-module-row">
            <span class="in-label">Eval Bar</span>
            <label class="in-switch"><input type="checkbox" data-key="evalBar" ${s.evalBar ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
        </div>
        <div class="in-module">
          <div class="in-module-row">
            <span class="in-label">Тепловая карта</span>
            <label class="in-switch"><input type="checkbox" data-key="heatmap" ${s.heatmap ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
        </div>
        <div class="in-module">
          <div class="in-module-row">
            <span class="in-label">Показ мыслей</span>
            <label class="in-switch"><input type="checkbox" data-key="thoughts" ${s.thoughts ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
        </div>
        <div class="in-module">
          <div class="in-module-row">
            <span class="in-label">Альт. ходы</span>
            <label class="in-switch"><input type="checkbox" data-key="alts" ${s.alts ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
        </div>
        <div class="in-module ${this.expanded.al ? 'expanded' : ''}">
          <div class="in-module-row" data-toggle="al">
            <svg class="in-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            <span class="in-label">Array List</span>
            <label class="in-switch" onclick="event.stopPropagation()"><input type="checkbox" data-key="arrayList" ${s.arrayList ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
          <div class="in-module-details">
            <div class="in-details-inner">
              <div class="in-detail-row">
                <span class="in-label">Стиль</span>
                <select class="in-select" data-key="arrayListStyle">
                  <option value="inroute" ${s.arrayListStyle === 'inroute' ? 'selected' : ''}>Inroute</option>
                  <option value="celestial" ${s.arrayListStyle === 'celestial' ? 'selected' : ''}>Celestial</option>
                  <option value="minced" ${s.arrayListStyle === 'minced' ? 'selected' : ''}>Minced</option>
                  <option value="nursultan" ${s.arrayListStyle === 'nursultan' ? 'selected' : ''}>Nursultan</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Позиция</span>
                <select class="in-select" data-key="arrayListPos">
                  <option value="top-left" ${s.arrayListPos === 'top-left' ? 'selected' : ''}>Слева</option>
                  <option value="top-right" ${s.arrayListPos === 'top-right' ? 'selected' : ''}>Справа</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Скобки</span>
                <select class="in-select" data-key="arrayListBrackets">
                  <option value="[]" ${s.arrayListBrackets === '[]' ? 'selected' : ''}>[ ]</option>
                  <option value="{}" ${s.arrayListBrackets === '{}' ? 'selected' : ''}>{ }</option>
                  <option value="()" ${s.arrayListBrackets === '()' ? 'selected' : ''}>( )</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Glow эффект</span>
                <label class="in-switch"><input type="checkbox" data-key="arrayListGlow" ${s.arrayListGlow ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Переливание</span>
                <label class="in-switch"><input type="checkbox" data-key="arrayListRainbow" ${s.arrayListRainbow ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
            </div>
          </div>
        </div>
        <div class="in-module ${this.expanded.wm ? 'expanded' : ''}">
          <div class="in-module-row" data-toggle="wm">
            <svg class="in-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            <span class="in-label">Watermark</span>
            <label class="in-switch" onclick="event.stopPropagation()"><input type="checkbox" data-key="watermark" ${s.watermark ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
          <div class="in-module-details">
            <div class="in-details-inner">
              <div class="in-detail-row">
                <span class="in-label">Стиль</span>
                <select class="in-select" data-key="watermarkStyle">
                  <option value="inroute" ${s.watermarkStyle === 'inroute' ? 'selected' : ''}>Inroute</option>
                  <option value="rich" ${s.watermarkStyle === 'rich' ? 'selected' : ''}>Rich</option>
                  <option value="nursultan" ${s.watermarkStyle === 'nursultan' ? 'selected' : ''}>Nursultan</option>
                  <option value="minced" ${s.watermarkStyle === 'minced' ? 'selected' : ''}>Minced</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Позиция</span>
                <select class="in-select" data-key="watermarkPos">
                  <option value="top-left" ${s.watermarkPos === 'top-left' ? 'selected' : ''}>Слева</option>
                  <option value="top-right" ${s.watermarkPos === 'top-right' ? 'selected' : ''}>Справа</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Показывать функций</span>
                <label class="in-switch"><input type="checkbox" data-key="watermarkShowFeatures" ${s.watermarkShowFeatures ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Показывать ходы</span>
                <label class="in-switch"><input type="checkbox" data-key="watermarkShowMoves" ${s.watermarkShowMoves ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Показывать винрейт</span>
                <label class="in-switch"><input type="checkbox" data-key="watermarkShowWinrate" ${s.watermarkShowWinrate ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
            </div>
          </div>
        </div>
        <div class="in-module ${this.expanded.notif ? 'expanded' : ''}">
          <div class="in-module-row" data-toggle="notif">
            <svg class="in-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            <span class="in-label">Notifications</span>
            <label class="in-switch" onclick="event.stopPropagation()"><input type="checkbox" data-key="notifEnabled" ${s.notifEnabled ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
          <div class="in-module-details">
            <div class="in-details-inner">
              <div class="in-detail-row">
                <span class="in-label">Стиль</span>
                <select class="in-select" data-key="notifStyle">
                  <option value="inroute" ${s.notifStyle === 'inroute' ? 'selected' : ''}>Inroute</option>
                  <option value="celestial" ${s.notifStyle === 'celestial' ? 'selected' : ''}>Celestial</option>
                </select>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Calc (анализ)</span>
                <label class="in-switch"><input type="checkbox" data-key="notifCalc" ${s.notifCalc ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Success</span>
                <label class="in-switch"><input type="checkbox" data-key="notifSuccess" ${s.notifSuccess ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Info</span>
                <label class="in-switch"><input type="checkbox" data-key="notifInfo" ${s.notifInfo ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
              <div class="in-detail-row">
                <span class="in-label">Error</span>
                <label class="in-switch"><input type="checkbox" data-key="notifError" ${s.notifError ? 'checked' : ''}><span class="in-slider"></span></label>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    renderMisc() {
      const s = this.settings;
      return `
        <div class="in-module">
          <div class="in-module-row">
            <span class="in-label">VO Озвучка</span>
            <label class="in-switch"><input type="checkbox" data-key="vo" ${s.vo ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
        </div>
        <div class="in-module">
          <div class="in-module-row">
            <span class="in-label">Name Protect</span>
            <label class="in-switch"><input type="checkbox" data-key="protect" ${s.protect ? 'checked' : ''}><span class="in-slider"></span></label>
          </div>
        </div>
      `;
    }

    renderSettings() {
      const [h] = rgbToHsv(
        parseInt(this.settings.color.slice(1, 3), 16),
        parseInt(this.settings.color.slice(3, 5), 16),
        parseInt(this.settings.color.slice(5, 7), 16)
      );
      return `
        <div class="in-settings-section">
          <div class="in-section-title">Акцент</div>
          <div class="in-hue" data-hue>
            <div class="in-hue-cursor" data-hue-cursor style="left:${h * 100}%;"></div>
          </div>
          <div class="in-color-info">
            <div class="in-color-swatch" data-swatch style="background:${this.settings.color};"></div>
            <span data-color-hex>${this.settings.color}</span>
          </div>
        </div>
        <div class="in-settings-section">
          <div class="in-section-title">Прозрачность</div>
          <div class="in-detail-row">
            <span class="in-label">Окно</span>
            <input type="range" class="in-range" data-key="opacity" min="0.3" max="1" step="0.05" value="${this.settings.opacity}">
            <span class="in-val" data-val="opacity">${Math.round(this.settings.opacity * 100)}%</span>
          </div>
        </div>
        <div class="in-settings-section">
          <div class="in-section-title">Сброс</div>
          <button class="in-btn" id="in-reset-btn">Сбросить все настройки</button>
        </div>
        <div class="in-settings-section">
          <div class="in-section-title">О плагине</div>
          <div class="in-about">
            <div><strong>InChess</strong> v0.5.0</div>
            <div>Разработчик: <strong>Verno</strong></div>
          </div>
        </div>
      `;
    }

    bindEvents() {
      const app = this.el;
      const pagesEl = app.querySelector('.in-pages');
      const tabs = app.querySelectorAll('.in-tab');

      const tabOrder = ['attack', 'visuals', 'misc', 'settings'];

      const switchTab = (name) => {
        if (name === this.currentTab) return;
        this.currentTab = name;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        const idx = tabOrder.indexOf(name);
        pagesEl.style.transform = `translateX(${-idx * 25}%)`;
        this.updatePill();
      };

      tabs.forEach(t => {
        t.onclick = (e) => { e.stopPropagation(); switchTab(t.dataset.tab); };
      });

      app.querySelector('#in-settings-btn').onclick = (e) => {
        e.stopPropagation();
        switchTab('settings');
      };

      app.querySelector('#in-collapse-btn').onclick = (e) => {
        e.stopPropagation();
        this.setCollapsed(true);
      };

      app.querySelector('.in-collapse-strip').onclick = (e) => {
        if (e.target.closest('.in-collapse-strip') && !this._didDrag) {
          this.setCollapsed(false);
        }
      };

      let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0, lastMoveT = 0;
      this._didDrag = false;

      const clampPos = (nx, ny) => {
        const r = app.getBoundingClientRect();
        const pad = 4;
        const maxX = Math.max(pad, window.innerWidth - r.width - pad);
        const maxY = Math.max(pad, window.innerHeight - r.height - pad);
        return [Math.max(pad, Math.min(maxX, nx)), Math.max(pad, Math.min(maxY, ny))];
      };

      const onDown = (e) => {
        if (e.target.closest('.in-tab') || e.target.closest('.in-icon-btn') || e.target.closest('.in-switch') || e.target.closest('input') || e.target.closest('select')) return;
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        dragging = true;
        this._didDrag = false;
        startX = e.clientX; startY = e.clientY;
        const r = app.getBoundingClientRect();
        origX = r.left; origY = r.top;
        app.style.left = origX + 'px';
        app.style.top = origY + 'px';
        app.style.right = 'auto';
        app.style.bottom = 'auto';
        lastMoveT = 0;
        if (e.pointerType === 'touch') {
          try { e.target.setPointerCapture(e.pointerId); } catch (_) { }
        }
        e.preventDefault();
      };

      const onMove = (e) => {
        if (!dragging) return;
        const now = performance.now();
        if (now - lastMoveT < 8) return;
        lastMoveT = now;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this._didDrag = true;
        const [nx, ny] = clampPos(origX + dx, origY + dy);
        app.style.left = nx + 'px';
        app.style.top = ny + 'px';
        this.settings.x = nx;
        this.settings.y = ny;
        if (e.cancelable) e.preventDefault();
      };

      const finishDrag = (save) => {
        if (!dragging) return;
        dragging = false;
        const r = app.getBoundingClientRect();
        const [nx, ny] = clampPos(r.left, r.top);
        if (nx !== r.left || ny !== r.top) {
          app.style.left = nx + 'px';
          app.style.top = ny + 'px';
          this.settings.x = nx;
          this.settings.y = ny;
        }
        if (this._didDrag) this.save();
        setTimeout(() => { this._didDrag = false; }, 60);
      };

      const onUp = () => finishDrag(true);
      const onCancel = () => finishDrag(true);

      const strip = app.querySelector('.in-collapse-strip');
      strip.addEventListener('pointerdown', onDown);
      app.querySelector('.in-topbar').addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('touchmove', (e) => {
        if (dragging && e.cancelable) e.preventDefault();
      }, { passive: false });

      app.addEventListener('mousemove', () => {
        if (this.collapsed) {
          this.el.classList.remove('in-idle');
          this.startIdleTimer();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'i' || e.key === 'I' || e.code === 'KeyI')) {
          e.preventDefault();
          this.toggleHidden();
        }
      });

      app.querySelectorAll('[data-toggle]').forEach(row => {
        row.onclick = (e) => {
          if (e.target.closest('.in-switch') || e.target.closest('input') || e.target.closest('select')) return;
          const key = row.dataset.toggle;
          this.expanded[key] = !this.expanded[key];
          row.closest('.in-module').classList.toggle('expanded', this.expanded[key]);
        };
      });

      app.querySelectorAll('input[type="checkbox"][data-key]').forEach(inp => {
        inp.onchange = () => {
          const key = inp.dataset.key;
          this.update(key, inp.checked);
          if (key === 'evalBar' && this.evalBar) {
            if (inp.checked) this.evalBar.show();
            else this.evalBar.hide();
          }
          if (key === 'thoughts' && !inp.checked) window.InChess.ui.viz.clearThought();
          if (key === 'heatmap' && !inp.checked) window.InChess.ui.viz.clearHeatmap();
          if (key === 'arrayList' && !inp.checked) {
            const al = document.getElementById('in-arraylist');
            if (al) al.style.display = 'none';
          }
          if (key === 'watermark' && !inp.checked) {
            const wm = document.getElementById('in-watermark');
            if (wm) wm.style.display = 'none';
          }
          if (key === 'playEloEnabled') {
            const row = app.querySelector('.in-elo-slider-row');
            if (row) row.style.display = inp.checked ? 'flex' : 'none';
          }
        };
      });

      app.querySelectorAll('select[data-key]').forEach(sel => {
        sel.onchange = () => {
          const key = sel.dataset.key;
          this.update(key, sel.value);
        };
      });

      app.querySelectorAll('input[type="range"][data-key]').forEach(inp => {
        inp.oninput = () => {
          const key = inp.dataset.key;
          const val = parseFloat(inp.value);

          if (key === 'playEloLevel') {
            const level = parseInt(inp.value);
            this.settings.playEloLevel = level;
            this.settings.playElo = ELO_LEVELS[level] || 'unlimited';
            const lbl = app.querySelector('[data-elo-label]');
            if (lbl) lbl.textContent = this.getEloLabel(level);
            this.save();
            return;
          }

          this.update(key, val);
          const valEl = app.querySelector(`[data-val="${key}"]`);
          if (valEl) {
            if (key === 'opacity') valEl.textContent = Math.round(val * 100) + '%';
            else valEl.textContent = val + 'с';
          }
          if (key === 'opacity') app.style.opacity = val;
          if (key === 'rndMin' || key === 'rndMax') {
            if (this.settings.rndMin > this.settings.rndMax) {
              this.settings.rndMax = this.settings.rndMin;
              const maxEl = app.querySelector('input[data-key="rndMax"]');
              const maxVal = app.querySelector('[data-val="rndMax"]');
              if (maxEl) maxEl.value = this.settings.rndMax;
              if (maxVal) maxVal.textContent = this.settings.rndMax + 'с';
            }
          }
        };
      });

      app.querySelector('#in-reset-btn').onclick = () => {
        if (!confirm('Сбросить все настройки?')) return;
        chrome.storage.local.remove('in_sets');
        location.reload();
      };

      const hue = app.querySelector('[data-hue]');
      const hueCursor = app.querySelector('[data-hue-cursor]');
      const swatch = app.querySelector('[data-swatch]');
      const hexEl = app.querySelector('[data-color-hex]');

      let hsv = rgbToHsv(
        parseInt(this.settings.color.slice(1, 3), 16),
        parseInt(this.settings.color.slice(3, 5), 16),
        parseInt(this.settings.color.slice(5, 7), 16)
      );

      const applyHue = (save) => {
        const [r, g, b] = hsvToRgb(hsv[0], 1, 1);
        const hex = rgbToHex(r, g, b);
        this.settings.color = hex;
        this.updateTheme(hex);
        swatch.style.background = hex;
        hexEl.textContent = hex;
        hueCursor.style.left = (hsv[0] * 100) + '%';
        if (save) this.save();
      };

      const hueMove = (e) => {
        const r = hue.getBoundingClientRect();
        let x = (e.clientX - r.left) / r.width;
        x = Math.max(0, Math.min(1, x));
        hsv[0] = x;
        applyHue(false);
      };

      let hueDown = false;
      hue.addEventListener('pointerdown', (e) => {
        hueDown = true;
        hue.setPointerCapture(e.pointerId);
        hueMove(e);
      });
      hue.addEventListener('pointermove', (e) => { if (hueDown) hueMove(e); });
      hue.addEventListener('pointerup', () => { hueDown = false; applyHue(true); });
    }

    updatePill() {
      const app = this.el;
      if (!app) return;
      const activeTab = app.querySelector('.in-tab.active');
      const pill = app.querySelector('.in-pill');
      if (!activeTab || !pill) return;
      pill.style.width = activeTab.offsetWidth + 'px';
      pill.style.transform = `translateX(${activeTab.offsetLeft - 2}px)`;
    }

    setCollapsed(v) {
      if (!this.el) return;
      if (this.settings.collapsed !== v) {
        this.settings.collapsed = v;
        this.save();
      }
      this.collapsed = v;
      this.el.classList.toggle('collapsed', v);
      if (v) this.startIdleTimer();
      else { this.stopIdleTimer(); this.el.classList.remove('in-idle'); }

      const app = this.el;
      const pad = 4;
      const FULL_W = Math.min(600, Math.floor(window.innerWidth * 0.92));
      const FULL_H = Math.min(400, Math.floor(window.innerHeight * 0.70));

      const before = app.getBoundingClientRect();

      if (!v) {
        let nx = before.left;
        let ny = before.top;
        let dirX = 0;
        let dirY = 0;

        if (nx + FULL_W > window.innerWidth - pad) {
          nx = window.innerWidth - FULL_W - pad;
          dirX = +1;
        }
        nx = Math.max(pad, nx);

        if (ny + FULL_H > window.innerHeight - pad) {
          ny = window.innerHeight - FULL_H - pad;
          dirY = +1;
        }
        ny = Math.max(pad, ny);

        app.style.right = 'auto';
        app.style.bottom = 'auto';
        app.style.left = nx + 'px';
        app.style.top = ny + 'px';
        this.settings.x = nx;
        this.settings.y = ny;
        this.save();
        const distX = dirX * (FULL_W * 0.6);
        const distY = dirY * (FULL_H * 0.6);

        if (distX !== 0 || distY !== 0) {
          app.animate(
            [
              { transform: `translate(${distX}px, ${distY}px)`, opacity: 0.2 },
              { transform: 'translate(0, 0)', opacity: 1 }
            ],
            {
              duration: 320,
              easing: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
              fill: 'none'
            }
          );
        } else {
          app.animate(
            [
              { transform: 'scale(0.92)', opacity: 0.6 },
              { transform: 'scale(1)', opacity: 1 }
            ],
            {
              duration: 260,
              easing: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
              fill: 'none'
            }
          );
        }
      } else {
        const CIRCLE = 40;
        const maxX = Math.max(pad, window.innerWidth - CIRCLE - pad);
        const maxY = Math.max(pad, window.innerHeight - CIRCLE - pad);
        const nx = Math.max(pad, Math.min(maxX, before.left));
        const ny = Math.max(pad, Math.min(maxY, before.top));

        if (nx !== before.left || ny !== before.top) {
          app.style.right = 'auto';
          app.style.bottom = 'auto';
          app.style.left = nx + 'px';
          app.style.top = ny + 'px';
          this.settings.x = nx;
          this.settings.y = ny;
          this.save();
        }
      }
    }

    startIdleTimer() {
      this.stopIdleTimer();
      this.idleTimer = setTimeout(() => {
        if (this.collapsed && !this.hidden) this.el.classList.add('in-idle');
      }, 4000);
    }

    stopIdleTimer() {
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    }

    toggleHidden() {
      if (!this.el) return;
      this.hidden = !this.hidden;
      this.el.classList.toggle('in-hidden', this.hidden);
      if (this.hidden) this.stopIdleTimer();
      else if (this.collapsed) this.startIdleTimer();
    }

    save() {
      chrome.storage.local.set({ in_sets: this.settings });
      chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED', settings: this.settings });
    }

    update(key, val) {
      this.settings[key] = val;
      this.save();
    }
  }

  return { Menu };
})();