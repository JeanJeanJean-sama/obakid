// =====================================================
// 会話ウィンドウ
// 文字を1文字ずつ出し、Z キーで次へ進む。
// =====================================================
import { txt } from './ui.js';

export class DialogBox {
  // scene：表示する場面 / sound：音の係 / opts：{ charsPerSec, blipEvery }（settings.json の dialog）
  constructor(scene, sound, opts) {
    this.scene = scene;
    this.sound = sound;
    this.speed = opts.charsPerSec;
    this.blipEvery = Math.max(1, opts.blipEvery || 1);

    const c = scene.add.container(0, 0).setDepth(20);
    const g = scene.add.graphics();
    g.fillStyle(0x262241, 0.95); g.fillRoundedRect(16, 360, 608, 104, 10);
    g.lineStyle(3, 0xffffff); g.strokeRoundedRect(16, 360, 608, 104, 10);
    this.text = txt(scene, 36, 376, '', 18).setWordWrapWidth(568, true).setLineSpacing(6);
    this.arrow = txt(scene, 600, 440, '▼', 14, '#ffe36e').setOrigin(0.5);
    c.add([g, this.text, this.arrow]);
    c.setVisible(false);
    this.box = c;
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
  }

  // 会話を始める。lines：画面ごとのセリフの配列 / onDone：全部読み終わったら呼ぶ
  open(lines, onDone) {
    this.d = { lines, i: 0, shown: 0, onDone };
    this.text.setText('');
    this.box.setVisible(true);
  }

  // 毎フレーム呼ぶ。z：決定ボタンが押されたか
  update(dt, z) {
    const d = this.d, line = d.lines[d.i];
    if (d.shown < line.length) {
      const before = Math.floor(d.shown);
      d.shown = Math.min(line.length, d.shown + dt * this.speed);
      if (z) d.shown = line.length; // Z で最後まで一気に表示
      const now = Math.floor(d.shown);
      // 文字送りの音（blipEvery 文字ごと。一気に表示したときは鳴らさない）
      if (!z && Math.floor(now / this.blipEvery) > Math.floor(before / this.blipEvery)) this.sound.se('se_text');
      this.text.setText(line.slice(0, now));
      this.arrow.setVisible(false);
      return;
    }
    this.arrow.setVisible(true);
    if (!z) return;
    d.i++; d.shown = 0;
    if (d.i >= d.lines.length) {
      this.box.setVisible(false);
      if (d.onDone) d.onDone();
    }
  }
}
