// =====================================================
// マス目の移動と、ワックスで滑るルール
// ゲーム本体（TownScene）と、パズル検証プログラム（tools/verify-puzzle.js）の
// 両方がこのファイルを使う。だから「ゲームと検証のルールが食い違う」ことがない。
// Phaser を使わない、ふつうの JavaScript だけで書いている。
//
// ルールの関数は「world（世界）」を受け取る。world は次の質問に答えられるもの：
//   world.isWax(x,y)    そのマスはワックスか
//   world.stopper(x,y)  そのマスは通れない（壁・人・木箱・ペロッパなど）か
//   world.canal(x,y)    そのマスは水路か
//   world.crateAt(x,y)  そのマスにある木箱（無ければ undefined）
// =====================================================

// 上下左右の向き
export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// マスの位置を "x,y" という文字にする（Set や Map で使うため）
export const K = (x, y) => x + ',' + y;
export const fromK = (k) => k.split(',').map(Number);

// マップの外は壁あつかい
const OUTSIDE = { tile: 'wall', solid: true, canal: false, examine: null };

// マップのデータ（data/maps/*.json）を読み取り、使いやすい形にする
export function parseMap(map) {
  const wax = new Set(), sources = new Set(), crates = [], npcs = [];
  let start = null, manhole = null;
  const cells = map.rows.map((row, y) => [...row].map((c, x) => {
    const def = map.legend[c];
    if (!def) throw new Error(`マップに、legend に無い文字「${c}」があります（横${x}・縦${y}）`);
    if (def.wax) wax.add(K(x, y));
    if (def.source) sources.add(K(x, y));
    if (def.crate) crates.push({ x, y });
    if (def.manhole) manhole = { x, y };
    if (def.npc) npcs.push({ id: def.npc, x, y });
    if (def.playerStart) start = { x, y };
    return { tile: def.tile, solid: !!def.solid, canal: !!def.canal, examine: def.examine || null };
  }));
  return {
    width: Math.max(...cells.map(r => r.length)), height: cells.length,
    cells, wax, sources, crates, npcs, start, manhole, arena: map.arena,
  };
}

// マスの情報を取り出す（マップの外なら壁）
export function cellAt(cells, x, y) {
  return (cells[y] && cells[y][x]) || OUTSIDE;
}

// 1歩進もうとしたときの結果を調べる
//   進めないとき → null
//   進めるとき   → { to: 進む先, crate: 押した木箱の情報 または null }
export function tryStep(w, p, d) {
  const n = { x: p.x + d.x, y: p.y + d.y };
  const cr = w.crateAt(n.x, n.y);
  if (w.stopper(n.x, n.y) && !cr) return null;   // 壁などには進めない
  if (w.canal(n.x, n.y)) return null;             // 自分から水路には入らない
  if (!cr) return { to: n, crate: null };

  // 木箱を押す：箱の先が通れなければ押せない
  let c = { x: n.x + d.x, y: n.y + d.y };
  if (w.stopper(c.x, c.y) || w.canal(c.x, c.y)) return null;
  // 箱はワックスの上なら、止まるところまで滑っていく
  let steps = 1;
  while (w.isWax(c.x, c.y)) {
    const m = { x: c.x + d.x, y: c.y + d.y };
    if (w.stopper(m.x, m.y) || w.canal(m.x, m.y)) break;
    c = m; steps++;
  }
  return { to: n, crate: { obj: cr, to: c, steps } };
}

// ワックスの上で、次の1マスがどうなるかを調べる
//   'fall' 水路に落ちる / 'stop' ぶつかって止まる / 'move' さらに滑る
export function slideStep(w, p, d) {
  const n = { x: p.x + d.x, y: p.y + d.y };
  if (w.canal(n.x, n.y)) return { type: 'fall', to: n };
  if (w.stopper(n.x, n.y)) return { type: 'stop' };
  return { type: 'move', to: n };
}

// モップで拭く場所を決める
// 目の前がワックス（木箱が乗っていない）なら目の前、そうでなく足元がワックスなら足元
export function wipeTarget(w, p, facing) {
  const f = { x: p.x + facing.x, y: p.y + facing.y };
  if (w.isWax(f.x, f.y) && !w.crateAt(f.x, f.y)) return f;
  if (w.isWax(p.x, p.y)) return { x: p.x, y: p.y };
  return null;
}
