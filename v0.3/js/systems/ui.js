// =====================================================
// 画面づくりでよく使う、小さな道具
// =====================================================

// 文字のフォント（ドット風の DotGothic16。読み込めないときは他の日本語フォント）
export const FONT = '"DotGothic16","Hiragino Kaku Gothic ProN","Meiryo",sans-serif';

// 1マスの大きさ（ピクセル）。画面 640×480 ＝ 横20マス×縦15マス に合わせてあるので変えない
export const T = 32;

// マスの番号から、そのマスの真ん中のピクセル位置を出す
export const cx = (t) => t * T + T / 2;

// 文字を画面に出す
export function txt(scene, x, y, str, size = 16, color = '#ffffff') {
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: size + 'px', color, resolution: 2 });
}

// ふわっと浮かんで消える文字（「ツルッ！」など）
export function floatText(scene, x, y, str, color = '#ffffff') {
  const t = txt(scene, x, y, str, 16, color).setOrigin(0.5).setDepth(15).setStroke('#262241', 4);
  scene.tweens.add({ targets: t, y: y - 24, alpha: 0, duration: 900, onComplete: () => t.destroy() });
}
