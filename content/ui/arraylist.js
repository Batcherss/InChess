window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

window.InChess.ui.arraylist = (function () {
  class ArrayList {
    constructor() {
      this.el = null;
      this.getMenu = null;
      this.lastSignature = '';
      this.items = new Map();
      this.lastStyle = null;
      this.lastPos = null;
      const s = document.createElement('style');
      s.textContent = `
      #in-arraylist {
        position: fixed;
        z-index: 1000000;
        display: none;
        flex-direction: column;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #in-arraylist.in-style-inroute {
        gap: 0;
        font-size: 13px;
        font-weight: 300;
        color: #e8e4e1;
        padding: 4px 6px;
      }
      #in-arraylist.in-style-inroute.in-al-left { align-items: flex-start; }
      #in-arraylist.in-style-inroute.in-al-right { align-items: flex-end; }

      #in-arraylist.in-style-inroute .in-al-item {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transform: translateX(-14px);
        padding: 0 2px;
        transition:
          max-height 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          padding 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          opacity 0.28s ease,
          transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
        will-change: max-height, opacity, transform;
      }
      #in-arraylist.in-style-inroute.in-al-right .in-al-item { transform: translateX(14px); }

      #in-arraylist.in-style-inroute .in-al-item.show {
        max-height: 40px;
        padding: 2px 2px;
        opacity: 1;
        transform: translateX(0);
      }
      #in-arraylist.in-style-inroute .in-al-item.removing {
        max-height: 0;
        padding: 0 2px;
        opacity: 0;
        transform: translateX(-14px);
      }
      #in-arraylist.in-style-inroute.in-al-right .in-al-item.removing { transform: translateX(14px); }

      #in-arraylist.in-style-inroute .in-al-name { color: #e8e4e1; }
      #in-arraylist.in-style-inroute .in-al-set { color: #7a7570; }
      #in-arraylist.in-style-inroute.in-al-glow .in-al-item { text-shadow: 0 0 8px var(--in-accent), 0 0 16px rgba(var(--in-accent-rgb), 0.6); }
      #in-arraylist.in-style-inroute.in-al-rainbow .in-al-name {
        background: linear-gradient(90deg, var(--in-accent), rgba(var(--in-accent-rgb), 0.35), var(--in-accent));
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: in-al-rb 3s linear infinite;
      }

      #in-arraylist.in-style-celestial {
        gap: 0;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        padding: 0;
        line-height: 1.2;
      }
      #in-arraylist.in-style-celestial.in-al-left { align-items: flex-start; }
      #in-arraylist.in-style-celestial.in-al-right { align-items: flex-end; }

      #in-arraylist.in-style-celestial .in-al-item {
        background: var(--in-accent);
        max-height: 0;
        padding: 0 6px;
        overflow: hidden;
        opacity: 0;
        transform: translateX(-14px);
        text-shadow: 1px 1px 0 rgba(0,0,0,0.4);
        transition:
          max-height 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          padding 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          opacity 0.28s ease,
          transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
        will-change: max-height, opacity, transform;
      }
      #in-arraylist.in-style-celestial.in-al-right .in-al-item { transform: translateX(14px); }

      #in-arraylist.in-style-celestial .in-al-item.show {
        max-height: 40px;
        padding: 2px 6px;
        opacity: 1;
        transform: translateX(0);
      }
      #in-arraylist.in-style-celestial .in-al-item.removing {
        max-height: 0;
        padding: 0 6px;
        opacity: 0;
        transform: translateX(-14px);
      }
      #in-arraylist.in-style-celestial.in-al-right .in-al-item.removing { transform: translateX(14px); }

      #in-arraylist.in-style-celestial .in-al-name { color: #fff; }
      #in-arraylist.in-style-celestial .in-al-set { color: rgba(255,255,255,0.7); font-weight: 400; }
      #in-arraylist.in-style-celestial.in-al-glow .in-al-item { box-shadow: 0 0 8px var(--in-accent); }
      #in-arraylist.in-style-celestial.in-al-rainbow .in-al-item {
        background: linear-gradient(90deg, var(--in-accent), rgba(var(--in-accent-rgb), 0.5), var(--in-accent));
        background-size: 200% 100%;
        animation: in-al-rb-bg 3s linear infinite;
      }

      #in-arraylist.in-style-minced {
        gap: 0px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        padding: 0;
      }
      #in-arraylist.in-style-minced.in-al-left { align-items: flex-start; }
      #in-arraylist.in-style-minced.in-al-right { align-items: flex-end; }

      #in-arraylist.in-style-minced .in-al-item {
        display: flex;
        gap: 6px;
        background: rgba(10, 10, 10, 0.75);
        backdrop-filter: blur(8px);
        border-radius: 3px;
        border: 1px solid rgba(255,255,255,0.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        max-height: 0;
        padding: 0 8px;
        opacity: 0;
        overflow: hidden;
        transform: translateX(-10px);
        transition:
          max-height 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          padding 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          opacity 0.28s ease,
          transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
        will-change: max-height, opacity, transform;
      }
      #in-arraylist.in-style-minced.in-al-right .in-al-item { transform: translateX(10px); }

      #in-arraylist.in-style-minced .in-al-item.show {
        max-height: 30px;
        padding: 4px 8px;
        opacity: 1;
        transform: translateX(0);
      }
      #in-arraylist.in-style-minced .in-al-item.removing {
        max-height: 0;
        padding: 0 8px;
        opacity: 0;
        transform: translateX(-10px);
      }
      #in-arraylist.in-style-minced.in-al-right .in-al-item.removing { transform: translateX(10px); }

      #in-arraylist.in-style-minced .in-al-name { color: #a39e9a; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
      #in-arraylist.in-style-minced .in-al-set { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
      
      #in-arraylist.in-style-minced.in-al-glow .in-al-item { box-shadow: 0 0 8px var(--in-accent); }
      #in-arraylist.in-style-minced.in-al-rainbow .in-al-set {
        background: linear-gradient(90deg, var(--in-accent), rgba(var(--in-accent-rgb), 0.35), var(--in-accent));
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: in-al-rb 3s linear infinite;
      }

      #in-arraylist.in-style-nursultan {
        gap: 0px;
        font-size: 11px;
        font-weight: 600;
        color: #e8e4e1;
        padding: 0;
      }
      #in-arraylist.in-style-nursultan.in-al-left { align-items: flex-start; }
      #in-arraylist.in-style-nursultan.in-al-right { align-items: flex-end; }

      #in-arraylist.in-style-nursultan .in-al-item {
        display: flex;
        gap: 6px;
        background: #0a0a0a;
        border-radius: 4px;
        border: 1px solid #1f1f1f;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        max-height: 0;
        padding: 0 10px;
        opacity: 0;
        overflow: hidden;
        transform: translateX(-10px);
        transition:
          max-height 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          padding 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
          opacity 0.28s ease,
          transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
        will-change: max-height, opacity, transform;
      }
      #in-arraylist.in-style-nursultan.in-al-right .in-al-item { transform: translateX(10px); }

      #in-arraylist.in-style-nursultan .in-al-item.show {
        max-height: 30px;
        padding: 5px 10px;
        opacity: 1;
        transform: translateX(0);
      }
      #in-arraylist.in-style-nursultan .in-al-item.removing {
        max-height: 0;
        padding: 0 10px;
        opacity: 0;
        transform: translateX(-10px);
      }
      #in-arraylist.in-style-nursultan.in-al-right .in-al-item.removing { transform: translateX(10px); }

      #in-arraylist.in-style-nursultan .in-al-name { color: #a39e9a; }
      #in-arraylist.in-style-nursultan .in-al-set { color: #e8e4e1; }
      
      #in-arraylist.in-style-nursultan.in-al-glow .in-al-item { border-color: var(--in-accent); }
      #in-arraylist.in-style-nursultan.in-al-rainbow .in-al-set {
        background: linear-gradient(90deg, var(--in-accent), rgba(var(--in-accent-rgb), 0.35), var(--in-accent));
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: in-al-rb 3s linear infinite;
      }

      @keyframes in-al-rb { to { background-position: 200% 0; } }
      @keyframes in-al-rb-bg { to { background-position: 200% 0; } }
      `;
      document.head.appendChild(s);
    }

    attach() {
      if (this.el) return;
      this.el = document.createElement('div');
      this.el.id = 'in-arraylist';
      document.body.appendChild(this.el);
    }
    updatePos(s) {
      if (!this.el) return;
      const pos = s.arrayListPos || 'top-left';
      const wmPos = s.watermarkPos || 'top-left';
      const sameSide = (pos === 'top-left' && wmPos === 'top-left') || (pos === 'top-right' && wmPos === 'top-right');

      if (s.watermark && sameSide && s.watermarkStyle !== 'inroute') {
        const wm = document.getElementById('in-watermark');
        if (wm && wm.style.display !== 'none') {
          const rect = wm.getBoundingClientRect();
          this.el.style.top = (rect.bottom + 12) + 'px';
          this.el.style.left = pos === 'top-left' ? (s.watermarkStyle === 'nursultan' ? '20px' : (s.watermarkStyle === 'minced' ? '10px' : '3px')) : '';
          this.el.style.right = pos === 'top-right' ? (s.watermarkStyle === 'nursultan' ? '20px' : (s.watermarkStyle === 'minced' ? '10px' : '3px')) : '';
        } else {
          this.el.style.top = '50px';
          this.el.style.left = pos === 'top-left' ? '10px' : '';
          this.el.style.right = pos === 'top-right' ? '10px' : '';
        }
      } else {
        this.el.style.top = '10px';
        this.el.style.left = pos === 'top-left' ? '10px' : '';
        this.el.style.right = pos === 'top-right' ? '10px' : '';
      }
    }

    buildItems(s) {
      const br = s.arrayListBrackets || '[]';
      const open = br[0], close = br[1];

      const items = [];
      if (s.detector) {
        const d = s.depth === 'auto' ? 'auto' : s.depth + 'd';
        items.push({ name: 'Detector', set: `${open}${d}${close}` });
      }
      if (s.predicts) items.push({ name: 'Predicts', set: '' });
      if (s.auto) {
        const t = s.rnd ? `${s.rndMin}-${s.rndMax}s` : `${s.delay}s`;
        items.push({ name: 'Auto', set: `${open}${t}${close}` });
      }
      if (s.alts) items.push({ name: 'Alts', set: '' });
      if (s.thoughts) items.push({ name: 'Thoughts', set: '' });
      if (s.evalBar) items.push({ name: 'EvalBar', set: '' });
      if (s.heatmap) items.push({ name: 'Heatmap', set: '' });
      if (s.vo) items.push({ name: 'VO', set: '' });
      if (s.protect) items.push({ name: 'Protect', set: '' });
      if (s.watermark) items.push({ name: 'Watermark', set: '' });
      if (s.notifEnabled) items.push({ name: 'Notifs', set: `${open}${s.notifStyle}${close}` });

      items.sort((a, b) => {
        const lenA = a.name.length + a.set.length;
        const lenB = b.name.length + b.set.length;
        return lenB - lenA;
      });

      return items;
    }

    createItemEl(item) {
      const el = document.createElement('div');
      el.className = 'in-al-item';
      el.dataset.name = item.name;
      el.innerHTML = `<span class="in-al-name">${item.name}</span>${item.set ? ' <span class="in-al-set">' + item.set + '</span>' : ''}`;
      return el;
    }

    updateItemEl(el, item) {
      const expectedHtml = `<span class="in-al-name">${item.name}</span>${item.set ? ' <span class="in-al-set">' + item.set + '</span>' : ''}`;
      if (el.innerHTML !== expectedHtml) {
        el.innerHTML = expectedHtml;
      }
    }

    update() {
      const menu = this.getMenu && this.getMenu();
      if (!menu) return;
      const s = menu.settings;

      if (!s.arrayList) {
        if (this.el) {
          for (const [, entry] of this.items) {
            entry.el.classList.remove('show');
            entry.el.classList.add('removing');
            const el = entry.el;
            setTimeout(() => { if (el.parentNode) el.remove(); }, 340);
          }
          this.items.clear();
          this.lastSignature = '';
          setTimeout(() => {
            if (this.el && this.items.size === 0) this.el.style.display = 'none';
          }, 340);
        }
        return;
      }

      this.attach();
      this.el.style.display = 'flex';

      const style = s.arrayListStyle || 'inroute';
      const pos = s.arrayListPos || 'top-left';

      if (this.lastStyle !== style) {
        this.el.classList.toggle('in-style-inroute', style === 'inroute');
        this.el.classList.toggle('in-style-celestial', style === 'celestial');
        this.el.classList.toggle('in-style-minced', style === 'minced');
        this.el.classList.toggle('in-style-nursultan', style === 'nursultan');
        this.lastStyle = style;
      }
      if (this.lastPos !== pos) {
        this.el.classList.toggle('in-al-left', pos === 'top-left');
        this.el.classList.toggle('in-al-right', pos === 'top-right');
        this.lastPos = pos;
      }
      this.el.classList.toggle('in-al-glow', !!s.arrayListGlow);
      this.el.classList.toggle('in-al-rainbow', !!s.arrayListRainbow);

      this.updatePos(s);

      const newItems = this.buildItems(s);
      const newSignature = newItems.map(i => i.name + '|' + i.set).join(';') + '|' + style;
      if (newSignature === this.lastSignature) return;
      this.lastSignature = newSignature;

      const newNames = new Set(newItems.map(i => i.name));

      for (const [name, entry] of this.items) {
        if (!newNames.has(name)) {
          entry.el.classList.remove('show');
          entry.el.classList.add('removing');
          const el = entry.el;
          setTimeout(() => { if (el.parentNode) el.remove(); }, 340);
          this.items.delete(name);
        }
      }

      let delayIdx = 0;
      const newEntries = [];
      for (const item of newItems) {
        const existing = this.items.get(item.name);
        if (existing) {
          this.updateItemEl(existing.el, item);
          newEntries.push(existing.el);
        } else {
          const el = this.createItemEl(item);
          this.items.set(item.name, { el, item });
          newEntries.push(el);
        }
      }

      for (let i = 0; i < newEntries.length; i++) {
        const el = newEntries[i];
        const currentAt = this.el.children[i];
        if (currentAt !== el) {
          this.el.insertBefore(el, currentAt || null);
        }
      }

      for (const item of newItems) {
        const entry = this.items.get(item.name);
        if (!entry) continue;
        if (!entry.el.classList.contains('show') && !entry.el.classList.contains('removing')) {
          const d = delayIdx * 35;
          delayIdx++;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (entry.el.parentNode) entry.el.classList.add('show');
            });
          });
          if (d > 0) {
            entry.el.style.transitionDelay = `0ms, 0ms, ${d}ms, ${d}ms`;
            setTimeout(() => { entry.el.style.transitionDelay = ''; }, d + 340);
          }
        }
      }
    }
  }

  return { ArrayList };
})();