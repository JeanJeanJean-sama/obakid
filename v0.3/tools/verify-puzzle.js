// =====================================================
// パズル検証プログラム
// data/maps/plaza.json と data/settings.json を読み込み、
// ゲームと同じルール（js/systems/grid.js）で、あり得る動きをすべて試す（総当たり）。
//
// 動かし方（obakid フォルダで）：
//   node v0.3/tools/verify-puzzle.js
//
// 調べること：
//   1. モップ（settings.json の mop.uses 回）で解ける
//   2. モップがそれより1回少ないと解けない
//   3. 木箱の位置をワックスにすると、モップ（mop.uses 回）では解けない
// 「解ける」＝ワックスだまりを全部拭き取れる、という意味。
// 水路に落ちると、木箱は押したまま元の場所に戻される（ハートが1つ減る）。
// ハートが無くなる前なら落ちてもよい、として調べる。
// ペロッパが飛ばすワックス（ランダムな妨害）は考えない。
// =====================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIRS, K, parseMap, cellAt, tryStep, slideStep } from '../js/systems/grid.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (f) => JSON.parse(readFileSync(join(here, '..', 'data', f), 'utf8'));
const settings = readJson('settings.json');
const plaza = readJson('maps/plaza.json');
const MOP = settings.mop.uses;
const MAX_FALLS = settings.player.hearts - 1; // これ以上落ちると目を回してやり直し

const DIR_NAMES = { up: '上', down: '下', left: '左', right: '右' };
const pos = (p) => `(横${p.x},縦${p.y})`;

// ゲームの「世界」を、検証用に小さく作る
function makeWorld(m, npcSet, wax, crates) {
  const w = {
    isWax: (x, y) => wax.has(K(x, y)),
    crateAt: (x, y) => crates.find(c => c.x === x && c.y === y),
    stopper: (x, y) => cellAt(m.cells, x, y).solid || npcSet.has(K(x, y)) || !!w.crateAt(x, y),
    canal: (x, y) => cellAt(m.cells, x, y).canal,
  };
  return w;
}

// 総当たりで解けるかを調べる（幅優先探索：手数の少ない順にすべての状態を広げていく）
function solve(mapData, mopMax, maxFalls) {
  const m = parseMap(mapData);
  const npcSet = new Set(m.npcs.map(n => K(n.x, n.y)));
  const keyOf = (s) =>
    `${s.p.x},${s.p.y}|${s.crates.map(c => K(c.x, c.y)).sort().join(';')}|${[...s.wiped].sort().join(';')}|${s.falls}`;
  const solved = (s) => [...m.sources].every(k => s.wiped.has(k));

  const start = { p: { ...m.start }, crates: m.crates.map(c => ({ ...c })), wiped: new Set(), falls: 0 };
  const seen = new Map([[keyOf(start), null]]);
  let queue = [start];

  while (queue.length) {
    const next = [];
    for (const s of queue) {
      if (solved(s)) return { ok: true, states: seen.size, path: rebuild(seen, keyOf(s)) };
      const wax = new Set([...m.wax].filter(k => !s.wiped.has(k)));
      const w = makeWorld(m, npcSet, wax, s.crates);
      const push = (ns, action) => {
        const k = keyOf(ns);
        if (seen.has(k)) return;
        seen.set(k, { prev: keyOf(s), action });
        next.push(ns);
      };

      // 動く（4方向）
      for (const [name, d] of Object.entries(DIRS)) {
        const r = tryStep(w, s.p, d);
        if (!r) continue;
        const crates = s.crates.map(c => ({ ...c }));
        let note = '';
        if (r.crate) {
          const c = crates.find(c => c.x === r.crate.obj.x && c.y === r.crate.obj.y);
          c.x = r.crate.to.x; c.y = r.crate.to.y;
          note = `（木箱が${pos(c)}へ）`;
        }
        const w2 = makeWorld(m, npcSet, wax, crates);
        let p = r.to, falls = s.falls;
        while (w2.isWax(p.x, p.y)) {
          const st = slideStep(w2, p, d);
          if (st.type === 'fall') { p = { ...s.p }; falls++; note += '（水路に落ちて元の場所へ）'; break; }
          if (st.type === 'stop') break;
          p = st.to;
        }
        if (falls > maxFalls) continue;
        push({ p, crates, wiped: s.wiped, falls }, `${DIR_NAMES[name]}へ → ${pos(p)}${note}`);
      }

      // モップで拭く（向きはその場で自由に変えられるので、拭ける場所をすべて試す）
      if (s.wiped.size < mopMax) {
        const targets = [];
        let canFaceDry = false; // 拭けない向きを向けるなら、足元を拭ける
        for (const d of Object.values(DIRS)) {
          const f = { x: s.p.x + d.x, y: s.p.y + d.y };
          if (w.isWax(f.x, f.y) && !w.crateAt(f.x, f.y)) targets.push(f); else canFaceDry = true;
        }
        if (canFaceDry && w.isWax(s.p.x, s.p.y)) targets.push({ ...s.p });
        for (const t of targets) {
          const wiped = new Set(s.wiped); wiped.add(K(t.x, t.y));
          const src = m.sources.has(K(t.x, t.y)) ? '（ワックスだまり）' : '';
          push({ p: s.p, crates: s.crates, wiped, falls: s.falls }, `${pos(t)}を拭く${src}`);
        }
      }
    }
    queue = next;
  }
  return { ok: false, states: seen.size, path: null };
}

// 解き方の手順を、ゴールからさかのぼって組み立てる
function rebuild(seen, key) {
  const steps = [];
  for (let e = seen.get(key); e; e = seen.get(e.prev)) steps.unshift(e.action);
  return steps;
}

// 木箱の位置をワックスにしたマップを作る
function withoutCrates(mapData) {
  const copy = JSON.parse(JSON.stringify(mapData));
  const crateChars = Object.entries(copy.legend).filter(([, d]) => d.crate).map(([c]) => c);
  const waxChar = Object.entries(copy.legend).find(([, d]) => d.wax && !d.source && !d.crate)[0];
  copy.rows = copy.rows.map(r => [...r].map(c => crateChars.includes(c) ? waxChar : c).join(''));
  return copy;
}

// ===== 検証の実行 =====
const checks = [
  { title: `モップ${MOP}回で解ける`, map: plaza, mop: MOP, expect: true },
  { title: `モップ${MOP - 1}回では解けない`, map: plaza, mop: MOP - 1, expect: false },
  { title: `木箱が無いと（木箱の位置をワックスにすると）、モップ${MOP}回では解けない`, map: withoutCrates(plaza), mop: MOP, expect: false },
];

console.log(`パズル検証：${plaza.name}`);
console.log(`（モップ ${MOP} 回、水路に落ちてよい回数 ${MAX_FALLS} 回までとして調べます）\n`);
let allGood = true;
let firstSolution = null;
for (const c of checks) {
  const withFalls = solve(c.map, c.mop, MAX_FALLS);
  const noFalls = solve(c.map, c.mop, 0);
  const good = withFalls.ok === c.expect && noFalls.ok === c.expect;
  allGood = allGood && good;
  console.log(`${good ? '○' : '×'} ${c.title}`);
  console.log(`    結果：${withFalls.ok ? '解ける' : '解けない'}（調べた状態 ${withFalls.states.toLocaleString()} 通り）`);
  console.log(`    水路に1回も落ちない場合：${noFalls.ok ? '解ける' : '解けない'}（${noFalls.states.toLocaleString()} 通り）`);
  if (withFalls.ok && !firstSolution) firstSolution = withFalls.path;
}

if (firstSolution) {
  console.log(`\n解き方の一例（いちばん手数の少ない手順・${firstSolution.length} 手）：`);
  firstSolution.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));
}
console.log(`\n${allGood ? 'すべて期待どおりです。' : '期待と違う結果があります。パズルの配置を見直してください。'}`);
process.exit(allGood ? 0 : 1);
