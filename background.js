let lastOpponent = null;
let engineSettings = { auto: false, delay: 500, alts: true, color: '#3d9a6d' };

chrome.storage.local.get('in_sets').then(s => { if (s.in_sets) engineSettings = s.in_sets; });

const activeAnalysis = new Map(); // tabId -> fen

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'SETTINGS_CHANGED') {
    engineSettings = msg.settings;
  } else if (msg.type === 'BOARD_CHANGED') {
    if (msg.oppName && msg.oppName !== lastOpponent) {
      lastOpponent = msg.oppName;
      const phrases = [
        `Ну что, ${lastOpponent}, готовь жопень...`,
        `Опа, ${lastOpponent}, пришел за добавкой?`,
        `Берегись, ${lastOpponent}, сегодня я не в духе.`,
        `Эй, ${lastOpponent}, готов к мастер-классу?`,
        `Смотрите-ка, ${lastOpponent} решил рискнуть...`
      ];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      chrome.tabs.sendMessage(sender.tab.id, { type: 'SHOW_NOTIFICATION', notifType: 'info', text: randomPhrase, persist: false });
    }
    const p = msg.fen.split(' ');
    const grid = p[0].split('/').map(r => {
      const row = [];
      for (let c of r) {
        if (/[1-8]/.test(c)) { for (let j = 0; j < parseInt(c); j++) row.push('.'); }
        else row.push(c);
      }
      return row;
    });
    const key = getBoardKey(grid);
    boardHistory.push(key);
    if (boardHistory.length > 50) boardHistory.shift();

    const currentTurn = p[1];
    if (currentTurn !== msg.myColor) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'DRAW_MOVE', moves: { best: null } });
      chrome.tabs.sendMessage(sender.tab.id, { type: 'SHOW_NOTIFICATION', notifType: 'info', text: 'Ждем хода противника...', persist: false });
      activeAnalysis.delete(sender.tab.id);
      return;
    }

    if (activeAnalysis.get(sender.tab.id) === msg.fen) return;
    activeAnalysis.set(sender.tab.id, msg.fen);

    analyzeEngine(msg.fen, msg.myColor, sender.tab.id);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activeAnalysis.delete(tabId);
});
const engStats = { bests: 0, brills: 0 };
let moveCount = 0;
let evalHistory = [];
let boardHistory = [];
const transpositionTable = new Map();

function getBoardKey(grid) {
  return grid.map(r => r.join('')).join('/');
}
const vals = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };
const pst_p_w = [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
const pst_n = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
const pst_b_w = [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20];
const pst_r_w = [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0];
const pst_q = [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20];
const pst_k_w = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
const pst_k_e = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];

const mirror = Array(64).fill(0).map((_, i) => (7 - Math.floor(i / 8)) * 8 + (i % 8));
const pst_p_b = pst_p_w.map((_, i) => pst_p_w[mirror[i]]);
const pst_b_b = pst_b_w.map((_, i) => pst_b_w[mirror[i]]);
const pst_r_b = pst_r_w.map((_, i) => pst_r_w[mirror[i]]);
const pst_k_w_b = pst_k_w.map((_, i) => pst_k_w[mirror[i]]);
const pst_k_e_b = pst_k_e.map((_, i) => pst_k_e[mirror[i]]);

const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;

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

let currentNodes = 0;

function evaluate(grid) {
  currentNodes++;
  let score = 0, tMat = 0;
  let wKr = -1, wKc = -1, bKr = -1, bKc = -1;
  let wB = 0, bB = 0, wP = 0, bP = 0, wR = 0, bR = 0;
  const wPawnCols = [0, 0, 0, 0, 0, 0, 0, 0], bPawnCols = [0, 0, 0, 0, 0, 0, 0, 0];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = grid[r][c];
      if (p === '.') continue;
      const idx = r * 8 + c;
      const isW = p === p.toUpperCase();
      const type = p.toLowerCase();
      let val = vals[type];

      if (type !== 'k') {
        if (type !== 'p') tMat += val;
        if (isW) {
          if (type === 'p') { val += pst_p_w[idx]; wPawnCols[c]++; }
          else if (type === 'n') val += pst_n[idx];
          else if (type === 'b') { val += pst_b_w[idx]; wB++; }
          else if (type === 'r') { val += pst_r_w[idx]; wR++; if (r === 1) val += 20; }
          else if (type === 'q') val += pst_q[idx];
          score += val;
        } else {
          if (type === 'p') { val += pst_p_b[idx]; bPawnCols[c]++; }
          else if (type === 'n') val += pst_n[idx]; // pst_n is symmetric
          else if (type === 'b') { val += pst_b_b[idx]; bB++; }
          else if (type === 'r') { val += pst_r_b[idx]; bR++; if (r === 6) val += 20; }
          else if (type === 'q') val += pst_q[idx];
          score -= val;
        }
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

  for (let i = 0; i < 8; i++) {
    if (wPawnCols[i] > 1) score -= 15;
    if (bPawnCols[i] > 1) score += 15;
    if (wPawnCols[i] > 0 && (i === 0 || wPawnCols[i - 1] === 0) && (i === 7 || wPawnCols[i + 1] === 0)) score -= 10;
    if (bPawnCols[i] > 0 && (i === 0 || bPawnCols[i - 1] === 0) && (i === 7 || bPawnCols[i + 1] === 0)) score += 10;
  }

  return score;
}

function genMoves(grid, isW, capsOnly = false) {
  const moves = [];
  const myP = isW ? /[A-Z]/ : /[a-z]/;
  const oppP = isW ? /[a-z]/ : /[A-Z]/;
  const dir = isW ? -1 : 1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = grid[r][c];
      if (!p || p === '.' || !myP.test(p)) continue;
      const type = p.toLowerCase();
      const idx = r * 8 + c;

      if (type === 'p') {
        const nr = r + dir;
        if (nr >= 0 && nr < 8) {
          if (!capsOnly && grid[nr][c] === '.') {
            moves.push({ r, c, nr, nc: c, cS: (isW ? pst_p_w[nr * 8 + c] - pst_p_w[idx] : pst_p_b[nr * 8 + c] - pst_p_b[idx]) });
            if (((isW && r === 6) || (!isW && r === 1)) && grid[r + dir * 2][c] === '.') {
              moves.push({ r, c, nr: r + dir * 2, nc: c, cS: 10 });
            }
          }
          if (c > 0 && oppP.test(grid[nr][c - 1])) {
            const vic = grid[nr][c - 1].toLowerCase();
            moves.push({ r, c, nr, nc: c - 1, cap: true, cS: vals[vic] * 10 - vals['p'] + 1000 });
          }
          if (c < 7 && oppP.test(grid[nr][c + 1])) {
            const vic = grid[nr][c + 1].toLowerCase();
            moves.push({ r, c, nr, nc: c + 1, cap: true, cS: vals[vic] * 10 - vals['p'] + 1000 });
          }
        }
      } else if (type === 'n' || type === 'k') {
        const stps = type === 'n' ? [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] : [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (const s of stps) {
          const nr = r + s[0], nc = c + s[1];
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const t = grid[nr][nc];
            if (t === '.') {
              if (!capsOnly) moves.push({ r, c, nr, nc, cS: 0 });
            } else if (oppP.test(t)) {
              moves.push({ r, c, nr, nc, cap: true, cS: vals[t.toLowerCase()] * 10 - vals[type] + 1000 });
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
              if (oppP.test(t)) moves.push({ r, c, nr, nc, cap: true, cS: vals[t.toLowerCase()] * 10 - vals[type] + 1000 });
              break;
            }
          }
        }
      }
    }
  }
  return moves.sort((a, b) => b.cS - a.cS);
}

function qSearch(grid, alpha, beta, isW) {
  const standPat = isW ? evaluate(grid) : -evaluate(grid);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const moves = genMoves(grid, isW, true);
  for (const m of moves) {
    const p = grid[m.r][m.c], t = grid[m.nr][m.nc];
    grid[m.nr][m.nc] = p; grid[m.r][m.c] = '.';
    const score = -qSearch(grid, -beta, -alpha, !isW);
    grid[m.r][m.c] = p; grid[m.nr][m.nc] = t;

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function minimax(grid, depth, alpha, beta, isW) {
  const key = getBoardKey(grid) + isW;
  const cached = transpositionTable.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.flag === TT_EXACT) return cached.score;
    if (cached.flag === TT_ALPHA && cached.score <= alpha) return alpha;
    if (cached.flag === TT_BETA && cached.score >= beta) return beta;
  }

  if (depth <= 0) return qSearch(grid, alpha, beta, isW);

  const moves = genMoves(grid, isW);
  if (moves.length === 0) return -20000 - depth;

  let bestScore = -Infinity;
  let bestMove = null;
  const oldAlpha = alpha;

  for (const m of moves) {
    const p = grid[m.r][m.c], t = grid[m.nr][m.nc];
    grid[m.nr][m.nc] = p; grid[m.r][m.c] = '.';
    const score = -minimax(grid, depth - 1, -beta, -alpha, !isW);
    grid[m.r][m.c] = p; grid[m.nr][m.nc] = t;

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  let flag = TT_EXACT;
  if (bestScore <= oldAlpha) flag = TT_ALPHA;
  else if (bestScore >= beta) flag = TT_BETA;

  transpositionTable.set(key, { score: bestScore, depth, flag, move: bestMove });
  if (transpositionTable.size > 100000) transpositionTable.clear();

  return bestScore;
}

async function analyzeEngine(fen, myColor, tabId) {
  if (activeAnalysis.get(tabId) !== fen) return;
  
  currentNodes = 0;
  chrome.tabs.sendMessage(tabId, { type: 'SHOW_NOTIFICATION', notifType: 'calc', text: 'Думаю...', persist: true });

  const p = fen.split(' ');
  const isW = p[1] === 'w';
  const grid = p[0].split('/').map(r => {
    const row = [];
    for (let c of r) {
      if (/[1-8]/.test(c)) { for (let j = 0; j < parseInt(c); j++) row.push('.'); }
      else row.push(c);
    }
    return row;
  });

  const rootEval = isW ? evaluate(grid) : -evaluate(grid);

  let maxDepth = 3;
  let tMat = 0;
  for (let r of grid) for (let c of r) if (c !== '.' && c.toLowerCase() !== 'k' && c.toLowerCase() !== 'p') tMat += vals[c.toLowerCase()];
  if (tMat < 3000) maxDepth = 4;
  if (tMat < 1500) maxDepth = 5;

  let bestMoveUCI = null;
  let bestEval = -Infinity;
  let allMovesEvals = [];
  for (let d = 1; d <= maxDepth; d++) {
    const moves = genMoves(grid, isW);
    if (bestMoveUCI) {
      moves.sort((a, b) => {
        const uciA = String.fromCharCode(97 + a.c) + (8 - a.r) + String.fromCharCode(97 + a.nc) + (8 - a.nr);
        const uciB = String.fromCharCode(97 + b.c) + (8 - b.r) + String.fromCharCode(97 + b.nc) + (8 - b.nr);
        if (uciA === bestMoveUCI) return -1;
        if (uciB === bestMoveUCI) return 1;
        return 0;
      });
    }

    allMovesEvals = [];
    for (const m of moves) {
      const pc = grid[m.r][m.c], target = grid[m.nr][m.nc];
      grid[m.nr][m.nc] = pc; grid[m.r][m.c] = '.';
      let v = -minimax(grid, d - 1, -Infinity, Infinity, !isW);

      const nKey = getBoardKey(grid);
      const repeats = boardHistory.filter(h => h === nKey).length;
      if (repeats >= 1) v -= 500;
      if (repeats >= 2) v -= 5000;

      grid[m.r][m.c] = pc; grid[m.nr][m.nc] = target;

      if (activeAnalysis.get(tabId) !== fen) return;

      const uci = String.fromCharCode(97 + m.c) + (8 - m.r) + String.fromCharCode(97 + m.nc) + (8 - m.nr);
      allMovesEvals.push({ uci, eval: v, m });
    }
    allMovesEvals.sort((a, b) => b.eval - a.eval);
    bestMoveUCI = allMovesEvals[0].uci;
    bestEval = allMovesEvals[0].eval;

    if (activeAnalysis.get(tabId) !== fen) return;
    chrome.tabs.sendMessage(tabId, { type: 'UPDATE_CALC', text: `Глубина ${d} | Узлы: ${currentNodes}` });
    await new Promise(r => setTimeout(r, 0));
  }

  const bM = allMovesEvals[0];
  const aM = allMovesEvals[1];
  let isBrill = aM && (bM.eval - aM.eval) >= 200;

  let reason = "Оптимальный ход";
  if (bM.eval >= 20000) reason = "Мат!";
  else if (isBrill) reason = "Блестящий ход!";
  else if (bM.m.cap) reason = "Забираем фигуру";
  else if (bM.eval > rootEval + 50) reason = "Улучшаем позицию";

  const res = {
    best: bM.uci,
    alt1: allMovesEvals[1] ? allMovesEvals[1].uci : null,
    alt2: allMovesEvals[2] ? allMovesEvals[2].uci : null,
    isBrill
  };

  if (activeAnalysis.get(tabId) !== fen) return;

  chrome.tabs.sendMessage(tabId, { type: 'DRAW_MOVE', moves: res });
  chrome.tabs.sendMessage(tabId, {
    type: 'SHOW_NOTIFICATION',
    notifType: isBrill ? 'info' : 'success',
    text: `<span class="move-text">${res.best}</span> - ${reason}`,
    persist: false
  });

  if (engineSettings.auto) {
    chrome.tabs.sendMessage(tabId, { type: 'AUTO_MOVE', uci: res.best, sourceFen: fen });
  }

  moveCount++;
  const relEval = rootEval;
  evalHistory.push(relEval);

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
    if (relEval > 300) verdict = 'Вы доминируете';
    else if (relEval > 100) verdict = 'У вас преимущество';
    else if (relEval > -100) verdict = 'Равная игра';
    else if (relEval > -300) verdict = 'Противник давит';
    else verdict = 'Противник доминирует';

    let trendStr = trend > 50 ? 'Улучшение' : (trend < -50 ? 'Ухудшение' : 'Стабильно');
    const matStr = matDiff > 0 ? `+${matDiff}` : `${matDiff}`;
    const evalStr = relEval > 0 ? `+${(relEval / 100).toFixed(1)}` : `${(relEval / 100).toFixed(1)}`;

    const statsText = `${verdict} | ${evalStr} | Мат: ${matStr} | ${trendStr}`;

    setTimeout(() => {
      if (activeAnalysis.get(tabId) === fen) {
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_NOTIFICATION',
          notifType: 'info',
          text: statsText,
          persist: false
        });
      }
    }, 5000);
  }
}
