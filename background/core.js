importScripts('tables.js', 'rules.js', 'engine.js');

let lastOpponent = null;
let lastOppElo = null;
const activeAnalysis = new Map();

self.InChess.engineSettings = {
    auto: false, delay: 500, alts: true, color: '#3d9a6d',
    thoughts: true, depth: 'auto', predicts: false,
    playElo: 'unlimited', playEloEnabled: false, playEloLevel: 6
};

chrome.storage.local.get('in_sets').then(s => {
    if (s.in_sets) Object.assign(self.InChess.engineSettings, s.in_sets);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'SETTINGS_CHANGED') {
        Object.assign(self.InChess.engineSettings, msg.settings);
        if (msg.settings && msg.settings.detector !== undefined) {
            activeAnalysis.clear();
        }
    } else if (msg.type === 'BOARD_CHANGED') {
        if (msg.oppElo) lastOppElo = msg.oppElo;

        if (msg.oppName && msg.oppName !== lastOpponent) {
            lastOpponent = msg.oppName;
            const phrases = [
                `Ну что, ${lastOpponent}, готовь жопу.`,
                `Опа, ${lastOpponent}, готовься отсосать.`,
                `Берегись, ${lastOpponent}, летающий хуй вылетел за тобой.`,
                `Эй, ${lastOpponent}, твоя жопа уже на волоске от потери девственности.`,
                `Закрываем 16 на 0 бомжа`
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
        const key = self.InChess.engine.getBoardKey(grid);
        self.InChess.engine.pushBoardKey(key);

        const currentTurn = p[1];
        if (currentTurn !== msg.myColor) {
            chrome.tabs.sendMessage(sender.tab.id, { type: 'CLEAR_THOUGHT' });
            chrome.tabs.sendMessage(sender.tab.id, { type: 'DRAW_MOVE', moves: { best: null } });
            chrome.tabs.sendMessage(sender.tab.id, { type: 'SHOW_NOTIFICATION', notifType: 'info', text: 'Ждем хода противника...', persist: false });
            activeAnalysis.delete(sender.tab.id);
            return;
        }

        if (activeAnalysis.get(sender.tab.id) === msg.fen) return;
        activeAnalysis.set(sender.tab.id, msg.fen);

        const engineSettings = { ...self.InChess.engineSettings };
        if (engineSettings.playEloEnabled && engineSettings.playElo === 'auto') {
            engineSettings.playElo = lastOppElo ? String(lastOppElo) : 'unlimited';
        }

        self.InChess.engine.analyzeEngine(msg.fen, msg.myColor, sender.tab.id, activeAnalysis, engineSettings);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    activeAnalysis.delete(tabId);
});