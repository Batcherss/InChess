self.InChess = self.InChess || {};
self.InChess.engine = (function () {
    const T = self.InChess.tables;
    const R = self.InChess.rules;

    const vals = T.vals;
    const pst_p_w = T.pst_p_w;
    const pst_n = T.pst_n;
    const pst_b_w = T.pst_b_w;
    const pst_r_w = T.pst_r_w;
    const pst_q = T.pst_q;
    const pst_k_w = T.pst_k_w;
    const pst_k_e = T.pst_k_e;
    const pst_p_b = T.pst_p_b;
    const pst_b_b = T.pst_b_b;
    const pst_r_b = T.pst_r_b;
    const pst_k_w_b = T.pst_k_w_b;
    const pst_k_e_b = T.pst_k_e_b;
    const killerMoves = T.killerMoves;
    const historyTable = T.historyTable;
    const TT_EXACT = T.TT_EXACT, TT_ALPHA = T.TT_ALPHA, TT_BETA = T.TT_BETA;

    const TT_SIZE = 1 << 20;
    const TT_MASK_BIG = BigInt(TT_SIZE - 1);

    const ttKey = new Uint32Array(TT_SIZE);
    const ttScore = new Int32Array(TT_SIZE);
    const ttDepth = new Uint8Array(TT_SIZE);
    const ttFlag = new Uint8Array(TT_SIZE);
    const ttFrom = new Int8Array(TT_SIZE);
    const ttTo = new Int8Array(TT_SIZE);
    const ttPromo = new Uint8Array(TT_SIZE);

    const boardHistorySet = new Set();
    const boardHistoryQueue = [];

    let currentNodes = 0;
    let moveCount = 0;
    let evalHistory = [];

    function getBoardKey(grid) {
        let s = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) s += grid[r][c];
        }
        return s;
    }

    function evaluate(grid) {
        currentNodes++;
        let score = 0, tMat = 0;
        let wKr = -1, wKc = -1, bKr = -1, bKc = -1;
        let wB = 0, bB = 0;
        const wPawnCols = [0, 0, 0, 0, 0, 0, 0, 0], bPawnCols = [0, 0, 0, 0, 0, 0, 0, 0];
        const wRookCols = [], bRookCols = [];
        const wPawnPos = [], bPawnPos = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                if (p === '.') continue;
                const idx = r * 8 + c;
                const isW = p === p.toUpperCase();
                const type = p.toLowerCase();

                if (type === 'p') {
                    if (isW) { score += vals.p + pst_p_w[idx]; wPawnCols[c]++; wPawnPos.push(r, c); }
                    else { score -= vals.p + pst_p_b[idx]; bPawnCols[c]++; bPawnPos.push(r, c); }
                } else if (type === 'n') {
                    if (isW) score += vals.n + pst_n[idx];
                    else score -= vals.n + pst_n[idx];
                    tMat += vals.n;
                } else if (type === 'b') {
                    if (isW) { score += vals.b + pst_b_w[idx]; wB++; }
                    else { score -= vals.b + pst_b_b[idx]; bB++; }
                    tMat += vals.b;
                } else if (type === 'r') {
                    if (isW) {
                        let v = vals.r + pst_r_w[idx];
                        if (r === 1) v += 25;
                        score += v;
                        wRookCols.push(c);
                    } else {
                        let v = vals.r + pst_r_b[idx];
                        if (r === 6) v += 25;
                        score -= v;
                        bRookCols.push(c);
                    }
                    tMat += vals.r;
                } else if (type === 'q') {
                    if (isW) score += vals.q + pst_q[idx];
                    else score -= vals.q + pst_q[idx];
                    tMat += vals.q;
                } else {
                    if (isW) { wKr = r; wKc = c; } else { bKr = r; bKc = c; }
                }
            }
        }

        if (wKr === -1) return -25000;
        if (bKr === -1) return 25000;

        const isEg = tMat < 3000;
        score += isEg ? pst_k_e[wKr * 8 + wKc] : pst_k_w[wKr * 8 + wKc];
        score -= isEg ? pst_k_e_b[bKr * 8 + bKc] : pst_k_w_b[bKr * 8 + bKc];

        if (wB >= 2) score += 40;
        if (bB >= 2) score -= 40;

        for (let c of wRookCols) {
            if (wPawnCols[c] === 0) score += (bPawnCols[c] === 0) ? 25 : 15;
        }
        for (let c of bRookCols) {
            if (bPawnCols[c] === 0) score -= (wPawnCols[c] === 0) ? 25 : 15;
        }

        for (let i = 0; i < 8; i++) {
            if (wPawnCols[i] > 1) score -= 18;
            if (bPawnCols[i] > 1) score += 18;
            if (wPawnCols[i] > 0 && (i === 0 || wPawnCols[i - 1] === 0) && (i === 7 || wPawnCols[i + 1] === 0)) score -= 15;
            if (bPawnCols[i] > 0 && (i === 0 || bPawnCols[i - 1] === 0) && (i === 7 || bPawnCols[i + 1] === 0)) score += 15;
        }

        if (!isEg) {
            if (wKr >= 6 && wKc >= 5) {
                if (grid[6][5] !== 'P') score -= 15;
                if (grid[6][6] !== 'P') score -= 25;
                if (grid[6][7] !== 'P') score -= 15;
            }
            if (bKr <= 1 && bKc >= 5) {
                if (grid[1][5] !== 'p') score += 15;
                if (grid[1][6] !== 'p') score += 25;
                if (grid[1][7] !== 'p') score += 15;
            }
        }

        for (let i = 0; i < wPawnPos.length; i += 2) {
            const r = wPawnPos[i], c = wPawnPos[i + 1];
            let passed = true;
            for (let checkR = r - 1; checkR >= 0; checkR--) {
                const lo = c - 1 < 0 ? 0 : c - 1;
                const hi = c + 1 > 7 ? 7 : c + 1;
                for (let checkC = lo; checkC <= hi; checkC++) {
                    if (grid[checkR][checkC] === 'p') { passed = false; break; }
                }
                if (!passed) break;
            }
            if (passed) score += (7 - r) * (isEg ? 25 : 12);
        }
        for (let i = 0; i < bPawnPos.length; i += 2) {
            const r = bPawnPos[i], c = bPawnPos[i + 1];
            let passed = true;
            for (let checkR = r + 1; checkR < 8; checkR++) {
                const lo = c - 1 < 0 ? 0 : c - 1;
                const hi = c + 1 > 7 ? 7 : c + 1;
                for (let checkC = lo; checkC <= hi; checkC++) {
                    if (grid[checkR][checkC] === 'P') { passed = false; break; }
                }
                if (!passed) break;
            }
            if (passed) score -= r * (isEg ? 25 : 12);
        }

        return score;
    }

    function qSearch(grid, alpha, beta, isW, depth = 0) {
        const standPat = isW ? evaluate(grid) : -evaluate(grid);
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
        if (depth > 8) return alpha;

        const moves = R.genMoves(grid, isW, true);
        moves.sort((a, b) => b.cS - a.cS);

        for (const m of moves) {
            const vic = (grid[m.nr][m.nc] || 'p').toLowerCase();
            if (standPat + vals[vic] + 250 < alpha && !m.promo) continue;

            const { undo } = R.makeMove(grid, m, isW, '-');
            if (R.isInCheck(grid, isW)) { R.unmakeMove(grid, m, undo); continue; }

            const score = -qSearch(grid, -beta, -alpha, !isW, depth + 1);
            R.unmakeMove(grid, m, undo);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    }

    function minimax(grid, depth, alpha, beta, isW, castling = "-", ep = "-", ply = 0) {
        const hash = R.computeHash(grid, isW, castling, ep);
        const idx = Number(hash & TT_MASK_BIG);
        const key32 = Number((hash >> 32n) & 0xFFFFFFFFn);

        let ttMove = null;
        if (ttKey[idx] === key32) {
            let cachedScore = ttScore[idx];
            const cachedDepth = ttDepth[idx];
            const cachedFlag = ttFlag[idx];
            const mF = ttFrom[idx], mT = ttTo[idx], mP = ttPromo[idx];
            if (mF >= 0 && mT >= 0) {
                ttMove = {
                    r: Math.floor(mF / 8), c: mF % 8,
                    nr: Math.floor(mT / 8), nc: mT % 8,
                    promo: mP > 0 ? String.fromCharCode(mP) : null
                };
            }
            if (cachedScore > 15000) cachedScore -= ply;
            else if (cachedScore < -15000) cachedScore += ply;

            if (cachedDepth >= depth) {
                if (cachedFlag === TT_EXACT) return cachedScore;
                if (cachedFlag === TT_ALPHA && cachedScore <= alpha) return alpha;
                if (cachedFlag === TT_BETA && cachedScore >= beta) return beta;
            }
        }

        const inCheck = R.isInCheck(grid, isW);
        if (inCheck && ply < 6) depth++;
        if (depth <= 0 && !inCheck) return qSearch(grid, alpha, beta, isW);

        const moves = R.genMoves(grid, isW, false, castling, ep);

        const killer1 = killerMoves[ply] ? killerMoves[ply][0] : null;
        const killer2 = killerMoves[ply] ? killerMoves[ply][1] : null;

        for (const m of moves) {
            if (ttMove && m.r === ttMove.r && m.c === ttMove.c && m.nr === ttMove.nr && m.nc === ttMove.nc && m.promo === ttMove.promo) {
                m.orderScore = 10000000;
            } else if (m.cap) {
                const victimVal = vals[(grid[m.nr][m.nc] || 'p').toLowerCase()];
                const attackerVal = vals[grid[m.r][m.c].toLowerCase()];
                if (victimVal >= attackerVal) m.orderScore = 1000000 + m.cS;
                else m.orderScore = 500000 + m.cS;
            } else if (killer1 && m.r === killer1.r && m.c === killer1.c && m.nr === killer1.nr && m.nc === killer1.nc) {
                m.orderScore = 900000;
            } else if (killer2 && m.r === killer2.r && m.c === killer2.c && m.nr === killer2.nr && m.nc === killer2.nc) {
                m.orderScore = 800000;
            } else {
                m.orderScore = historyTable[m.r * 8 + m.c][m.nr * 8 + m.nc] + (m.cS || 0);
            }
        }
        moves.sort((a, b) => b.orderScore - a.orderScore);

        let bestScore = -Infinity;
        let bestMove = null;
        const oldAlpha = alpha;
        let legalMoves = 0;

        for (let i = 0; i < moves.length; i++) {
            const m = moves[i];
            const { undo, newCastling } = R.makeMove(grid, m, isW, castling);
            if (R.isInCheck(grid, isW)) { R.unmakeMove(grid, m, undo); continue; }
            legalMoves++;

            const newEp = (undo.p && undo.p.toLowerCase() === 'p' && Math.abs(m.nr - m.r) === 2) ?
                String.fromCharCode(97 + m.c) + (isW ? 3 : 6) : '-';

            let score;
            if (depth >= 3 && legalMoves > 4 && !m.cap && !inCheck && !m.promo && !m.isCastle && alpha > -10000) {
                score = -minimax(grid, depth - 2, -alpha - 1, -alpha, !isW, newCastling, newEp, ply + 1);
                if (score > alpha) {
                    score = -minimax(grid, depth - 1, -beta, -alpha, !isW, newCastling, newEp, ply + 1);
                }
            } else {
                score = -minimax(grid, depth - 1, -beta, -alpha, !isW, newCastling, newEp, ply + 1);
            }

            R.unmakeMove(grid, m, undo);

            if (score > bestScore) { bestScore = score; bestMove = m; }
            if (score > alpha) alpha = score;
            if (alpha >= beta) {
                if (!m.cap && ply < 32) {
                    killerMoves[ply][1] = killerMoves[ply][0];
                    killerMoves[ply][0] = m;
                    historyTable[m.r * 8 + m.c][m.nr * 8 + m.nc] += depth * depth;
                }
                break;
            }
        }

        if (legalMoves === 0) return inCheck ? -25000 + ply : 0;

        let flag = TT_EXACT;
        if (bestScore <= oldAlpha) flag = TT_ALPHA;
        else if (bestScore >= beta) flag = TT_BETA;

        let ttSc = bestScore;
        if (ttSc > 15000) ttSc += ply;
        else if (ttSc < -15000) ttSc -= ply;

        ttKey[idx] = key32;
        ttScore[idx] = ttSc;
        ttDepth[idx] = depth > 255 ? 255 : depth;
        ttFlag[idx] = flag;
        if (bestMove) {
            ttFrom[idx] = bestMove.r * 8 + bestMove.c;
            ttTo[idx] = bestMove.nr * 8 + bestMove.nc;
            ttPromo[idx] = bestMove.promo ? bestMove.promo.charCodeAt(0) : 0;
        } else {
            ttFrom[idx] = -1; ttTo[idx] = -1; ttPromo[idx] = 0;
        }

        return bestScore;
    }

    async function analyzeEngine(fen, myColor, tabId, activeAnalysis, engineSettings) {
        if (activeAnalysis.get(tabId) !== fen) return;

        currentNodes = 0;
        chrome.tabs.sendMessage(tabId, { type: 'SHOW_NOTIFICATION', notifType: 'calc', text: 'Думаю...', persist: true });

        const p = fen.split(' ');
        const isW = p[1] === 'w';
        const castling = p[2] || "-";
        const ep = p[3] || "-";
        const grid = p[0].split('/').map(r => {
            const row = [];
            for (let c of r) {
                if (/[1-8]/.test(c)) { for (let j = 0; j < parseInt(c); j++) row.push('.'); }
                else row.push(c);
            }
            return row;
        });

        const rootEval = isW ? evaluate(grid) : -evaluate(grid);

        let maxDepth;
        if (engineSettings.depth && engineSettings.depth !== 'auto') {
            maxDepth = parseInt(engineSettings.depth) || 5;
        } else {
            maxDepth = 5;
            let tMat = 0;
            for (let r of grid) for (let c of r) if (c !== '.' && c.toLowerCase() !== 'k' && c.toLowerCase() !== 'p') tMat += vals[c.toLowerCase()];
            if (tMat < 3000) maxDepth = 6;
            if (tMat < 1500) maxDepth = 7;
        }

        let bestMoveUCI = null;
        let allMovesEvals = [];
        let lastThoughtTime = 0;

        for (let i = 0; i < killerMoves.length; i++) { killerMoves[i][0] = null; killerMoves[i][1] = null; }
        for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) historyTable[i][j] >>= 1;

        let prevScore = rootEval;
        let aspWindow = 50;

        for (let d = 1; d <= maxDepth; d++) {
            const moves = R.genMoves(grid, isW, false, castling, ep);

            if (bestMoveUCI) {
                moves.sort((a, b) => {
                    const uciA = R.toUCI(a), uciB = R.toUCI(b);
                    if (uciA === bestMoveUCI) return -1;
                    if (uciB === bestMoveUCI) return 1;
                    return (b.cS || 0) - (a.cS || 0);
                });
            }

            let alpha = d === 1 ? -Infinity : prevScore - aspWindow;
            let beta = d === 1 ? Infinity : prevScore + aspWindow;

            while (true) {
                allMovesEvals = [];

                for (const m of moves) {
                    const moveUCI = R.toUCI(m);
                    const now = Date.now();
                    if (engineSettings.thoughts !== false && (now - lastThoughtTime > 200)) {
                        lastThoughtTime = now;
                        chrome.tabs.sendMessage(tabId, { type: 'THOUGHT_MOVE', uci: moveUCI });
                    }

                    const { undo, newCastling } = R.makeMove(grid, m, isW, castling);
                    if (R.isInCheck(grid, isW)) { R.unmakeMove(grid, m, undo); continue; }

                    let v = -minimax(grid, d - 1, -beta, -alpha, !isW, newCastling, ep, 1);

                    const nKey = getBoardKey(grid);
                    if (boardHistorySet.has(nKey)) v -= 500;

                    R.unmakeMove(grid, m, undo);
                    if (activeAnalysis.get(tabId) !== fen) return;
                    allMovesEvals.push({ uci: moveUCI, eval: v, m });
                }

                if (allMovesEvals.length === 0) break;
                allMovesEvals.sort((a, b) => b.eval - a.eval);
                bestMoveUCI = allMovesEvals[0].uci;
                const best = allMovesEvals[0].eval;

                if (d === 1) break;
                if (best <= alpha) { alpha = -Infinity; continue; }
                if (best >= beta) { beta = Infinity; continue; }
                break;
            }

            if (allMovesEvals.length === 0) break;

            if (activeAnalysis.get(tabId) !== fen) return;
            const currentEval = isW ? allMovesEvals[0].eval : -allMovesEvals[0].eval;
            chrome.tabs.sendMessage(tabId, { type: 'UPDATE_EVAL', evalScore: currentEval });
            chrome.tabs.sendMessage(tabId, { type: 'UPDATE_CALC', text: `Глубина ${d} | Узлы: ${currentNodes}` });

            prevScore = allMovesEvals[0].eval;
            aspWindow = Math.max(30, aspWindow - 5);
        }

        chrome.tabs.sendMessage(tabId, { type: 'CLEAR_THOUGHT' });

        if (allMovesEvals.length === 0) {
            chrome.tabs.sendMessage(tabId, { type: 'SHOW_NOTIFICATION', notifType: 'info', text: 'Нет легальных ходов!', persist: false });
            return;
        }

        const bM = allMovesEvals[0];
        const aM = allMovesEvals[1];
        let isBrill = aM && (bM.eval - aM.eval) >= 200;

        let reason = "Оптимальный ход";
        if (bM.eval >= 20000) reason = "Мат!";
        else if (isBrill) reason = "Блестящий ход!";
        else if (bM.m.cap) reason = "Забираем фигуру";
        else if (bM.eval > rootEval + 50) reason = "Улучшаем позицию";

        let chosenMove = bM;

        if (engineSettings.playEloEnabled && Math.abs(bM.eval) < 15000 && engineSettings.playElo && engineSettings.playElo !== 'unlimited') {
            const targetElo = parseInt(engineSettings.playElo);
            if (!isNaN(targetElo)) {
                let maxLossCp = 400, blunderChance = 0.25;
                if (targetElo <= 800) { maxLossCp = 400; blunderChance = 0.25; }
                else if (targetElo <= 1200) { maxLossCp = 250; blunderChance = 0.20; }
                else if (targetElo <= 1600) { maxLossCp = 150; blunderChance = 0.15; }
                else if (targetElo <= 2000) { maxLossCp = 80; blunderChance = 0.10; }
                else { maxLossCp = 30; blunderChance = 0.05; }

                const threshold = bM.eval - maxLossCp;
                const candidates = allMovesEvals.filter(m => m.eval >= threshold);

                if (candidates.length > 1 && Math.random() < blunderChance) {
                    const nonBest = candidates.slice(1);
                    chosenMove = nonBest[Math.floor(Math.random() * nonBest.length)];
                }

                if (chosenMove.uci !== bM.uci) {
                    const loss = bM.eval - chosenMove.eval;
                    isBrill = false;
                    reason = `Elo ${targetElo} (потеря ${(loss / 100).toFixed(1)})`;
                } else {
                    reason = `Elo ${targetElo}`;
                }
            }
        }

        let complexity = 0.8;
        const spread = allMovesEvals.length > 1 ? Math.abs(allMovesEvals[0].eval - allMovesEvals[1].eval) : 0;
        if (reason === 'Мат!') complexity = 1.4;
        else if (reason.indexOf('Блестящий') !== -1) complexity = 1.3;
        else if (reason === 'Забираем фигуру') complexity = 0.7;
        else if (isBrill) complexity = 1.2;
        else if (spread < 30) complexity = 1.2;
        else if (spread < 100) complexity = 0.95;
        else if (spread > 300) complexity = 0.6;

        const threats = R.computeThreats(grid, isW);
        const finalEval = isW ? bM.eval : -bM.eval;

        const altCandidates = allMovesEvals.filter(m => m.uci !== chosenMove.uci);

        const res = {
            best: chosenMove.uci,
            alt1: altCandidates[0] ? altCandidates[0].uci : null,
            alt2: altCandidates[1] ? altCandidates[1].uci : null,
            isBrill,
            evalScore: finalEval,
            threats,
            predict: null
        };

        if (activeAnalysis.get(tabId) !== fen) return;

        if (engineSettings.predicts && bM && bM.m) {
            try {
                const { undo, newCastling } = R.makeMove(grid, bM.m, isW, castling);
                if (!R.isInCheck(grid, isW)) {
                    const oppMoves = R.genMoves(grid, !isW, false, newCastling, ep);
                    let oppBest = null;
                    let oppBestScore = -Infinity;
                    for (const om of oppMoves) {
                        const { undo: u2, newCastling: nc2 } = R.makeMove(grid, om, !isW, newCastling);
                        if (R.isInCheck(grid, !isW)) { R.unmakeMove(grid, om, u2); continue; }
                        const v = -minimax(grid, 2, -Infinity, Infinity, isW, nc2, ep, 1);
                        R.unmakeMove(grid, om, u2);
                        if (v > oppBestScore) { oppBestScore = v; oppBest = om; }
                    }
                    if (oppBest) res.predict = R.toUCI(oppBest);
                }
                R.unmakeMove(grid, bM.m, undo);
            } catch (e) { }
        }

        if (activeAnalysis.get(tabId) !== fen) return;

        chrome.tabs.sendMessage(tabId, { type: 'DRAW_MOVE', moves: res });
        chrome.tabs.sendMessage(tabId, {
            type: 'SHOW_NOTIFICATION',
            notifType: isBrill ? 'info' : 'success',
            text: `<span class="move-text">${res.best}</span> - ${reason}`,
            persist: false
        });

        if (engineSettings.auto) {
            chrome.tabs.sendMessage(tabId, { type: 'AUTO_MOVE', uci: res.best, sourceFen: fen, complexity: complexity });
        }

        moveCount++;
        evalHistory.push(rootEval);

        if (moveCount % 5 === 0 && moveCount > 0) {
            let wMat = 0, bMat = 0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const pc = grid[r][c];
                    if (pc !== '.') {
                        const t = pc.toLowerCase();
                        if (t !== 'k') {
                            const v = vals[t] || 0;
                            if (pc === pc.toUpperCase()) wMat += v;
                            else bMat += v;
                        }
                    }
                }
            }

            const matDiff = myColor === 'w' ? wMat - bMat : bMat - wMat;
            const lastFive = evalHistory.slice(-5);
            const trend = lastFive[lastFive.length - 1] - lastFive[0];

            let verdict;
            if (rootEval > 300) verdict = 'Вы доминируете';
            else if (rootEval > 100) verdict = 'У вас преимущество';
            else if (rootEval > -100) verdict = 'Равная игра';
            else if (rootEval > -300) verdict = 'Противник давит';
            else verdict = 'Противник доминирует';

            let trendStr = trend > 50 ? 'Улучшение' : (trend < -50 ? 'Ухудшение' : 'Стабильно');
            const matStr = matDiff > 0 ? `+${matDiff}` : `${matDiff}`;
            const evalStr = rootEval > 0 ? `+${(rootEval / 100).toFixed(1)}` : `${(rootEval / 100).toFixed(1)}`;

            const statsText = `${verdict} | ${evalStr} | Мат: ${matStr} | ${trendStr}`;

            setTimeout(() => {
                if (activeAnalysis.get(tabId) === fen) {
                    chrome.tabs.sendMessage(tabId, { type: 'SHOW_NOTIFICATION', notifType: 'info', text: statsText, persist: false });
                }
            }, 5000);
        }
    }

    function pushBoardKey(key) {
        boardHistorySet.add(key);
        boardHistoryQueue.push(key);
        if (boardHistoryQueue.length > 50) {
            const old = boardHistoryQueue.shift();
            let found = false;
            for (const k of boardHistoryQueue) { if (k === old) { found = true; break; } }
            if (!found) boardHistorySet.delete(old);
        }
    }

    return { evaluate, analyzeEngine, getBoardKey, pushBoardKey };
})();