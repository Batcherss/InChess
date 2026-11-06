window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

window.InChess.ui.evalbar = (function () {
    class EvalBar {
        constructor() {
            this.el = document.createElement('div');
            this.el.id = 'in-evalbar';
            this.blackPart = document.createElement('div');
            this.blackPart.className = 'in-eval-black';
            this.whitePart = document.createElement('div');
            this.whitePart.className = 'in-eval-white';
            this.scoreText = document.createElement('div');
            this.scoreText.className = 'in-eval-score';
            this.scoreText.textContent = '0.0';
            this.el.appendChild(this.blackPart);
            this.el.appendChild(this.whitePart);
            this.el.appendChild(this.scoreText);
            document.body.appendChild(this.el);
            this.visible = false;
            this.score = 0;
            this.getMenu = null;
            const s = document.createElement('style');
            s.textContent = `
      #in-evalbar {
        position: fixed;
        width: 12px;
        background: #121110;
        border-radius: 3px;
        overflow: hidden;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
        border: 1px solid rgba(var(--in-accent-rgb), 0.35);
        z-index: 1000000;
        display: none;
        flex-direction: column;
        pointer-events: none;
      }
      .in-eval-white { background: #f0ece9; width: 100%; transition: height 0.35s cubic-bezier(0.2,0.8,0.2,1); }
      .in-eval-black { background: #1f1d1b; width: 100%; flex-grow: 1; }
      .in-eval-score {
        position: absolute; left: 0; right: 0; text-align: center;
        font-family: ui-monospace, monospace; font-size: 7px; font-weight: 400;
        color: #0a0908; pointer-events: none; z-index: 2;
        text-shadow: 0 0 2px rgba(255,255,255,0.8);
      }
      .in-eval-score.is-dark { color: #f0ece9; text-shadow: 0 0 2px rgba(0,0,0,0.8); }
      `;
            document.head.appendChild(s);
        }
        updatePos() {
            const menu = this.getMenu && this.getMenu();
            if (!menu || !menu.settings || !menu.settings.evalBar) { this.el.style.display = 'none'; return; }
            const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
            if (!board) { this.el.style.display = 'none'; return; }
            const rect = board.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) { this.el.style.display = 'none'; return; }
            let left = rect.left - 18;
            if (left < 4) left = rect.right + 6;
            this.el.style.left = `${left}px`;
            this.el.style.top = `${rect.top}px`;
            this.el.style.height = `${rect.height}px`;
            this.el.style.display = 'flex';
        }
        update(centipawns, isFlipped = false) {
            this.score = centipawns || 0;
            const clamped = Math.max(-2000, Math.min(2000, this.score));
            const whitePercent = 50 + 50 * (2 / (1 + Math.exp(-0.0036 * clamped)) - 1);
            const clampedPercent = Math.max(5, Math.min(95, whitePercent));
            this.el.style.flexDirection = isFlipped ? 'column-reverse' : 'column';
            this.whitePart.style.height = `${clampedPercent}%`;
            let displayVal;
            if (Math.abs(this.score) >= 15000) {
                const mateIn = Math.ceil(Math.abs(25000 - Math.abs(this.score)) / 2);
                displayVal = (this.score > 0 ? '+M' : '-M') + mateIn;
            } else {
                const val = (this.score / 100).toFixed(1);
                displayVal = (this.score > 0 ? '+' : '') + val;
            }
            this.scoreText.textContent = displayVal;
            if (clampedPercent > 50) {
                this.scoreText.style.bottom = '4px';
                this.scoreText.style.top = 'auto';
                this.scoreText.classList.toggle('is-dark', isFlipped);
            } else {
                this.scoreText.style.top = '4px';
                this.scoreText.style.bottom = 'auto';
                this.scoreText.classList.toggle('is-dark', !isFlipped);
            }
            this.updatePos();
        }
        show() { this.visible = true; this.updatePos(); this.el.style.display = 'flex'; }
        hide() { this.visible = false; this.el.style.display = 'none'; }
    }

    return { EvalBar };
})();