window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

window.InChess.ui.notifier = (function () {
    const ICONS = {
        calc: `<div class="in-spin"></div>`,
        success: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
        error: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`,
        info: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
    };

    const TITLES = {
        calc: 'Analysis',
        success: 'Success',
        error: 'Error',
        info: 'Info'
    };

    class Notifier {
        constructor() {
            const oldIn = document.getElementById('in-notifs');
            const oldCel = document.getElementById('in-notifs-celestial');
            if (oldIn) oldIn.remove();
            if (oldCel) oldCel.remove();
            this.inrouteContainer = this.createInroute();
            this.celestialContainer = this.createCelestial();
            this.getMenu = null;
            this.inject();
        }
        createInroute() {
            const el = document.createElement('div');
            el.id = 'in-notifs';
            Object.assign(el.style, { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: '1000000', display: 'flex', flexDirection: 'column-reverse', gap: '8px', pointerEvents: 'none' });
            document.body.appendChild(el);
            return el;
        }
        createCelestial() {
            const el = document.createElement('div');
            el.id = 'in-notifs-celestial';
            Object.assign(el.style, { position: 'fixed', bottom: '24px', right: '24px', zIndex: '1000000', display: 'flex', flexDirection: 'column-reverse', gap: '6px', pointerEvents: 'none' });
            document.body.appendChild(el);
            return el;
        }
        inject() {
            const old = document.getElementById('in-styles');
            if (old) old.remove();
            const s = document.createElement('style');
            s.id = 'in-styles';
            s.textContent = `
      :root { --in-accent: #c23a2b; --in-accent-rgb: 194, 58, 43; }
      .in-toast {
        background: #0a0908;
        border: 1px solid rgba(var(--in-accent-rgb), 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        color: #e8e4e1;
        height: 26px;
        padding: 0 12px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 200px;
        transform: translateY(40px);
        opacity: 0;
        transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 300;
        pointer-events: auto;
      }
      .in-toast.show { transform: translateY(0); opacity: 1; }
      .in-toast.hide { transform: translateY(-40px); opacity: 0; }
      .in-toast .in-icon { display: flex; align-items: center; justify-content: center; width: 13px; height: 13px; }
      .in-toast .in-icon svg { width: 100%; height: 100%; }
      .in-toast .color-success { color: var(--in-accent); fill: var(--in-accent); }
      .in-toast .color-error { color: var(--in-accent); fill: var(--in-accent); }
      .in-toast .color-info { color: var(--in-accent); fill: var(--in-accent); }

      .in-celestial {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 14px;
        background: #0a0908;
        border-top: 1px solid rgba(var(--in-accent-rgb), 0.25);
        border-bottom: 1px solid rgba(var(--in-accent-rgb), 0.25);
        min-width: 240px;
        max-width: 360px;
        opacity: 0;
        transform: translateX(120%);
        transition: transform 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        pointer-events: auto;
        will-change: transform, opacity;
      }
      .in-celestial.show { opacity: 1; transform: translateX(0); }
      .in-celestial.hide { opacity: 0; transform: translateX(120%); }
      .in-celestial-icon {
        flex-shrink: 0;
        width: 24px; height: 24px;
        display: flex; align-items: center; justify-content: center;
        color: var(--in-accent);
      }
      .in-celestial-icon svg { width: 20px; height: 20px; fill: var(--in-accent); }
      .in-celestial-icon .in-spin { width: 18px; height: 18px; border-width: 2px; }
      .in-celestial-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .in-celestial-title { font-size: 11px; color: #e8e4e1; font-weight: 400; letter-spacing: 0.3px; }
      .in-celestial-desc { font-size: 10px; color: #a39e9a; font-weight: 300; white-space: normal; word-break: break-word; }
      .in-celestial-desc .move-text { color: var(--in-accent); }

      .in-spin { width: 11px; height: 11px; border: 1.2px solid rgba(var(--in-accent-rgb), 0.2); border-top-color: var(--in-accent); border-radius: 50%; animation: in-s 0.6s linear infinite; }
      @keyframes in-s { to { transform: rotate(360deg); } }
      .move-text { font-family: ui-monospace, monospace; font-weight: 400; color: var(--in-accent); }
      `;
            document.head.appendChild(s);
        }

        shouldShow(type) {
            const menu = this.getMenu && this.getMenu();
            if (!menu || !menu.settings) return true;
            const s = menu.settings;
            if (!s.notifEnabled) return false;
            if (type === 'calc' && s.notifCalc === false) return false;
            if (type === 'success' && s.notifSuccess === false) return false;
            if (type === 'error' && s.notifError === false) return false;
            if (type === 'info' && s.notifInfo === false) return false;
            return true;
        }

        show({ type, title, text, persist = false }) {
            if (!this.shouldShow(type)) return null;
            const menu = this.getMenu && this.getMenu();
            const style = (menu && menu.settings && menu.settings.notifStyle) || 'inroute';
            if (style === 'celestial') return this.showCelestial({ type, title, text, persist });
            return this.showInroute({ type, text, persist });
        }

        showInroute({ type, text, persist }) {
            const el = document.createElement('div');
            el.className = 'in-toast';
            el.dataset.style = 'inroute';
            let iconHTML = '';
            if (type === 'calc') iconHTML = `<div class="in-spin"></div>`;
            else if (type === 'success') iconHTML = `<div class="in-icon color-success"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>`;
            else if (type === 'error') iconHTML = `<div class="in-icon color-error"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg></div>`;
            else if (type === 'info') iconHTML = `<div class="in-icon color-info"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>`;
            el.innerHTML = `${iconHTML}<span>${text}</span>`;
            this.inrouteContainer.appendChild(el);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add('show'));
            });

            if (!persist) {
                setTimeout(() => {
                    el.classList.remove('show');
                    setTimeout(() => { if (el.parentNode) el.remove(); }, 450);
                }, 3000);
            }
            return el;
        }

        showCelestial({ type, title, text, persist }) {
            const el = document.createElement('div');
            el.className = 'in-celestial';
            el.dataset.style = 'celestial';
            const mainTitle = title || TITLES[type] || 'InChess';
            const desc = text || '';
            const iconHTML = ICONS[type] || ICONS.info;
            el.innerHTML = `
                <div class="in-celestial-icon">${iconHTML}</div>
                <div class="in-celestial-body">
                    <div class="in-celestial-title">${mainTitle}</div>
                    <div class="in-celestial-desc">${desc}</div>
                </div>
            `;
            this.celestialContainer.appendChild(el);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add('show'));
            });

            if (!persist) {
                setTimeout(() => {
                    el.classList.remove('show');
                    setTimeout(() => { if (el.parentNode) el.remove(); }, 500);
                }, 3000);
            }
            return el;
        }

        updateText(handle, newText) {
            if (!handle) return;
            if (handle.dataset.style === 'celestial') {
                const desc = handle.querySelector('.in-celestial-desc');
                if (desc) desc.innerHTML = newText;
            } else {
                const span = handle.querySelector('span');
                if (span) span.innerHTML = newText;
            }
        }

        clear() {
            this.inrouteContainer.innerHTML = '';
            this.celestialContainer.innerHTML = '';
        }
    }

    return { Notifier, ICONS, TITLES };
})();