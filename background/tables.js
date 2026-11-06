self.InChess = self.InChess || {};
self.InChess.tables = (function () {
    function rndBigInt() {
        const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
        const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
        return (high << 32n) | low;
    }

    const vals = { p: 100, n: 325, b: 335, r: 505, q: 950, k: 20000 };

    const pst_p_w = [
        0, 0, 0, 0, 0, 0, 0, 0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 15, 25, 35, 35, 25, 15, 10,
        5, 5, 15, 28, 28, 15, 5, 5,
        0, 0, 10, 25, 25, 10, 0, 0,
        5, -5, -10, 5, 5, -10, -5, 5,
        5, 10, 10, -25, -25, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0
    ];

    const pst_n = [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 5, 20, 25, 25, 20, 5, -30,
        -30, 5, 20, 25, 25, 20, 5, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ];

    const pst_b_w = [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -10, 10, 10, 15, 15, 10, 10, -10,
        -10, 5, 15, 20, 20, 15, 5, -10,
        -10, 5, 15, 20, 20, 15, 5, -10,
        -10, 10, 10, 15, 15, 10, 10, -10,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20
    ];

    const pst_r_w = [
        0, 0, 5, 10, 10, 5, 0, 0,
        15, 20, 20, 20, 20, 20, 20, 15,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 5, 10, 10, 5, 0, 0
    ];

    const pst_q = [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -10, 5, 5, 5, 5, 5, 5, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 5, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20
    ];

    const pst_k_w = [
        -40, -50, -50, -60, -60, -50, -50, -40,
        -40, -50, -50, -60, -60, -50, -50, -40,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -20, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        10, 10, -5, -10, -10, -5, 10, 10,
        20, 25, 5, 0, 0, 5, 25, 20,
        25, 35, 15, 0, 5, 10, 35, 25
    ];

    const pst_k_e = [
        -50, -40, -30, -20, -20, -30, -40, -50,
        -30, -20, -10, 0, 0, -10, -20, -30,
        -30, -10, 20, 30, 30, 20, -10, -30,
        -30, -10, 30, 40, 40, 30, -10, -30,
        -30, -10, 30, 40, 40, 30, -10, -30,
        -30, -10, 20, 30, 30, 20, -10, -30,
        -30, -30, 0, 0, 0, 0, -30, -30,
        -50, -30, -30, -30, -30, -30, -30, -50
    ];

    const mirror = Array(64).fill(0).map((_, i) => (7 - Math.floor(i / 8)) * 8 + (i % 8));
    const pst_p_b = pst_p_w.map((_, i) => pst_p_w[mirror[i]]);
    const pst_b_b = pst_b_w.map((_, i) => pst_b_w[mirror[i]]);
    const pst_r_b = pst_r_w.map((_, i) => pst_r_w[mirror[i]]);
    const pst_k_w_b = pst_k_w.map((_, i) => pst_k_w[mirror[i]]);
    const pst_k_e_b = pst_k_e.map((_, i) => pst_k_e[mirror[i]]);

    const pieceIndexMap = {
        P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5,
        p: 6, n: 7, b: 8, r: 9, q: 10, k: 11
    };

    const ZOBRIST = {
        pieces: Array.from({ length: 12 }, () => Array.from({ length: 64 }, () => rndBigInt())),
        castling: Array.from({ length: 16 }, () => rndBigInt()),
        ep: Array.from({ length: 9 }, () => rndBigInt()),
        side: rndBigInt()
    };

    const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;

    const killerMoves = Array.from({ length: 32 }, () => [null, null]);
    const historyTable = Array.from({ length: 64 }, () => new Int32Array(64));

    return {
        vals,
        pst_p_w, pst_n, pst_b_w, pst_r_w, pst_q, pst_k_w, pst_k_e,
        pst_p_b, pst_b_b, pst_r_b, pst_k_w_b, pst_k_e_b,
        pieceIndexMap, ZOBRIST,
        TT_EXACT, TT_ALPHA, TT_BETA,
        killerMoves, historyTable
    };
})();