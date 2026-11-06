(function () {
    const { fen, ui, extra } = window.InChess;
    const { getFEN, detectBoardFlipped } = fen;
    const { notifier, viz, evalBar, menu, arrayList, watermark } = ui;

    let tT = null;
    let lastGameOverHandled = false;
    let lastEval = 0;
    let plyCount = 0;
    let lastCountedFEN = '';

    const START_FEN_PREFIX = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

    function evalToWinrate(cp) {
        if (Math.abs(cp) >= 15000) return cp > 0 ? 100 : 0;
        return Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1));
    }

    function countEnabledFeatures(s) {
        let n = 0;
        if (s.detector) n++;
        if (s.predicts) n++;
        if (s.auto) n++;
        if (s.alts) n++;
        if (s.thoughts) n++;
        if (s.evalBar) n++;
        if (s.heatmap) n++;
        if (s.vo) n++;
        if (s.protect) n++;
        if (s.playEloEnabled) n++;
        return n;
    }

    function getRatingEl(side) {
        return document.querySelector('.player-' + side + ' [data-test-element="user-tagline-rating"]')
            || document.querySelector('#board-layout-player-' + side + ' [data-test-element="user-tagline-rating"]')
            || document.querySelector('.player-' + side + ' .cc-user-rating-boldest')
            || document.querySelector('#board-layout-player-' + side + ' .cc-user-rating-boldest');
    }

    function getOpponentElo(myColor) {
        const side = myColor === 'w' ? 'top' : 'bottom';
        const el = getRatingEl(side);
        if (!el) return null;
        const raw = (el.textContent || '').replace(/[()\s]/g, '').trim();
        if (/^\d+$/.test(raw)) return parseInt(raw);
        return null;
    }

    function gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function humanDelay(base, complexity) {
        let d = base * complexity;
        d += gaussianRandom() * 0.4 * base;
        if (Math.random() < 0.08) d *= 1.8 + Math.random() * 1.2;
        if (Math.random() < 0.04) d *= 0.5;
        return Math.max(0.4, Math.min(20, d));
    }

    window.addEventListener('resize', () => {
        if (menu.settings.evalBar) evalBar.updatePos();
    });
    window.addEventListener('scroll', () => {
        if (menu.settings.evalBar) evalBar.updatePos();
    });

    chrome.runtime.onMessage.addListener(msg => {
        if (menu.settings.detector === false && (
            msg.type === 'DRAW_MOVE' ||
            msg.type === 'UPDATE_EVAL' ||
            msg.type === 'THOUGHT_MOVE' ||
            msg.type === 'UPDATE_CALC' ||
            msg.type === 'AUTO_MOVE' ||
            (msg.type === 'SHOW_NOTIFICATION' && msg.notifType === 'calc')
        )) {
            return;
        }

        if (msg.type === 'SHOW_NOTIFICATION') {
            if (msg.notifType === 'calc') {
                if (tT) { tT.remove(); tT = null; }
                tT = notifier.show({ type: msg.notifType, title: 'Analysis', text: msg.text, persist: msg.persist });
            } else {
                if (tT) { tT.remove(); tT = null; }
                notifier.show({ type: msg.notifType, text: msg.text, persist: msg.persist });
            }
        } else if (msg.type === 'UPDATE_CALC') {
            if (tT) notifier.updateText(tT, msg.text);
        } else if (msg.type === 'UPDATE_EVAL') {
            lastEval = msg.evalScore || 0;
            if (menu.settings.evalBar && msg.evalScore !== undefined) {
                const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
                evalBar.update(msg.evalScore, board ? detectBoardFlipped(board) : false);
            }
        } else if (msg.type === 'THOUGHT_MOVE') {
            if (menu.settings.thoughts) {
                viz.drawThought(msg.uci, menu.settings.color);
            }
        } else if (msg.type === 'CLEAR_THOUGHT') {
            viz.clearThought();
        } else if (msg.type === 'DRAW_MOVE') {
            viz.clear();
            const m = msg.moves;
            const sets = menu.settings;
            const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
            const isFlipped = board ? detectBoardFlipped(board) : false;

            if (m.isBrill) {
                extra.playVOSound('they', 'brilliant');
            }

            if (sets.evalBar && m.evalScore !== undefined) {
                lastEval = m.evalScore;
                evalBar.update(m.evalScore, isFlipped);
            }
            if (sets.heatmap && m.threats) {
                viz.drawHeatmap(m.threats, isFlipped);
            }

            if (m.best) viz.draw(m.best, sets.color, 0.9, m.isBrill);
            if (sets.alts) {
                if (m.alt1) viz.draw(m.alt1, sets.color, 0.5);
                if (m.alt2) viz.draw(m.alt2, sets.color, 0.3);
            }
            if (sets.predicts && m.predict) {
                viz.draw(m.predict, '#00bcd4', 0.55, false, true);
            }
        } else if (msg.type === 'AUTO_MOVE') {
            const s = menu.settings;
            const currentFen = getFEN();
            if (msg.sourceFen && currentFen !== msg.sourceFen) {
                console.log('InChess: Skipping AUTO_MOVE - FEN mismatch', { current: currentFen, source: msg.sourceFen });
                return;
            }
            if (extra.getIsMoving()) return;

            const complexity = msg.complexity || 0.8;
            let baseDelay;
            if (s.rnd) {
                const mid = (s.rndMin + s.rndMax) / 2;
                const spread = (s.rndMax - s.rndMin) / 2;
                baseDelay = mid + gaussianRandom() * spread * 0.5;
            } else {
                baseDelay = s.delay;
            }

            const d = humanDelay(baseDelay, complexity);

            notifier.show({ type: 'info', text: `Ходим через ${d.toFixed(1)}с...` });
            setTimeout(() => {
                if (menu.settings.detector === false) return;
                const finalFen = getFEN();
                if (msg.sourceFen && finalFen !== msg.sourceFen) return;
                extra.makeMove(msg.uci);
            }, d * 1000);
        }
    });

    setInterval(extra.applyProtect, 150);

    setInterval(() => {
        if (menu.settings.detector === false) {
            lastGameOverHandled = false;
            return;
        }
        const outcome = extra.detectGameOutcome();
        if (outcome) {
            if (!lastGameOverHandled) {
                lastGameOverHandled = true;
                extra.playVOSound(outcome);
            }
        } else {
            lastGameOverHandled = false;
        }
    }, 250);

    setInterval(() => {
        const stats = {
            featureCount: countEnabledFeatures(menu.settings),
            moves: Math.ceil(plyCount / 2),
            winrate: evalToWinrate(lastEval)
        };
        arrayList.update();
        watermark.update(stats);
    }, 300);

    let lastF = '';
    let stableCount = 0;
    let prevDetector = menu.settings.detector;

    setInterval(() => {
        if (menu && menu.settings && menu.settings.evalBar) {
            evalBar.updatePos();
        }

        if (menu.settings.detector !== prevDetector) {
            prevDetector = menu.settings.detector;
            lastF = '';
            stableCount = 0;
            viz.clear();
        }

        if (menu.settings.detector === false) {
            return;
        }

        const f = getFEN();
        if (f) {
            const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
            const myColor = board ? (detectBoardFlipped(board) ? 'b' : 'w') : 'w';
            extra.checkFirstMove(f, myColor);

            if (f !== lastCountedFEN) {
                lastCountedFEN = f;
                if (f.startsWith(START_FEN_PREFIX)) plyCount = 0;
                else plyCount++;
            }
        }
        if (f && f !== lastF) {
            stableCount++;
            if (stableCount >= 2) {
                lastF = f;
                stableCount = 0;
                viz.clear();
                const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
                const myColor = board ? (detectBoardFlipped(board) ? 'b' : 'w') : 'w';

                const oppSide = myColor === 'w' ? 'top' : 'bottom';
                const oppEl = document.querySelector('.player-' + oppSide + ' [data-test-element="user-tagline-username"], #board-layout-player-' + oppSide + ' [data-test-element="user-tagline-username"]');
                const oppName = oppEl ? oppEl.textContent.trim() : null;
                const oppElo = getOpponentElo(myColor);

                chrome.runtime.sendMessage({ type: 'BOARD_CHANGED', fen: f, myColor, oppName, oppElo });
            }
        } else {
            stableCount = 0;
        }
    }, 100);
})();