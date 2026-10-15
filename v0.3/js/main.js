// =====================================================
// ゲームの設定と起動
// Phaser 本体は index.html で ../lib/phaser.min.js から読み込んでいる。
// =====================================================
import { BootScene } from './scenes/BootScene.js';
import { TownScene } from './scenes/TownScene.js';
import { ZukanScene } from './scenes/ZukanScene.js';
import { bindTouchPad } from './systems/input.js';

bindTouchPad();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 480,
  backgroundColor: '#262241',
  pixelArt: true, // ドット絵がぼやけないようにする
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TownScene, ZukanScene], // 最初に BootScene（読み込み）が動く
};

// ドット風フォントの読み込みを少し待ってから起動する（最大1.5秒）
const fontReady = document.fonts
  ? Promise.race([document.fonts.load('16px "DotGothic16"'), new Promise(r => setTimeout(r, 1500))])
  : Promise.resolve();
fontReady.catch(() => {}).then(() => {
  // window.obakidGame は動作確認用（ブラウザの開発者ツールからゲームの中身を見られるようにする）
  window.obakidGame = new Phaser.Game(config);
});
