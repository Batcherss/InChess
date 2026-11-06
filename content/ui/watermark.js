window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

window.InChess.ui.watermark = (function () {
  class Watermark {
    constructor() {
      this.el = null;
      this.getMenu = null;
      const s = document.createElement('style');
      s.textContent = `
      #in-watermark {
        position: fixed;
        z-index: 1000000;
        display: none;
        align-items: center;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        transition: all 0.3s ease;
      }
      
      #in-watermark.in-wm-style-inroute {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        gap: 10px;
        padding: 6px 18px;
        background: #050505;
        border: 1px solid #1a1a1a;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 300;
        color: #a39e9a;
        white-space: nowrap;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      }
      #in-watermark.in-wm-style-inroute .in-wm-logo { display: inline-block; white-space: nowrap; }
      #in-watermark.in-wm-style-inroute .in-wm-brand {
        color: var(--in-accent);
        font-family: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 400;
        letter-spacing: -0.5px;
        animation: in-wm-pulse 3s infinite ease-in-out;
      }
      #in-watermark.in-wm-style-inroute .in-wm-val { color: #e8e4e1; font-variant-numeric: tabular-nums; }
      #in-watermark.in-wm-style-inroute .in-wm-sep { color: #333; }
      @keyframes in-wm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

      #in-watermark.in-wm-style-rich {
        top: 10px;
        background: #0a0a0a;
        border: 1px solid #222;
        border-radius: 2px;
        padding: 4px 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.8);
        font-size: 12px;
        font-weight: 300;
        color: #fff;
      }
      #in-watermark.in-wm-style-rich.in-wm-left { left: 3px; border-left: 3px solid var(--in-accent); }
      #in-watermark.in-wm-style-rich.in-wm-right { right: 3px; border-right: 3px solid var(--in-accent); border-left: 1px solid #222; }
      #in-watermark.in-wm-style-rich .in-wm-rich-sep { color: #555; margin: 0 4px; font-weight: 400; }
      #in-watermark.in-wm-style-rich .in-wm-rich-logo { color: #fff; }

      #in-watermark.in-wm-style-nursultan {
        top: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #in-watermark.in-wm-style-nursultan.in-wm-left { left: 20px; align-items: flex-start; }
      #in-watermark.in-wm-style-nursultan.in-wm-right { right: 20px; align-items: flex-end; }

      .in-nur-row { display: flex; gap: 8px; }
      .in-nur-box {
        display: flex;
        align-items: center;
        background: #0a0a0a;
        border: 1px solid #1f1f1f;
        border-radius: 8px;
        height: 28px;
        font-size: 11px;
        font-weight: 600;
        color: #e8e4e1;
        overflow: hidden;
      }
      .in-nur-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        height: 100%;
      }
      .in-nur-item + .in-nur-item { border-left: 1px solid #1f1f1f; }
      .in-nur-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--in-accent);
      }
      .in-nur-icon svg { width: 14px; height: 14px; stroke-width: 2.5; }
      .in-nur-mask {
        width: 16px;
        height: 16px;
        background-color: var(--in-accent);
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }

      #in-watermark.in-wm-style-minced {
        top: 10px;
        background: rgba(10, 10, 10, 0.85);
        backdrop-filter: blur(8px);
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }
      #in-watermark.in-wm-style-minced.in-wm-left { left: 10px; }
      #in-watermark.in-wm-style-minced.in-wm-right { right: 10px; }
      
      .in-min-row { display: flex; align-items: center; gap: 12px; }
      .in-min-item { display: flex; align-items: center; gap: 5px; }
      .in-min-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--in-accent);
      }
      .in-min-icon svg { width: 13px; height: 13px; fill: currentColor; }
      .in-min-mask {
        width: 13px;
        height: 13px;
        background-color: var(--in-accent);
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
      }
      `;
      document.head.appendChild(s);
    }

    attach() {
      if (this.el) return;
      this.el = document.createElement('div');
      this.el.id = 'in-watermark';
      document.body.appendChild(this.el);
    }

    update(stats) {
      const menu = this.getMenu && this.getMenu();
      if (!menu) return;
      const s = menu.settings;
      if (!s.watermark) {
        if (this.el) this.el.style.display = 'none';
        return;
      }
      this.attach();
      this.el.style.display = 'flex';

      const style = s.watermarkStyle || 'inroute';
      const pos = s.watermarkPos || 'top-left';

      this.el.className = 'in-wm-style-' + style;
      if (style !== 'inroute') {
        this.el.classList.add(pos === 'top-left' ? 'in-wm-left' : 'in-wm-right');
      }

      const logoUrl = chrome.runtime.getURL('icons/icon128.png');

      const iconMove = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      const iconWin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15l-3 3v-6m3 3l3 3v-6m-6-6h6M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>';
      const iconFn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

      const iconMinMove = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
      const iconMinWin = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
      const iconMinFn = '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>';

      if (style === 'rich') {
        const parts = [`<span class="in-wm-rich-logo">InChess</span>`];
        if (s.watermarkShowFeatures) parts.push(`${stats.featureCount || 0} fn`);
        if (s.watermarkShowMoves) parts.push(`Moves: ${stats.moves || 0}`);
        if (s.watermarkShowWinrate) parts.push(`Winrate: ${stats.winrate || 50}%`);
        this.el.innerHTML = parts.join(' <span class="in-wm-rich-sep">|</span> ');
      }
      else if (style === 'nursultan') {
        let html = '<div class="in-nur-row">';

        html += `<div class="in-nur-box"><div class="in-nur-item"><div class="in-nur-mask" style="-webkit-mask-image: url('${logoUrl}'); mask-image: url('${logoUrl}');"></div>InChess</div></div>`;

        if (s.watermarkShowFeatures || s.watermarkShowMoves || s.watermarkShowWinrate) {
          html += '<div class="in-nur-box">';
          if (s.watermarkShowFeatures) {
            html += `<div class="in-nur-item"><div class="in-nur-icon">${iconFn}</div>${stats.featureCount}fn</div>`;
          }
          if (s.watermarkShowMoves) {
            html += `<div class="in-nur-item"><div class="in-nur-icon">${iconMove}</div>${stats.moves}</div>`;
          }
          if (s.watermarkShowWinrate) {
            html += `<div class="in-nur-item"><div class="in-nur-icon">${iconWin}</div>${stats.winrate}%</div>`;
          }
          html += '</div>';
        }
        html += '</div>';
        this.el.innerHTML = html;
      }
      else if (style === 'minced') {
        let html = '<div class="in-min-row">';

        html += `<div class="in-min-item"><div class="in-min-mask" style="-webkit-mask-image: url('${logoUrl}'); mask-image: url('${logoUrl}');"></div>InChess</div>`;

        if (s.watermarkShowFeatures) {
          html += `<div class="in-min-item"><div class="in-min-icon">${iconMinFn}</div>${stats.featureCount} fn</div>`;
        }
        if (s.watermarkShowMoves) {
          html += `<div class="in-min-item"><div class="in-min-icon">${iconMinMove}</div>${stats.moves}</div>`;
        }
        if (s.watermarkShowWinrate) {
          html += `<div class="in-min-item"><div class="in-min-icon">${iconMinWin}</div>${stats.winrate}%</div>`;
        }

        html += '</div>';
        this.el.innerHTML = html;
      }
      else {
        const parts = [`<span class="in-wm-logo"><span class="in-wm-brand">In</span>Chess</span>`];
        if (s.watermarkShowFeatures) parts.push(`<span class="in-wm-val">${stats.featureCount || 0}</span> fn`);
        if (s.watermarkShowMoves) parts.push(`Moves: <span class="in-wm-val">${stats.moves || 0}</span>`);
        if (s.watermarkShowWinrate) parts.push(`Winrate: <span class="in-wm-val">${stats.winrate || 50}%</span>`);
        this.el.innerHTML = parts.join(' <span class="in-wm-sep">·</span> ');
      }
    }
  }

  return { Watermark };
})();