window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

window.InChess.ui.viz = (function () {
    class Viz {
        constructor() {
            this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            Object.assign(this.svg.style, { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2000' });
            this.thoughtEl = null;
        }
        attach(board) {
            if (getComputedStyle(board).position === 'static') board.style.position = 'relative';
            if (!this.svg.parentElement) board.appendChild(this.svg);
        }
        drawThought(uci, color) {
            const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
            if (!board || !uci || uci.length < 4) return;
            this.attach(board);
            this.clearThought();
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
                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
                line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
                line.setAttribute("stroke", color || "#ffeb3b");
                line.setAttribute("stroke-width", "3");
                line.setAttribute("stroke-dasharray", "6 4");
                line.setAttribute("opacity", "0.65");
                line.setAttribute("stroke-linecap", "round");
                const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circ.setAttribute("cx", p2.x); circ.setAttribute("cy", p2.y);
                circ.setAttribute("r", sq / 4.5);
                circ.setAttribute("fill", color || "#ffeb3b");
                circ.setAttribute("opacity", "0.22");
                g.appendChild(line);
                g.appendChild(circ);
                this.svg.appendChild(g);
                this.thoughtEl = g;
            } catch (e) { }
        }
        clearThought() {
            if (this.thoughtEl) { this.thoughtEl.remove(); this.thoughtEl = null; }
        }
        draw(uci, color, opacity = 0.8, isBrill = false, dashed = false) {
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
                if (dashed) line.setAttribute("stroke-dasharray", "8 6");
                const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circ.setAttribute("cx", p2.x); circ.setAttribute("cy", p2.y);
                circ.setAttribute("r", isBrill ? sq / 3 : sq / 4);
                circ.setAttribute("fill", "none");
                circ.setAttribute("stroke", isBrill ? "#00e5ff" : color);
                circ.setAttribute("stroke-width", isBrill ? 4 : 2.5);
                circ.setAttribute("opacity", isBrill ? 1.0 : opacity);
                if (dashed) circ.setAttribute("stroke-dasharray", "8 6");
                if (isBrill) {
                    line.style.filter = "drop-shadow(0 0 8px #00e5ff)";
                    circ.style.filter = "drop-shadow(0 0 8px #00e5ff)";
                }
                this.svg.appendChild(line); this.svg.appendChild(circ);
            } catch (e) { }
        }
        drawHeatmap(threats, isFlipped) {
            const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
            if (!board || !threats || threats.length === 0) return;
            this.attach(board);
            this.clearHeatmap();
            const rect = board.getBoundingClientRect();
            const sq = rect.width / 8;
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            threats.forEach(t => {
                let c = t.c, r = t.r;
                if (isFlipped) { c = 7 - c; r = 7 - r; }
                const x = c * sq, y = r * sq;
                const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rectEl.setAttribute("x", x + 3);
                rectEl.setAttribute("y", y + 3);
                rectEl.setAttribute("width", sq - 6);
                rectEl.setAttribute("height", sq - 6);
                rectEl.setAttribute("rx", 6);
                if (t.type === 'check') {
                    rectEl.setAttribute("fill", "rgba(255, 30, 30, 0.45)");
                    rectEl.setAttribute("stroke", "#ff1744");
                    rectEl.setAttribute("stroke-width", "2.5");
                } else if (t.type === 'danger') {
                    rectEl.setAttribute("fill", "rgba(255, 70, 70, 0.35)");
                    rectEl.setAttribute("stroke", "#ff5252");
                    rectEl.setAttribute("stroke-width", "1.5");
                } else if (t.type === 'free') {
                    rectEl.setAttribute("fill", "rgba(76, 217, 100, 0.35)");
                    rectEl.setAttribute("stroke", "#00e676");
                    rectEl.setAttribute("stroke-width", "2");
                }
                g.appendChild(rectEl);
            });
            if (this.svg.firstChild) this.svg.insertBefore(g, this.svg.firstChild);
            else this.svg.appendChild(g);
            this.heatmapEl = g;
        }
        clearHeatmap() {
            if (this.heatmapEl) { this.heatmapEl.remove(); this.heatmapEl = null; }
        }
        clear() { this.clearThought(); this.clearHeatmap(); this.svg.innerHTML = ''; }
    }

    return { Viz };
})();