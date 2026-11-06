window.InChess = window.InChess || {};
window.InChess.ui = window.InChess.ui || {};

(function () {
    const { Notifier } = window.InChess.ui.notifier;
    const { Viz } = window.InChess.ui.viz;
    const { EvalBar } = window.InChess.ui.evalbar;
    const { ArrayList } = window.InChess.ui.arraylist;
    const { Watermark } = window.InChess.ui.watermark;
    const { Menu } = window.InChess.ui.menu;
    const { hexToRgb } = window.InChess.ui.theme;

    const notifier = new Notifier();
    const viz = new Viz();
    const evalBar = new EvalBar();
    const arrayList = new ArrayList();
    const watermark = new Watermark();
    const menu = new Menu();

    menu.evalBar = evalBar;
    evalBar.getMenu = () => menu;
    notifier.getMenu = () => menu;
    arrayList.getMenu = () => menu;
    watermark.getMenu = () => menu;

    window.InChess.ui.notifierInstance = notifier;
    window.InChess.ui.vizInstance = viz;
    window.InChess.ui.evalBarInstance = evalBar;
    window.InChess.ui.arrayListInstance = arrayList;
    window.InChess.ui.watermarkInstance = watermark;
    window.InChess.ui.menuInstance = menu;
    window.InChess.ui.hexToRgb = hexToRgb;

    Object.assign(window.InChess.ui, {
        notifier: notifier,
        viz: viz,
        evalBar: evalBar,
        menu: menu,
        arrayList: arrayList,
        watermark: watermark
    });
})();