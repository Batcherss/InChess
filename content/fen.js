window.InChess = window.InChess || {};
window.InChess.fen = (function () {
    const pieceMap = {
        'wp': 'P', 'wr': 'R', 'wn': 'N', 'wb': 'B', 'wq': 'Q', 'wk': 'K',
        'bp': 'p', 'br': 'r', 'bn': 'n', 'bb': 'b', 'bq': 'q', 'bk': 'k'
    };

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

        let castling = '';
        if (grid[7][4] === 'K') {
            if (grid[7][7] === 'R') castling += 'K';
            if (grid[7][0] === 'R') castling += 'Q';
        }
        if (grid[0][4] === 'k') {
            if (grid[0][7] === 'r') castling += 'k';
            if (grid[0][0] === 'r') castling += 'q';
        }
        if (!castling) castling = '-';

        return `${fen.join('/')} ${turn} ${castling} - 0 1`;
    }

    return { pieceMap, detectBoardFlipped, detectTurn, getFEN };
})();