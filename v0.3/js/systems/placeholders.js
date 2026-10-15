// =====================================================
// 仮の図形（画像ファイルが無いときの代わり）
// assets.json に書かれた画像が読み込めなかったら、ここで同じ名前の絵を図形で作る。
// 絵は v0.2.0 と同じもの。作者のドット絵を置けば、そちらが優先される。
// =====================================================

// 床の模様（床・看板・木の下地に使う）
function floor(g) {
  g.fillStyle(0xd9d0be); g.fillRect(0, 0, 32, 32);
  g.fillStyle(0xc8bea9); g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32);
  g.fillRect(9, 11, 2, 2); g.fillRect(22, 24, 2, 2);
}

// キャラクターの体（丸みのある四角に目）
// （outer：外側の角の丸み / inner：内側の角の丸み）
function body(g, w, h, size, outer, inner, color, eyes) {
  const ox = (w - size) / 2, oy = (h - size) / 2;
  g.fillStyle(0x262241); g.fillRoundedRect(ox, oy, size, size, outer);
  g.fillStyle(color); g.fillRoundedRect(ox + 2, oy + 2, size - 4, size - 4, inner);
  eyes(ox, oy);
}

// 画像の名前ごとの描き方。g：お絵かき道具 / w,h：画像の大きさ
const DRAW = {
  tile_floor: (g) => floor(g),
  tile_wall: (g) => {
    g.fillStyle(0x5b5577); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x47425f); g.fillRect(0, 15, 32, 2); g.fillRect(15, 0, 2, 15); g.fillRect(6, 17, 2, 15); g.fillRect(24, 17, 2, 15);
  },
  tile_shed: (g) => {
    g.fillStyle(0x8a5a3c); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x6e452d); for (let i = 0; i < 4; i++) g.fillRect(i * 8, 0, 1, 32);
  },
  tile_sign: (g) => {
    floor(g);
    g.fillStyle(0x6e452d); g.fillRect(14, 14, 4, 16);
    g.fillStyle(0xf2e3c2); g.fillRect(4, 4, 24, 14);
    g.lineStyle(2, 0x6e452d); g.strokeRect(4, 4, 24, 14);
  },
  tile_tree: (g) => {
    floor(g);
    g.fillStyle(0x6e452d); g.fillRect(13, 20, 6, 10);
    g.fillStyle(0x4f9a5c); g.fillCircle(16, 14, 12);
    g.fillStyle(0x6fbf78); g.fillCircle(12, 10, 5);
  },
  tile_canal: (g) => {
    g.fillStyle(0x3b74c4); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x6aa3e8); g.fillRect(4, 8, 10, 2); g.fillRect(16, 20, 10, 2);
    g.fillStyle(0x2b5796); g.fillRect(0, 0, 3, 32);
  },
  manhole: (g) => {
    g.fillStyle(0x6f6f80); g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0x4c4c5e); g.strokeCircle(16, 16, 14); g.strokeCircle(16, 16, 9);
    g.fillStyle(0x4c4c5e); g.fillRect(6, 15, 20, 2); g.fillRect(15, 6, 2, 20);
  },
  // 主人公：青い四角に白い目
  player: (g, w, h) => body(g, w, h, 24, 7, 6, 0x3f7fd9, (ox, oy) => {
    g.fillStyle(0xffffff); g.fillRect(ox + 7, oy + 8, 3, 4); g.fillRect(ox + 14, oy + 8, 3, 4);
  }),
  // 住人：丸に黒い目
  hana: (g, w, h) => body(g, w, h, 24, 12, 10, 0xf29a52, (ox, oy) => {
    g.fillStyle(0x262241); g.fillRect(ox + 7, oy + 9, 3, 3); g.fillRect(ox + 14, oy + 9, 3, 3);
  }),
  takeru: (g, w, h) => body(g, w, h, 24, 12, 10, 0x7fd6a8, (ox, oy) => {
    g.fillStyle(0x262241); g.fillRect(ox + 7, oy + 9, 3, 3); g.fillRect(ox + 14, oy + 9, 3, 3);
  }),
  // ペロッパ：紫の丸に大きな目と舌
  pero: (g, w, h) => {
    const ox = (w - 30) / 2, oy = (h - 30) / 2;
    g.fillStyle(0x262241); g.fillCircle(ox + 15, oy + 15, 15);
    g.fillStyle(0xa86be0); g.fillCircle(ox + 15, oy + 15, 13);
    g.fillStyle(0xffffff); g.fillCircle(ox + 10, oy + 12, 4); g.fillCircle(ox + 20, oy + 12, 4);
    g.fillStyle(0x262241); g.fillCircle(ox + 10, oy + 13, 2); g.fillCircle(ox + 20, oy + 13, 2);
    g.fillStyle(0xff7fb0); g.fillRoundedRect(ox + 12, oy + 19, 6, 9, 3);
  },
  crate: (g, w, h) => {
    const ox = (w - 30) / 2, oy = (h - 30) / 2;
    g.fillStyle(0x262241); g.fillRect(ox, oy, 30, 30);
    g.fillStyle(0xb07a45); g.fillRect(ox + 2, oy + 2, 26, 26);
    g.lineStyle(3, 0x7a4f28); g.lineBetween(ox + 4, oy + 4, ox + 26, oy + 26); g.lineBetween(ox + 26, oy + 4, ox + 4, oy + 26);
    g.strokeRect(ox + 3, oy + 3, 24, 24);
  },
  mop: (g) => {
    g.fillStyle(0x8a5a3c); g.fillRect(0, 4, 12, 2);
    g.fillStyle(0xe8e8f0); g.fillRect(11, 0, 9, 10);
    g.fillStyle(0xb9b9c8); g.fillRect(11, 7, 9, 3);
  },
  net: (g) => {
    g.fillStyle(0x8a5a3c); g.fillRect(0, 6, 14, 2);
    g.lineStyle(2, 0xffffff); g.strokeCircle(22, 7, 6);
    g.lineStyle(1, 0xdddddd); g.lineBetween(17, 7, 27, 7); g.lineBetween(22, 2, 22, 12);
  },
  dot: (g) => { g.fillStyle(0xffe36e); g.fillCircle(3, 3, 3); },
  blob: (g) => {
    g.fillStyle(0xffd23f); g.fillCircle(7, 7, 7);
    g.fillStyle(0xffffff); g.fillCircle(5, 5, 2);
  },
};

// 描き方が決まっていない画像（新しく assets.json に足したものなど）は、ピンクの「？」の四角にする
function unknown(g, w, h) {
  g.fillStyle(0xff5f9e); g.fillRect(0, 0, w, h);
  g.fillStyle(0xffffff); g.fillRect(w / 2 - 2, h / 2 + 3, 4, 3); g.fillRect(w / 2 - 2, h / 2 - 7, 4, 8);
}

// 1枚の絵を作る
function makeOne(scene, key, w, h) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  (DRAW[key] || unknown)(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

// 読み込めなかった画像を、すべて仮の図形で作る。作った画像の名前の一覧を返す
export function makePlaceholders(scene, assets) {
  const made = [];
  for (const def of assets.images || []) {
    if (scene.textures.exists(def.key)) continue;
    makeOne(scene, def.key, def.width || 32, def.height || 32);
    made.push(def.key);
  }
  for (const def of assets.spritesheets || []) {
    if (scene.textures.exists(def.key)) continue;
    // キャラは「向き×コマ数」の分だけコマが必要。仮の図形では、全部のコマに同じ絵を使う
    makeOne(scene, def.key, def.frameWidth, def.frameHeight);
    const tex = scene.textures.get(def.key);
    const count = (def.directions || ['down']).length * (def.framesPerDirection || 1);
    for (let i = 0; i < count; i++) tex.add(i, 0, 0, 0, def.frameWidth, def.frameHeight);
    made.push(def.key);
  }
  return made;
}
