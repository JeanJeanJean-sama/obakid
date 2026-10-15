// =====================================================
// 起動・読み込みの場面
// 1. data/ のファイル（設定・セリフ・マップなど）を読み込む
// 2. assets.json に書かれた画像と音を読み込む（無いファイルは飛ばす）
// 3. 読み込めなかった画像は、仮の図形で作る
// 4. 町の場面（TownScene）を始める
// =====================================================
import { TextBank } from '../systems/text.js';
import { makePlaceholders } from '../systems/placeholders.js';
import { createWalkAnims } from '../systems/sprites.js';
import { txt } from '../systems/ui.js';

// 読み込む data/ のファイル
const DATA_FILES = {
  settings: 'data/settings.json',
  assets: 'data/assets.json',
  characters: 'data/characters.json',
  dialog: 'data/dialog.json',
  obakid: 'data/obakid.json',
  events: 'data/events.json',
  map: 'data/maps/plaza.json',
};

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.msg = txt(this, 320, 240, '読み込み中……', 18).setOrigin(0.5);
    for (const [name, file] of Object.entries(DATA_FILES)) this.load.json('data_' + name, file);
  }

  create() {
    // data/ のファイルがそろっているか確かめる（書き方を間違えると読み込めない）
    const D = {};
    for (const [name, file] of Object.entries(DATA_FILES)) {
      D[name] = this.cache.json.get('data_' + name);
      if (D[name] == null) {
        this.msg.setText(`${file} が読み込めませんでした。\nファイルの書き方（カンマやカッコ）を確認してください。`)
          .setAlign('center').setColor('#ff7fb0').setFontSize(16);
        console.error(`${file} が読み込めませんでした`);
        return;
      }
    }

    // セリフの中で置きかえる言葉：キャラの名前と、モップの回数
    const vars = { mopMax: D.settings.mop.uses };
    for (const [id, c] of Object.entries(D.characters)) if (c && c.name) vars[id] = c.name;
    this.registry.set('data', D);
    this.registry.set('text', new TextBank(D.dialog, vars));
    this.msg.setText(this.registry.get('text').line('loading.now'));

    // 画像と音を読み込む。無いファイルは「読み込みエラー」になるが、ここで記録して先へ進む
    const missing = [];
    this.load.on('loaderror', f => missing.push(f.key));
    for (const a of D.assets.images || []) this.load.image(a.key, a.file);
    for (const a of D.assets.spritesheets || []) {
      this.load.spritesheet(a.key, a.file, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
    }
    for (const a of D.assets.audio || []) this.load.audio(a.key, a.file);
    this.load.once('complete', () => this.finish(D, missing));
    this.load.start();
  }

  finish(D, missing) {
    const made = makePlaceholders(this, D.assets);
    createWalkAnims(this, D.assets);
    // 開発用のメモ（ブラウザの「開発者ツール」の Console に出る）
    const imgCount = (D.assets.images || []).length + (D.assets.spritesheets || []).length;
    const audio = (D.assets.audio || []).map(a => a.key);
    console.info(`画像：${imgCount - made.length} 枚を読み込み、${made.length} 枚は仮の図形で代用しました。`, made);
    console.info(`音：${audio.filter(k => !missing.includes(k)).length} 個を読み込み、${audio.filter(k => missing.includes(k)).length} 個はファイルが無いため鳴らしません。`);
    this.scene.start('town');
  }
}
