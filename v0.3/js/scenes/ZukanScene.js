// =====================================================
// 図鑑の場面（オバキッドを捕まえたあとに、町の場面の上に重ねて出す）
// 内容は data/obakid.json、見出しなどの文字は data/dialog.json の zukan にある。
// =====================================================
import { txt } from '../systems/ui.js';
import { Controls } from '../systems/input.js';
import { Sound } from '../systems/sound.js';

export class ZukanScene extends Phaser.Scene {
  constructor() { super('zukan'); }

  // data.id：どのオバキッドを表示するか（obakid.json の id）
  create(data) {
    const D = this.registry.get('data'), text = this.registry.get('text');
    const e = D.obakid.find(o => o.id === data.id) || D.obakid[0];
    const ch = D.characters[e.character] || {};
    const z = (k) => text.line('zukan.' + k);
    const f = (s) => text.fill(s);

    const c = this.add.container(320, 240);
    c.add([
      this.add.rectangle(0, 0, 540, 400, 0xfdfbff).setStrokeStyle(6, 0x262241),
      txt(this, 0, -170, z('title'), 20, '#ff5f9e').setOrigin(0.5),
      this.add.image(-170, -60, ch.image || e.character, 0).setScale(3),
      txt(this, -90, -120, `${z('no')}${e.no}　${f(e.name)}\n${z('category')}${f(e.category)}\n${z('habitat')}${f(e.habitat)}`, 16, '#262241').setLineSpacing(8),
      txt(this, -235, 20, `${f(e.description)}\n\n${z('memo')}${f(e.memo)}`, 15, '#262241').setWordWrapWidth(470, true).setLineSpacing(6),
      txt(this, 0, 170, z('again'), 16, '#5a5680').setOrigin(0.5),
    ]);

    this.ctl = new Controls(this);
    new Sound(this).se('me_zukan');
  }

  update() {
    // Z で、町の場面を最初からやり直す
    if (this.ctl.read().z) {
      const town = this.scene.get('town');
      this.scene.stop();
      town.scene.restart({});
    }
  }
}
