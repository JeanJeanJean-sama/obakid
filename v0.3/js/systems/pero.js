// =====================================================
// ペロッパの動き
//   PeroSpits：パズル中に、マンホールからワックスの塊を飛ばす（妨害）
//   PeroBoss ：ペロッパとの勝負（うろうろ → 予告 → 突進 → 壁にぶつかると目を回す）
// 速さや時間の数値は data/settings.json の spit と boss にある。
// =====================================================
import { DIRS, K } from './grid.js';
import { cx, txt, floatText } from './ui.js';
import { setPose } from './sprites.js';

// ===== ワックス飛ばし =====
export class PeroSpits {
  constructor(scene) {
    this.s = scene;
    this.timer = 0;
    this.list = [];
    this.g = scene.add.graphics().setDepth(2); // 落下地点の影
  }

  update(dt) {
    const s = this.s, S = s.S.spit;
    // 物置でモップを取ったあと、主人公が広場にいるあいだだけ飛ばしてくる
    if (s.phase === 'town' && s.f.hasMop && s.inArena(s.pt.x, s.pt.y)) {
      this.timer += dt;
      if (this.timer >= S.intervalSec) { this.timer = 0; this.fire(); }
    }
    this.g.clear();
    this.list = this.list.filter(sp => {
      sp.t -= dt;
      const r = 4 + 12 * (1 - sp.t / S.flightSec); // 落ちてくるほど影が大きくなる
      this.g.fillStyle(0x262241, 0.35); this.g.fillEllipse(cx(sp.x), cx(sp.y) + 6, r * 2, r);
      if (sp.t > 0) return true;
      // 着地
      sp.spr.destroy();
      s.snd.se('se_splat');
      floatText(s, cx(sp.x), cx(sp.y) - 10, s.text.line('popups.splat'), '#ffd23f');
      if (s.pt.x === sp.x && s.pt.y === sp.y && s.damage(1)) floatText(s, s.pl.x, s.pl.y - 30, s.text.line('popups.hitByWax'), '#ff7fb0');
      return false;
    });
  }

  // 主人公が今いるマスをねらって、塊を飛ばす
  fire() {
    const s = this.s, S = s.S.spit;
    const mx = cx(s.mh.x), my = cx(s.mh.y), t = { ...s.pt };
    s.snd.se('se_spit');
    s.peek.setAlpha(1).setY(my - 6);
    s.tweens.add({ targets: s.peek, y: my - 22, duration: 180, yoyo: true, hold: 400, onComplete: () => s.peek.setAlpha(0) });
    const spr = s.add.image(mx, my - 20, 'blob').setDepth(8);
    const sx = mx, sy = my - 20, ex = cx(t.x), ey = cx(t.y);
    s.tweens.addCounter({
      from: 0, to: 1, duration: S.flightSec * 1000,
      onUpdate: tw => {
        const v = tw.getValue();
        if (!spr.active) return;
        spr.setPosition(sx + (ex - sx) * v, sy + (ey - sy) * v - Math.sin(v * Math.PI) * S.arcHeight);
      },
    });
    this.list.push({ x: t.x, y: t.y, t: S.flightSec, spr });
  }

  // 飛んでいる塊を全部消す
  clear() {
    this.list.forEach(sp => sp.spr.destroy());
    this.list = [];
    this.g.clear();
  }
}

// ===== ペロッパとの勝負 =====
export class PeroBoss {
  constructor(scene) {
    const s = scene, B = s.S.boss, mh = s.mh;
    this.s = s; this.B = B;
    // マンホールの右どなりに飛び出す
    this.x = mh.x + 1; this.y = mh.y;
    this.hp = B.hp; this.lv = 0;
    this.state = 'hop'; this.t = 0.6; this.cd = B.cooldownSec.first; this.dir = null;
    if (s.pt.x === this.x && s.pt.y === this.y) this.y += 1;

    const img = s.D.characters.pero.image;
    this.spr = s.add.sprite(cx(mh.x), cx(mh.y), img).setDepth(4);
    setPose(this.spr, 'down');
    s.tweens.add({ targets: this.spr, x: cx(this.x), y: cx(this.y), duration: 400 });
    s.tweens.add({ targets: this.spr, scale: { from: 0.3, to: 1 }, duration: 400 });
    this.mark = txt(s, 0, 0, s.text.line('popups.alert'), 20, '#ff5f9e').setOrigin(0.5).setDepth(9).setStroke('#262241', 4).setVisible(false);
    this.stars = txt(s, 0, 0, s.text.line('popups.dizzy'), 14, '#ffe36e').setOrigin(0.5).setDepth(9).setStroke('#262241', 3).setVisible(false);
  }

  // 捕まえた回数（lv）に応じて変わる数値：最初の値＋lv×perLevel（ただし min より小さくしない）
  byLevel(p) {
    return Math.max(p.min, p.start + p.perLevel * this.lv);
  }

  // 1マス動く。通ったあとにはワックスの跡が残る
  move(x, y, dur) {
    this.s.trails.set(K(this.x, this.y), this.s.clock + this.B.trailSec);
    this.x = x; this.y = y;
    this.s.tweens.add({ targets: this.spr, x: cx(x), y: cx(y), duration: dur });
  }

  // 主人公と同じ列・行にいて、あいだに邪魔がなく、2マス以上離れていれば、突進する向きを返す
  aligned() {
    const s = this.s, p = s.pt;
    if (!s.inArena(p.x, p.y)) return null;
    let d = null;
    if (this.x === p.x && this.y !== p.y) d = { x: 0, y: Math.sign(p.y - this.y) };
    else if (this.y === p.y && this.x !== p.x) d = { x: Math.sign(p.x - this.x), y: 0 };
    if (!d) return null;
    let x = this.x + d.x, y = this.y + d.y, dist = 1;
    while (!(x === p.x && y === p.y)) {
      if (!s.bossFree(x, y)) return null;
      x += d.x; y += d.y; dist++;
    }
    return dist >= this.B.minDashDistance ? d : null;
  }

  // 毎フレーム呼ぶ
  update(dt) {
    const s = this.s, B = this.B;
    this.t -= dt; this.cd -= dt;
    this.mark.setPosition(this.spr.x, this.spr.y - 26).setVisible(this.state === 'tele');
    this.stars.setPosition(this.spr.x + Math.sin(s.clock * 8) * 4, this.spr.y - 24).setVisible(this.state === 'dizzy');

    if (this.state === 'wander') {
      // 突進できるなら、予告（「！」とぷるぷる）に入る
      const d = this.cd <= 0 && this.aligned();
      if (d) {
        this.state = 'tele'; this.dir = d; this.t = this.byLevel(B.telegraphSec);
        s.tweens.add({ targets: this.spr, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: Math.floor(this.t / 0.12), onComplete: () => this.spr.setAngle(0) });
        return;
      }
      // うろうろ歩く
      if (this.t <= 0) {
        this.t = this.byLevel(B.wanderStepSec);
        const opts = Object.values(DIRS).map(d => ({ x: this.x + d.x, y: this.y + d.y }))
          .filter(n => s.bossFree(n.x, n.y) && !(n.x === s.pt.x && n.y === s.pt.y));
        if (opts.length) {
          // chaseChance の確率で、主人公と同じ列・行にそろうように動く
          const p = s.pt, dx = p.x - this.x, dy = p.y - this.y;
          let n = Phaser.Utils.Array.GetRandom(opts);
          if (Math.random() < B.chaseChance && s.inArena(p.x, p.y)) {
            const want = Math.abs(dx) <= Math.abs(dy) ? { x: this.x + Math.sign(dx), y: this.y } : { x: this.x, y: this.y + Math.sign(dy) };
            const hit = opts.find(o => o.x === want.x && o.y === want.y);
            if (hit) n = hit;
          }
          this.move(n.x, n.y, 150);
        }
      }
    } else if (this.state === 'tele') {
      if (this.t <= 0) { this.state = 'dash'; this.t = 0; s.snd.se('se_dash'); }
    } else if (this.state === 'dash') {
      if (this.t > 0) return;
      this.t = B.dashStepSec;
      const n = { x: this.x + this.dir.x, y: this.y + this.dir.y };
      // 主人公にぶつかった
      if (n.x === s.pt.x && n.y === s.pt.y) {
        if (s.damage(1)) floatText(s, s.pl.x, s.pl.y - 24, s.text.line('popups.rammed'), '#ff7fb0');
        this.state = 'wander'; this.cd = B.cooldownSec.afterHitPlayer; this.t = 0.4;
        return;
      }
      // 壁や木箱にぶつかって目を回す
      if (!s.bossFree(n.x, n.y)) {
        this.state = 'dizzy'; this.t = this.byLevel(B.dizzySec); this.spr.setAngle(0);
        s.snd.se('se_dizzy');
        s.cameras.main.shake(150, 0.008);
        floatText(s, this.spr.x, this.spr.y - 20, s.text.line('popups.wallHit'), '#ffffff');
        this.wob = s.tweens.add({ targets: this.spr, angle: { from: -20, to: 20 }, duration: 200, yoyo: true, repeat: Math.floor(this.t / 0.4), onComplete: () => this.spr.setAngle(0) });
        return;
      }
      this.move(n.x, n.y, 45);
    } else if (this.state === 'dizzy') {
      if (this.t <= 0) { this.state = 'wander'; this.cd = B.cooldownSec.afterDizzy; this.t = 0.3; }
    } else if (this.state === 'hop') {
      if (this.t <= 0) { this.state = 'wander'; this.t = 0.3; }
    }
  }

  // 網が当たった。facing：主人公の向き
  netHit(facing) {
    const s = this.s;
    if (this.state === 'dizzy') return this.hit();
    // 目を回していないと、ツルンとすべって逃げる
    floatText(s, this.spr.x, this.spr.y - 20, s.text.line('popups.netSlip'), '#ffe36e');
    const away = { x: this.x + facing.x, y: this.y + facing.y };
    if (s.bossFree(away.x, away.y)) this.move(away.x, away.y, 120);
    this.state = 'hop'; this.t = 0.4; this.cd = Math.min(this.cd, 0.3);
  }

  // 目を回しているところを網で捕まえた
  hit() {
    const s = this.s, B = this.B;
    this.hp--;
    if (this.wob) this.wob.stop();
    this.spr.setAngle(0);
    s.cameras.main.flash(100, 255, 255, 255);
    if (this.hp <= 0) return s.caught();
    // まだ捕まえきれない：網から抜け出して、離れた場所へ跳ぶ（そして速くなる）
    s.snd.se('se_net_hit');
    floatText(s, this.spr.x, this.spr.y - 24, s.text.line('popups.escape'), '#ff7fb0');
    const opts = [], a = s.arena;
    for (let y = a.top; y <= a.bottom; y++) for (let x = a.left; x <= a.right; x++) {
      if (s.bossFree(x, y) && Math.abs(x - s.pt.x) + Math.abs(y - s.pt.y) >= B.escapeMinDistance) opts.push({ x, y });
    }
    const n = Phaser.Utils.Array.GetRandom(opts) || { x: this.x, y: this.y };
    this.x = n.x; this.y = n.y; this.lv++;
    this.state = 'hop'; this.t = 0.6; this.cd = B.cooldownSec.afterEscape;
    s.tweens.add({ targets: this.spr, x: cx(n.x), y: cx(n.y), duration: 450 });
    s.tweens.add({ targets: this.spr, scale: 1.6, duration: 225, yoyo: true });
  }

  // 捕まえたあと、表示を片付ける
  finish() {
    this.state = 'caught';
    if (this.wob) this.wob.stop();
    this.mark.setVisible(false);
    this.stars.setVisible(false);
  }
}
