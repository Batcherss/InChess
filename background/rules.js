self.InChess = self.InChess || {};
self.InChess.rules = (function () {
    const T = self.InChess.tables;
    const vals = T.vals;
    const pst_p_w = T.pst_p_w;
    const pst_p_b = T.pst_p_b;
    const ZOBRIST = T.ZOBRIST;
    const pieceIndexMap = T.pieceIndexMap;

    function getCastlingBits(castling) {
        let bits = 0;
        if (castling.includes('K')) bits |= 1;
        if (castling.includes('Q')) bits |= 2;
        if (castling.includes('k')) bits |= 4;
        if (castling.includes('q')) bits |= 8;
        return bits;
    }

    function computeHash(grid, isW, castling, ep) {
        let h = 0n;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                if (p !== '.') {
                    const pIdx = pieceIndexMap[p];
                    h ^= ZOBRIST.pieces[pIdx][r * 8 + c];
                }
            }
        }
        if (!isW) h ^= ZOBRIST.side;
        h ^= ZOBRIST.castling[getCastlingBits(castling)];
        if (ep && ep !== '-') {
            const col = ep.charCodeAt(0) - 97;
            if (col >= 0 && col < 8) h ^= ZOBRIST.ep[col];
        }
        return h;
    }

    function isAttacked(grid, r, c, byWhite) {
        const oppP = byWhite ? /[A-Z]/ : /[a-z]/;
        const pD = byWhite ? 1 : -1;
        if (r + pD >= 0 && r + pD < 8) {
            if (c - 1 >= 0 && grid[r + pD][c - 1] === (byWhite ? 'P' : 'p')) return true;
            if (c + 1 < 8 && grid[r + pD][c + 1] === (byWhite ? 'P' : 'p')) return true;
        }
        const jmps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (let j of jmps) {
            const nr = r + j[0], nc = c + j[1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && grid[nr][nc] === (byWhite ? 'N' : 'n')) return true;
        }
        const stps = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (let s of stps) {
            const nr = r + s[0], nc = c + s[1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && grid[nr][nc] === (byWhite ? 'K' : 'k')) return true;
        }
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (let i = 0; i < 8; i++) {
            const d = dirs[i];
            for (let s = 1; s < 8; s++) {
                const nr = r + d[0] * s, nc = c + d[1] * s;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const p = grid[nr][nc];
                    if (p !== '.') {
                        if (oppP.test(p)) {
                            const t = p.toLowerCase();
                            if (t === 'q') return true;
                            if (i < 4 && t === 'r') return true;
                            if (i >= 4 && t === 'b') return true;
                        }
                        break;
                    }
                } else break;
            }
        }
        return false;
    }

    function isInCheck(grid, isW) {
        const kingChar = isW ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (grid[r][c] === kingChar) {
                    return isAttacked(grid, r, c, !isW);
                }
            }
        }
        return false;
    }

    function computeThreats(grid, isW) {
        const threats = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                if (p === '.') continue;
                const pieceIsWhite = (p === p.toUpperCase());
                const type = p.toLowerCase();
                const underAttack = isAttacked(grid, r, c, !pieceIsWhite);
                if (underAttack) {
                    if (type === 'k') {
                        threats.push({ r, c, type: 'check' });
                        continue;
                    }
                    const defended = isAttacked(grid, r, c, pieceIsWhite);
                    const isMyPiece = (pieceIsWhite === isW);
                    if (isMyPiece) {
                        if (!defended) threats.push({ r, c, type: 'danger' });
                    } else {
                        if (!defended) threats.push({ r, c, type: 'free' });
                    }
                }
            }
        }
        return threats;
    }

    function genMoves(grid, isW, capsOnly = false, castling = "-", ep = "-") {
        const moves = [];
        const myP = isW ? /[A-Z]/ : /[a-z]/;
        const oppP = isW ? /[a-z]/ : /[A-Z]/;
        const dir = isW ? -1 : 1;
        const promoRow = isW ? 0 : 7;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                if (!p || p === '.' || !myP.test(p)) continue;
                const type = p.toLowerCase();

                if (type === 'p') {
                    const nr = r + dir;
                    if (nr >= 0 && nr < 8) {
                        if (!capsOnly && grid[nr][c] === '.') {
                            if (nr === promoRow) {
                                moves.push({ r, c, nr, nc: c, promo: 'q', cS: 900 });
                                moves.push({ r, c, nr, nc: c, promo: 'n', cS: 320 });
                            } else {
                                moves.push({ r, c, nr, nc: c, cS: (isW ? pst_p_w[nr * 8 + c] - pst_p_w[r * 8 + c] : pst_p_b[nr * 8 + c] - pst_p_b[r * 8 + c]) });
                                if (((isW && r === 6) || (!isW && r === 1)) && grid[r + dir * 2][c] === '.') {
                                    moves.push({ r, c, nr: r + dir * 2, nc: c, cS: 15 });
                                }
                            }
                        }
                        for (let dc of [-1, 1]) {
                            const nc = c + dc;
                            if (nc >= 0 && nc < 8) {
                                const target = grid[nr][nc];
                                if (oppP.test(target)) {
                                    const vic = target.toLowerCase();
                                    const score = vals[vic] * 10 - vals['p'] + 10000;
                                    if (nr === promoRow) {
                                        moves.push({ r, c, nr, nc, cap: true, promo: 'q', cS: score + 900 });
                                        moves.push({ r, c, nr, nc, cap: true, promo: 'n', cS: score + 320 });
                                    } else {
                                        moves.push({ r, c, nr, nc, cap: true, cS: score });
                                    }
                                } else if (ep && ep !== '-') {
                                    const epC = ep.charCodeAt(0) - 97;
                                    const epR = 8 - parseInt(ep[1]);
                                    if (nr === epR && nc === epC) {
                                        moves.push({ r, c, nr, nc, cap: true, ep: true, cS: 10000 + vals['p'] * 9 });
                                    }
                                }
                            }
                        }
                    }
                } else if (type === 'n' || type === 'k') {
                    const stps = type === 'n' ?
                        [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] :
                        [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

                    for (const s of stps) {
                        const nr = r + s[0], nc = c + s[1];
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const t = grid[nr][nc];
                            if (t === '.') {
                                if (!capsOnly) moves.push({ r, c, nr, nc, cS: 0 });
                            } else if (oppP.test(t)) {
                                moves.push({ r, c, nr, nc, cap: true, cS: vals[t.toLowerCase()] * 10 - vals[type] + 10000 });
                            }
                        }
                    }

                    if (!capsOnly && type === 'k') {
                        if (isW && r === 7 && c === 4) {
                            if (castling.includes('K') && grid[7][5] === '.' && grid[7][6] === '.' &&
                                !isAttacked(grid, 7, 4, false) && !isAttacked(grid, 7, 5, false) && !isAttacked(grid, 7, 6, false)) {
                                moves.push({ r: 7, c: 4, nr: 7, nc: 6, isCastle: true, cS: 40 });
                            }
                            if (castling.includes('Q') && grid[7][3] === '.' && grid[7][2] === '.' && grid[7][1] === '.' &&
                                !isAttacked(grid, 7, 4, false) && !isAttacked(grid, 7, 3, false) && !isAttacked(grid, 7, 2, false)) {
                                moves.push({ r: 7, c: 4, nr: 7, nc: 2, isCastle: true, cS: 35 });
                            }
                        } else if (!isW && r === 0 && c === 4) {
                            if (castling.includes('k') && grid[0][5] === '.' && grid[0][6] === '.' &&
                                !isAttacked(grid, 0, 4, true) && !isAttacked(grid, 0, 5, true) && !isAttacked(grid, 0, 6, true)) {
                                moves.push({ r: 0, c: 4, nr: 0, nc: 6, isCastle: true, cS: 40 });
                            }
                            if (castling.includes('q') && grid[0][3] === '.' && grid[0][2] === '.' && grid[0][1] === '.' &&
                                !isAttacked(grid, 0, 4, true) && !isAttacked(grid, 0, 3, true) && !isAttacked(grid, 0, 2, true)) {
                                moves.push({ r: 0, c: 4, nr: 0, nc: 2, isCastle: true, cS: 35 });
                            }
                        }
                    }
                } else {
                    const ds = [];
                    if (type === 'r' || type === 'q') ds.push([-1, 0], [1, 0], [0, -1], [0, 1]);
                    if (type === 'b' || type === 'q') ds.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
                    for (const d of ds) {
                        for (let s = 1; s < 8; s++) {
                            const nr = r + d[0] * s, nc = c + d[1] * s;
                            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                            const t = grid[nr][nc];
                            if (t === '.') {
                                if (!capsOnly) moves.push({ r, c, nr, nc, cS: 0 });
                            } else {
                                if (oppP.test(t)) {
                                    moves.push({ r, c, nr, nc, cap: true, cS: vals[t.toLowerCase()] * 10 - vals[type] + 10000 });
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    function makeMove(grid, m, isW, castling) {
        const p = grid[m.r][m.c];
        const t = grid[m.nr][m.nc];
        const undo = { p, t, castling, rookMove: null, epPawn: null };

        grid[m.nr][m.nc] = m.promo ? (isW ? m.promo.toUpperCase() : m.promo.toLowerCase()) : p;
        grid[m.r][m.c] = '.';

        if (m.ep) {
            const epR = isW ? m.nr + 1 : m.nr - 1;
            undo.epPawn = { r: epR, c: m.nc, p: grid[epR][m.nc] };
            grid[epR][m.nc] = '.';
        }

        if (p.toLowerCase() === 'k' && Math.abs(m.nc - m.c) === 2) {
            if (m.nc === 6) undo.rookMove = { r: m.r, c: 7, nr: m.r, nc: 5, p: grid[m.r][7] };
            else if (m.nc === 2) undo.rookMove = { r: m.r, c: 0, nr: m.r, nc: 3, p: grid[m.r][0] };

            if (undo.rookMove) {
                grid[undo.rookMove.nr][undo.rookMove.nc] = undo.rookMove.p;
                grid[undo.rookMove.r][undo.rookMove.c] = '.';
            }
        }

        let newCastling = castling;
        if (p === 'K') newCastling = newCastling.replace(/[KQ]/g, '');
        if (p === 'k') newCastling = newCastling.replace(/[kq]/g, '');
        if (p === 'R') {
            if (m.r === 7 && m.c === 0) newCastling = newCastling.replace('Q', '');
            if (m.r === 7 && m.c === 7) newCastling = newCastling.replace('K', '');
        }
        if (p === 'r') {
            if (m.r === 0 && m.c === 0) newCastling = newCastling.replace('q', '');
            if (m.r === 0 && m.c === 7) newCastling = newCastling.replace('k', '');
        }
        if (t === 'R') {
            if (m.nr === 7 && m.nc === 0) newCastling = newCastling.replace('Q', '');
            if (m.nr === 7 && m.nc === 7) newCastling = newCastling.replace('K', '');
        }
        if (t === 'r') {
            if (m.nr === 0 && m.nc === 0) newCastling = newCastling.replace('q', '');
            if (m.nr === 0 && m.nc === 7) newCastling = newCastling.replace('k', '');
        }
        if (newCastling === '') newCastling = '-';

        return { undo, newCastling };
    }

    function unmakeMove(grid, m, undo) {
        grid[m.r][m.c] = undo.p;
        grid[m.nr][m.nc] = undo.t;
        if (undo.epPawn) grid[undo.epPawn.r][undo.epPawn.c] = undo.epPawn.p;
        if (undo.rookMove) {
            grid[undo.rookMove.r][undo.rookMove.c] = undo.rookMove.p;
            grid[undo.rookMove.nr][undo.rookMove.nc] = '.';
        }
    }

    function toUCI(m) {
        return String.fromCharCode(97 + m.c) + (8 - m.r) + String.fromCharCode(97 + m.nc) + (8 - m.nr) + (m.promo || '');
    }

    return { computeHash, isAttacked, isInCheck, computeThreats, genMoves, makeMove, unmakeMove, toUCI };
})();