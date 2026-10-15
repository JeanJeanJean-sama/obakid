// =====================================================
// キャラクターの向きと歩きアニメーション
// assets.json の spritesheets に書いた並べ方（directions と framesPerDirection）を使う。
// 例：directions が ["down","left","right","up"]、framesPerDirection が 3 なら、
//     1行目＝下向きの3コマ、2行目＝左向きの3コマ…と並んだ画像になる。
// =====================================================

function sheetDef(scene, key) {
  return (scene.registry.get('data').assets.spritesheets || []).find(s => s.key === key);
}

const animKey = (key, dir) => `${key}-walk-${dir}`;

// 歩きアニメーションを登録する（読み込みが終わったあと1回だけ呼ぶ）
// 1つの向きに2コマ以上あるときだけ作る
export function createWalkAnims(scene, assets) {
  for (const def of assets.spritesheets || []) {
    const per = def.framesPerDirection || 1;
    if (per < 2) continue;
    const total = scene.textures.get(def.key).frameTotal - 1; // 「画像全体」のぶんを1つ引く
    (def.directions || ['down']).forEach((dir, i) => {
      const start = i * per, end = start + per - 1;
      if (end >= total || scene.anims.exists(animKey(def.key, dir))) return;
      scene.anims.create({
        key: animKey(def.key, dir),
        frames: scene.anims.generateFrameNumbers(def.key, { start, end }),
        frameRate: def.walkFps || 8,
        repeat: -1,
      });
    });
  }
}

// キャラの見た目を、向き（dir）と歩いているか（walking）に合わせる
export function setPose(sprite, dir, walking = false) {
  const scene = sprite.scene, key = sprite.texture.key;
  const def = sheetDef(scene, key);
  if (!def) return;
  if (walking && scene.anims.exists(animKey(key, dir))) {
    sprite.play(animKey(key, dir), true);
    return;
  }
  sprite.stop();
  const dirs = def.directions || ['down'];
  const i = Math.max(0, dirs.indexOf(dir));
  const frame = i * (def.framesPerDirection || 1);
  // コマが足りない画像のときは、最初のコマを使う
  sprite.setFrame(sprite.texture.has(frame) ? frame : 0);
}
