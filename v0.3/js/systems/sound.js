// =====================================================
// BGM と効果音
// ・音のファイルが無いときは、エラーにせず何もしない
// ・ブラウザは、遊ぶ人が一度クリックやキーを押すまで音を出せない決まりがある。
//   そのあいだに頼まれた BGM は覚えておき、音が出せるようになったら鳴らす。
//   効果音は、その時点で鳴らせなければ鳴らさない。
// =====================================================

// BGM は場面（シーン）をまたいで続くので、ファイル全体で1つだけ覚えておく
let current = null;     // 今鳴っている BGM
let currentKey = null;  // 今の BGM の名前
let pendingKey = null;  // 音が出せるようになるのを待っている BGM の名前

export class Sound {
  constructor(scene) {
    this.mgr = scene.sound;
    this.cache = scene.cache.audio;
    const assets = scene.registry.get('data').assets;
    this.defs = Object.fromEntries((assets.audio || []).map(a => [a.key, a]));
  }

  // その音のファイルが読み込めているか
  has(key) {
    return this.cache.exists(key);
  }

  vol(key) {
    const d = this.defs[key];
    return d && d.volume != null ? d.volume : 1;
  }

  // 効果音を1回鳴らす
  se(key) {
    if (!this.has(key) || this.mgr.locked) return;
    this.mgr.play(key, { volume: this.vol(key) });
  }

  // BGM を鳴らす（同じ曲がもう鳴っていれば、そのまま続ける）
  bgm(key) {
    if (currentKey === key && (current || pendingKey === key)) return;
    this.stopBgm();
    currentKey = key;
    if (!this.has(key)) return;
    if (this.mgr.locked) {
      pendingKey = key;
      this.mgr.once('unlocked', () => {
        if (pendingKey === key) { pendingKey = null; this.startBgm(key); }
      });
      return;
    }
    this.startBgm(key);
  }

  startBgm(key) {
    current = this.mgr.add(key, { loop: true, volume: this.vol(key) });
    current.play();
  }

  // BGM を止める
  stopBgm() {
    if (current) { current.stop(); current.destroy(); current = null; }
    currentKey = null;
    pendingKey = null;
  }
}
