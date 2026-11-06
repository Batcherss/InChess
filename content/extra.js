window.InChess = window.InChess || {};
window.InChess.extra = (function () {
    const { fen, ui } = window.InChess;
    const { getFEN, detectBoardFlipped } = fen;
    const { menu, notifier } = ui;

    let isMoving = false;

    async function makeMove(uci) {
        if (isMoving) return;
        isMoving = true;
        try {
            const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
            if (!board || !uci) return;

            const from = uci.substring(0, 2), to = uci.substring(2, 4);
            const promo = uci.length > 4 ? uci[4].toLowerCase() : null;
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
            const dispatch = (type, { x, y }) => {
                board.dispatchEvent(new PointerEvent(type, {
                    bubbles: true, cancelable: true, view: window, isTrusted: true,
                    pointerId: 1, pointerType: 'mouse',
                    clientX: x, clientY: y, buttons: (type === 'pointerdown' || type === 'pointermove') ? 1 : 0
                }));
            };

            const ctrlX = p1.x + (p2.x - p1.x) * (0.3 + Math.random() * 0.4) + (Math.random() - 0.5) * sq * 1.2;
            const ctrlY = p1.y + (p2.y - p1.y) * (0.3 + Math.random() * 0.4) + (Math.random() - 0.5) * sq * 1.2;

            const bezier = (t) => ({
                x: (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * ctrlX + t * t * p2.x,
                y: (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * ctrlY + t * t * p2.y
            });

            dispatch('pointerdown', p1);
            await new Promise(r => setTimeout(r, 40 + Math.random() * 80));

            const steps = 8 + Math.floor(Math.random() * 10);
            let prevT = 0;
            for (let i = 1; i <= steps; i++) {
                let t = i / steps;
                const speedCurve = Math.pow(t, 0.7);
                t = Math.min(1, speedCurve);
                const pt = bezier(t);
                const jitterX = (Math.random() - 0.5) * (sq * 0.08);
                const jitterY = (Math.random() - 0.5) * (sq * 0.08);
                dispatch('pointermove', { x: pt.x + jitterX, y: pt.y + jitterY });

                const dt = t - prevT;
                prevT = t;
                const stepDelay = 8 + Math.random() * 18 + (1 - dt) * 10;
                await new Promise(r => setTimeout(r, stepDelay));
            }

            const finalPt = bezier(1);
            dispatch('pointermove', { x: finalPt.x + (Math.random() - 0.5) * 2, y: finalPt.y + (Math.random() - 0.5) * 2 });
            await new Promise(r => setTimeout(r, 60 + Math.random() * 140));

            dispatch('pointerup', p2);

            if (promo) {
                await new Promise(r => setTimeout(r, 120 + Math.random() * 100));
                const targetChar = promo;
                const promoSelector = `.promotion-menu .${targetChar}, .promotion-menu [class*="${targetChar}"], [class*="promotion-piece"][class*="${targetChar}"], .promotion-menu .piece`;
                const promoPiece = document.querySelector(promoSelector);
                if (promoPiece) {
                    promoPiece.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }
            }
        } finally {
            isMoving = false;
        }
    }

    function getIsMoving() { return isMoving; }

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

    const voSounds = {
        begin: ['begin1.mp3', 'begin2.mp3', 'begin3.mp3', 'begin4.mp3'],
        win: ['win1.mp3', 'win2.mp3', 'win3.mp3', 'win4.mp3', 'win5.mp3'],
        loose: ['loose1.mp3', 'loose2.mp3', 'loose3.mp3', 'loose4.mp3'],
        they: {
            knight: ['they/knight1.mp3', 'they/knight2.mp3'],
            bishop: ['they/bishop1.mp3', 'they/bishop2.mp3'],
            rook: ['they/rook1.mp3', 'they/rook2.mp3'],
            queen: ['they/queen1.mp3', 'they/queen2.mp3'],
            brilliant: ['they/brilliant1.mp3', 'they/brilliant2.mp3']
        },
        our: {
            knight: ['our/knight1.mp3', 'our/knight2.mp3'],
            bishop: ['our/bishop1.mp3', 'our/bishop2.mp3'],
            rook: ['our/rook1.mp3', 'our/rook2.mp3'],
            queen: ['our/queen1.mp3', 'our/queen2.mp3']
        }
    };

    let lastGameOverHandled = false;
    let gameStartedSoundPlayed = false;
    let hasSeenStartPos = false;
    let lastCounts = null;
    const lastPlayedVoice = {};

    function playVOSound(type, subtype) {
        if (!menu.settings.vo) return;
        let list;
        let key;
        if (subtype) {
            list = voSounds[type] && voSounds[type][subtype];
            key = type + '/' + subtype;
        } else {
            list = voSounds[type];
            key = type;
        }
        if (!list || list.length === 0) return;

        let available = list;
        if (list.length > 1 && lastPlayedVoice[key]) {
            available = list.filter(s => s !== lastPlayedVoice[key]);
        }
        const soundFile = available[Math.floor(Math.random() * available.length)];
        lastPlayedVoice[key] = soundFile;

        const soundUrl = chrome.runtime.getURL(`vo/${soundFile}`);
        try {
            const audio = new Audio(soundUrl);
            audio.volume = 0.20;
            audio.play().catch(e => console.log('InChess VO audio error:', e));
        } catch (e) { }
    }

    function countPieces(fenStr) {
        const board = fenStr.split(' ')[0];
        const c = { w: { n: 0, b: 0, r: 0, q: 0 }, b: { n: 0, b: 0, r: 0, q: 0 } };
        for (const ch of board) {
            const isWhite = ch === ch.toUpperCase();
            const t = ch.toLowerCase();
            if (t === 'n') c[isWhite ? 'w' : 'b'].n++;
            else if (t === 'b') c[isWhite ? 'w' : 'b'].b++;
            else if (t === 'r') c[isWhite ? 'w' : 'b'].r++;
            else if (t === 'q') c[isWhite ? 'w' : 'b'].q++;
        }
        return c;
    }

    function checkPiecesCapture(fenStr, myColor) {
        if (!fenStr) return;
        const cur = countPieces(fenStr);
        if (lastCounts === null) { lastCounts = cur; return; }
        const my = myColor === 'w' ? 'w' : 'b';
        const opp = my === 'w' ? 'b' : 'w';

        const types = ['q', 'r', 'b', 'n'];
        const map = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };

        for (const t of types) {
            const oppHad = lastCounts[opp][t];
            const oppNow = cur[opp][t];
            if (oppNow < oppHad) {
                playVOSound('they', map[t]);
                lastCounts = cur;
                return;
            }
            const myHad = lastCounts[my][t];
            const myNow = cur[my][t];
            if (myNow < myHad) {
                playVOSound('our', map[t]);
                lastCounts = cur;
                return;
            }
        }
        lastCounts = cur;
    }

    function checkFirstMove(fenStr, myColor) {
        if (!fenStr) return;
        checkPiecesCapture(fenStr, myColor || 'w');
        const isStartPos = fenStr.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');

        if (isStartPos) {
            hasSeenStartPos = true;
            gameStartedSoundPlayed = false;
            lastCounts = null;
            return;
        }

        if (hasSeenStartPos && !gameStartedSoundPlayed) {
            gameStartedSoundPlayed = true;
            hasSeenStartPos = false;
            playVOSound('begin');
            return;
        }

        if (!gameStartedSoundPlayed) {
            const moveList = document.querySelector('.move-list-component, .vertical-move-list, .move-list, [class*="move-list"]');
            if (moveList) {
                const allMoves = moveList.querySelectorAll('.move, .white.node, .black.node, [class*="move-node"], [data-whole-move-number]');
                if (allMoves.length === 1) {
                    gameStartedSoundPlayed = true;
                    playVOSound('begin');
                }
            }
        }
    }

    function detectGameOutcome() {
        const board = document.querySelector('wc-chess-board, .board, #board-play-computer');
        if (!board) return null;
        const isFlipped = detectBoardFlipped(board);
        const myColor = isFlipped ? 'b' : 'w';

        const modalSelectors = [
            '.game-over-modal-component',
            '.game-over-dialog-component',
            '[class*="game-over-modal"]',
            '[class*="game-over-dialog"]',
            '.board-dialog-component',
            '[data-cy="game-over-modal"]',
            '.modal-game-over-component'
        ];

        for (const s of modalSelectors) {
            const el = document.querySelector(s);
            if (el && el.offsetParent !== null) {
                const text = (el.textContent || '').toLowerCase();
                if (text.includes('you won') || text.includes('вы выиграли') || text.includes('вы победили') || text.includes('победа')) return 'win';
                if (text.includes('you lost') || text.includes('вы проиграли') || text.includes('поражение')) return 'loose';
                if (text.includes('white won') || text.includes('белые победили')) return myColor === 'w' ? 'win' : 'loose';
                if (text.includes('black won') || text.includes('черные победили')) return myColor === 'b' ? 'win' : 'loose';
                if (text.includes('won by') || text.includes('won on')) return 'win';
                if (text.includes('lost by') || text.includes('lost on')) return 'loose';
            }
        }

        const statusSelectors = [
            '.game-over-header-component',
            '[data-cy="game-over-header"]',
            '.header-title-component',
            '[class*="game-result"]'
        ];
        for (const s of statusSelectors) {
            const el = document.querySelector(s);
            if (el && el.offsetParent !== null) {
                const text = (el.textContent || '').toLowerCase();
                if (text.includes('you won') || text.includes('вы выиграли') || text.includes('победа')) return 'win';
                if (text.includes('you lost') || text.includes('вы проиграли') || text.includes('поражение')) return 'loose';
                if (text.includes('white won') || text.includes('белые победили')) return myColor === 'w' ? 'win' : 'loose';
                if (text.includes('black won') || text.includes('черные победили')) return myColor === 'b' ? 'win' : 'loose';
            }
        }

        return null;
    }

    return {
        makeMove, getIsMoving,
        applyProtect,
        playVOSound, checkFirstMove, detectGameOutcome,
        checkPiecesCapture
    };
})();