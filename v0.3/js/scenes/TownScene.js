// =====================================================
// 町と広場の場面
// 探索・会話 → モップ入手 → ワックスのパズル → ペロッパとの勝負 → 図鑑
//
// 場面の進み具合（phase）
//   'town'：パズル中 / 'boss'：ペロッパとの勝負 / 'done'：捕まえた
// 操作の状態（state）
//   'explore'：自由に動ける / 'dialog'：会話中 / 'event'：イベント中 / 'zukan'：図鑑表示中
// =====================================================
import { DIRS, K, fromK, parseMap, cellAt, tryStep, slideStep, wipeTarget } from '../systems/grid.js';
import { T, cx, txt, floatText } from '../systems/ui.js';
import { Controls } from '../systems/input.js';
import { Sound } from '../systems/sound.js';
import { DialogBox } from '../systems/dialog.js';
import { Cutscene } from '../systems/cutscene.js';
import { PeroSpits, PeroBoss } from '../systems/pero.js';
import { setPose } from '../systems/sprites.js';

export class TownScene extends Phaser.Scene {
  constructor() { super('town'); }

  // やり直すときに、引きつぐ情報（モップを持っているか、など）を受け取る
  init(data) { this.keep = data || {}; }

  create() {
    const D = this.registry.get('data');
    this.D = D; this.S = D.settings; this.text = this.registry.get('text');
    this.snd = new Sound(this);
    this.ctl = new Controls(this);
    const kp = this.keep;

    // フラグ（話を聞いたか、道具を持っているか）
    this.f = { heardHana: !!kp.heardHana, heardTakeru: !!kp.heardTakeru, hasMop: !!kp.hasMop, hasNet: !!kp.boss };
    this.phase = kp.boss ? 'boss' : 'town';
    this.hearts = this.S.player.hearts; this.mop = this.S.mop.uses;
    this.inv = 0; this.clock = 0; this.busy = false; this.hold = null;
    this.boss = null; this.trails = new Map();

    // マップを読み取る
    const m = parseMap(D.map);
    this.cells = m.cells; this.arena = m.arena; this.mh = m.manhole;
    this.wax = new Set(m.wax); this.sources = new Set(m.sources);
    this.crates = m.crates.map(c => ({ ...c }));
    this.npcs = m.npcs.map(n => ({ ...n }));
    let start = { ...m.start };
    if (kp.boss) {
      // 勝負のやり直し：ワックスは乾いていて、木箱は前回の位置のまま
      this.wax.clear(); this.sources.clear();
      this.crates = kp.crates.map(c => ({ ...c }));
      start = { x: D.map.bossRetryStart.x, y: D.map.bossRetryStart.y };
    }

    // 地面のタイルを並べる
    this.cells.forEach((row, y) => row.forEach((c, x) => this.add.image(cx(x), cx(y), 'tile_' + c.tile).setDepth(0)));
    this.waxG = this.add.graphics().setDepth(1);
    (D.map.labels || []).forEach(l => txt(this, cx(l.x), cx(l.y), this.text.line(l.text), 14, '#fff3d6').setOrigin(0.5).setDepth(2));

    // マンホール（下から顔を出すペロッパ付き）・木箱・住人
    const peroImg = D.characters.pero.image;
    this.peek = this.add.sprite(cx(this.mh.x), cx(this.mh.y) - 6, peroImg).setDepth(2).setAlpha(0);
    setPose(this.peek, 'down');
    this.manhole = this.add.image(cx(this.mh.x), cx(this.mh.y), 'manhole').setDepth(3);
    this.crates.forEach(c => c.spr = this.add.image(cx(c.x), cx(c.y), 'crate').setDepth(3));
    this.npcs.forEach(n => {
      const ch = D.characters[n.id];
      n.spr = this.add.sprite(cx(n.x), cx(n.y), ch.image).setDepth(3);
      setPose(n.spr, 'down');
      n.label = txt(this, cx(n.x), n.y * T - 6, ch.name, 12, '#262241').setOrigin(0.5, 1).setDepth(3);
    });

    // 主人公と、手に持つ道具
    this.pt = { ...start };
    this.faceName = 'up'; this.facing = DIRS.up;
    this.pl = this.add.sprite(cx(start.x), cx(start.y), D.characters.player.image).setDepth(5);
    setPose(this.pl, this.faceName);
    this.faceDot = this.add.image(0, 0, 'dot').setDepth(6).setVisible(!!this.S.player.showFacingDot);
    this.mopS = this.add.image(0, 0, 'mop').setDepth(6).setVisible(false);
    this.netS = this.add.image(0, 0, 'net').setDepth(7).setVisible(false);

    // 画面部品と、いろいろな係
    this.buildHud();
    this.dialog = new DialogBox(this, this.snd, this.S.dialog);
    this.spits = new PeroSpits(this);
    this.cutscene = new Cutscene(this);
    // イベントの台本（events.json）の "call" から呼べる処理
    this.eventActions = {
      dryWax: () => this.wax.clear(),
      giveNet: () => { this.f.hasNet = true; },
      spawnBoss: () => this.spawnBoss(),
    };

    this.state = 'explore';
    if (kp.boss) {
      this.snd.bgm('bgm_boss');
      this.say(this.text.lines('system.bossRetry'), () => this.spawnBoss());
    } else {
      this.snd.bgm('bgm_plaza');
      if (!kp.skipIntro) this.say(this.text.lines('system.intro'));
    }
  }

  // ===== 画面部品 =====
  buildHud() {
    this.add.rectangle(0, 0, 640, T, 0x262241, 0.9).setOrigin(0).setDepth(10);
    this.hudL = txt(this, 10, 7, '', 14).setDepth(11);
    this.hudR = txt(this, 630, 7, '', 14, '#ffe36e').setOrigin(1, 0).setDepth(11);
  }
  pop(x, y, key, color) { floatText(this, x, y, this.text.line('popups.' + key), color); }

  // ===== 会話 =====
  say(lines, onDone) {
    this.state = 'dialog';
    this.dialog.open(lines, () => { this.state = 'explore'; if (onDone) onDone(); });
  }

  // イベントで動かすキャラの情報（cutscene.js が使う）
  getActor(who) {
    if (who === 'player') {
      return { spr: this.pl, label: null, pos: () => ({ ...this.pt }), setPos: (x, y) => { this.pt = { x, y }; } };
    }
    const n = this.npcs.find(n => n.id === who);
    if (!n) return null;
    return { spr: n.spr, label: n.label, pos: () => ({ x: n.x, y: n.y }), setPos: (x, y) => { n.x = x; n.y = y; } };
  }

  // ===== 地形の判定（grid.js のルールが、ここに質問してくる） =====
  cell(x, y) { return cellAt(this.cells, x, y); }
  inArena(x, y) { const a = this.arena; return x >= a.left && x <= a.right && y >= a.top && y <= a.bottom; }
  isWax(x, y) { const k = K(x, y); return this.wax.has(k) || (this.trails.has(k) && this.trails.get(k) > this.clock); }
  crateAt(x, y) { return this.crates.find(c => c.x === x && c.y === y); }
  bossAt(x, y) { return !!this.boss && this.boss.x === x && this.boss.y === y; }
  solid(x, y) { return this.cell(x, y).solid || this.npcs.some(n => n.x === x && n.y === y); }
  stopper(x, y) { return this.solid(x, y) || !!this.crateAt(x, y) || this.bossAt(x, y); }
  canal(x, y) { return this.cell(x, y).canal; }
  bossFree(x, y) { return this.inArena(x, y) && !this.cell(x, y).solid && !this.crateAt(x, y); }

  // ===== 移動 =====
  tryMove(d) {
    const p = this.pt, r = tryStep(this, p, d);
    if (!r) return;
    if (r.crate) {
      // 木箱を押した
      const { obj, to, steps } = r.crate;
      obj.x = to.x; obj.y = to.y;
      this.snd.se('se_crate');
      this.tweens.add({ targets: obj.spr, x: cx(to.x), y: cx(to.y), duration: 90 + 60 * steps });
      if (steps > 1) this.pop(cx(to.x), cx(to.y) - 16, 'crateSlide', '#ffe36e');
    }
    this.busy = true;
    const safe = { ...p }; // 水路に落ちたら、ここに戻る
    setPose(this.pl, this.faceName, true);
    this.walk(r.to, this.S.player.walkMs, () => this.afterStep(d, safe, 0));
  }
  walk(n, dur, cb) {
    this.pt = { x: n.x, y: n.y };
    this.tweens.add({ targets: this.pl, x: cx(n.x), y: cx(n.y), duration: dur, onComplete: cb });
  }
  // 1マス進んだあと：ワックスの上なら滑り続ける
  afterStep(d, safe, slid) {
    if (this.isWax(this.pt.x, this.pt.y)) return this.slide(d, safe, slid);
    setPose(this.pl, this.faceName);
    this.busy = false;
  }
  slide(d, safe, slid) {
    setPose(this.pl, this.faceName); // 滑っているあいだは足を動かさない
    const r = slideStep(this, this.pt, d);
    if (r.type === 'fall') return this.fall(r.to, safe);
    if (r.type === 'stop') {
      if (slid > 0) {
        this.pop(this.pl.x, this.pl.y - 18, 'bump', '#ffffff');
        this.snd.se('se_bump');
        this.cameras.main.shake(80, 0.004);
        this.time.delayedCall(250, () => this.busy = false);
      } else this.busy = false;
      return;
    }
    if (slid === 0) { this.pop(this.pl.x, this.pl.y - 18, 'slip', '#ffe36e'); this.snd.se('se_slide'); }
    this.walk(r.to, this.S.player.slideMs, () => this.afterStep(d, safe, slid + 1));
  }
  // 水路に落ちた：落ちる前のマスに戻って、ハートが1つ減る
  fall(n, safe) {
    this.pt = { ...n };
    this.tweens.add({
      targets: this.pl, x: cx(n.x), y: cx(n.y), duration: 60, onComplete: () => {
        this.pop(cx(n.x), cx(n.y) - 16, 'splash', '#9fd0ff');
        this.snd.se('se_fall');
        this.tweens.add({
          targets: this.pl, scale: 0, angle: 180, duration: 300, onComplete: () => {
            this.pl.setScale(1).setAngle(0);
            this.pt = { ...safe };
            this.pl.setPosition(cx(safe.x), cx(safe.y));
            this.damage(1, true);
            this.time.delayedCall(200, () => this.busy = false);
          },
        });
      },
    });
  }

  // ===== ハート =====
  // force：無敵時間でも必ず減らす（水路に落ちたとき）。減ったら true を返す
  damage(n, force) {
    if (!force && this.inv > 0) return false;
    this.hearts -= n; this.inv = this.S.player.invincibleSec;
    this.snd.se('se_damage');
    this.cameras.main.shake(180, 0.01);
    if (this.hearts <= 0) this.faint();
    return true;
  }
  // ハートが無くなった：広場（または勝負）を最初からやり直す
  faint() {
    this.hearts = 0;
    const keep = { hasMop: this.f.hasMop, heardHana: this.f.heardHana, heardTakeru: this.f.heardTakeru, skipIntro: true };
    if (this.phase === 'boss') { keep.boss = true; keep.crates = this.crates.map(c => ({ x: c.x, y: c.y })); }
    this.say(this.text.lines(this.phase === 'boss' ? 'system.faintBoss' : 'system.faintTown'), () => this.scene.restart(keep));
  }
  resetRoom() {
    this.say(this.text.lines('system.reset'), () => this.scene.restart({
      hasMop: this.f.hasMop, heardHana: this.f.heardHana, heardTakeru: this.f.heardTakeru, skipIntro: true,
    }));
  }

  // ===== モップ =====
  wipe() {
    if (!this.f.hasMop) return this.pop(this.pl.x, this.pl.y - 18, 'noMop', '#ffffff');
    const t = wipeTarget(this, this.pt, this.facing);
    if (!t) return this.pop(this.pl.x, this.pl.y - 18, 'nothingToWipe', '#ffffff');
    const puzzle = this.phase === 'town'; // 回数が減るのはパズル中だけ
    if (puzzle && this.mop <= 0) return this.say(this.text.lines('system.mopEmpty'));
    this.busy = true;
    this.snd.se('se_wipe');
    this.mopS.setVisible(true).setPosition(cx(t.x) - 4, cx(t.y) + 6).setAngle(0);
    this.tweens.add({
      targets: this.mopS, x: cx(t.x) + 6, duration: 80, yoyo: true, repeat: 1, onComplete: () => {
        this.mopS.setVisible(false);
        const k = K(t.x, t.y);
        this.wax.delete(k); this.trails.delete(k);
        if (puzzle) this.mop--;
        if (this.sources.has(k)) {
          this.sources.delete(k);
          this.pop(cx(t.x), cx(t.y) - 16, 'wipedSource', '#ffe36e');
          if (this.sources.size === 0) { this.busy = false; return this.startBoss(); }
        } else this.pop(cx(t.x), cx(t.y) - 16, 'wipe', '#ffffff');
        if (puzzle && this.mop === 0 && this.sources.size > 0) this.pop(this.pl.x, this.pl.y - 36, 'mopSticky', '#ff7fb0');
        this.busy = false;
      },
    });
  }

  // ===== 調べる・話す =====
  interact() {
    const p = this.pt, x = p.x + this.facing.x, y = p.y + this.facing.y, f = this.f, ph = this.phase;
    const L = (k) => this.say(this.text.lines(k));
    const n = this.npcs.find(n => n.x === x && n.y === y);
    if (n && (n.id === 'hana' || n.id === 'takeru')) {
      // 進み具合によってセリフが変わる
      if (ph === 'done') return L(n.id + '.done');
      if (ph === 'boss') return L(n.id + '.boss');
      if (f.hasMop) return L(n.id + '.afterMop');
      if (n.id === 'hana') f.heardHana = true; else f.heardTakeru = true;
      return L(n.id + '.first');
    }
    const ex = this.cell(x, y).examine;
    if (ex === 'shed') {
      if (f.hasMop) return L('objects.shed.empty');
      f.hasMop = true;
      this.snd.se('se_item');
      return L('objects.shed.getMop');
    }
    if (ex === 'sign') return L('objects.sign');
    if (ex === 'tree') return L('objects.tree');
    if (ex === 'canal') return L('objects.canal');
    if (this.crateAt(x, y)) return L('objects.crate');
    if (ex === 'manhole') return L(ph === 'town' ? 'objects.manhole.town' : 'objects.manhole.other');
  }

  // ===== ペロッパとの勝負 =====
  // 最後のワックスだまりを拭いた：登場イベント（events.json の peroAppear）を始める
  startBoss() {
    this.phase = 'boss';
    this.spits.clear();
    this.cutscene.play(this.D.events.peroAppear);
  }
  spawnBoss() {
    this.boss = new PeroBoss(this);
  }
  // 網を振る
  swing() {
    if (!this.f.hasNet) return;
    this.busy = true;
    this.snd.se('se_net');
    const f = { x: this.pt.x + this.facing.x, y: this.pt.y + this.facing.y };
    const base = Math.atan2(this.facing.y, this.facing.x) * 180 / Math.PI;
    this.netS.setVisible(true).setPosition(cx(this.pt.x) + this.facing.x * 14, cx(this.pt.y) + this.facing.y * 14).setOrigin(0, 0.5).setAngle(base - 60);
    this.tweens.add({ targets: this.netS, angle: base + 60, duration: 160, onComplete: () => this.netS.setVisible(false) });
    this.time.delayedCall(240, () => this.busy = false);
    if (!this.boss || this.phase !== 'boss' || !this.bossAt(f.x, f.y)) return;
    this.boss.netHit(this.facing);
  }
  // 捕まえた！
  caught() {
    const b = this.boss;
    this.phase = 'done';
    b.finish();
    this.trails.clear();
    this.snd.stopBgm();
    this.snd.se('se_catch');
    this.tweens.add({
      targets: b.spr, scale: 0, angle: 360, x: this.pl.x, y: this.pl.y, duration: 500, onComplete: () => {
        this.say(this.text.lines('system.caught'), () => {
          this.state = 'zukan';
          this.scene.launch('zukan', { id: 'pero' });
        });
      },
    });
  }

  // ===== HUD・描画 =====
  drawWax(time) {
    const g = this.waxG; g.clear();
    const draw = (x, y, a) => {
      g.fillStyle(0xfff0a0, a); g.fillRect(x * T, y * T, T, T);
      const ph = (time / 450 + x * 1.3 + y * 2.1) % 3; // キラッと光る
      if (ph < 1) { g.fillStyle(0xffffff, 1 - ph); g.fillRect(x * T + 6 + (x * 7) % 16, y * T + 5 + (y * 5) % 16, 4, 4); }
    };
    this.wax.forEach(k => { const [x, y] = fromK(k); draw(x, y, 0.7); });
    this.trails.forEach((e, k) => {
      if (e <= this.clock || this.wax.has(k)) return;
      const [x, y] = fromK(k); draw(x, y, Math.min(0.7, (e - this.clock) / 2));
    });
    this.sources.forEach(k => {
      const [x, y] = fromK(k), s = Math.sin(time / 300 + x) * 1.5;
      g.fillStyle(0x262241, 1); g.fillCircle(cx(x), cx(y), 12 + s);
      g.fillStyle(0xf2b01e, 1); g.fillCircle(cx(x), cx(y), 10 + s);
      g.fillStyle(0xffe36e, 1); g.fillCircle(cx(x) - 3, cx(y) - 3, 4);
    });
  }
  hud() {
    const f = this.f, H = (k, e) => this.text.line('hud.' + k, e);
    let s;
    if (this.phase === 'done') s = H('done');
    else if (this.phase === 'boss') s = H('boss');
    else if (f.hasMop) s = H('wipe', { left: this.sources.size });
    else if (f.heardHana || f.heardTakeru) s = H('findMop');
    else s = H('start');
    this.hudL.setText(s);
    const max = this.S.player.hearts, h = Math.max(0, this.hearts);
    let r = '♥'.repeat(h) + '♡'.repeat(Math.max(0, max - h));
    if (this.phase === 'town' && f.hasMop) r += '　' + H('mopLabel') + ' ' + '■'.repeat(this.mop) + '□'.repeat(this.S.mop.uses - this.mop);
    if (this.boss && this.phase === 'boss') r += '　' + H('catchLabel') + ' ' + '●'.repeat(this.S.boss.hp - this.boss.hp) + '○'.repeat(this.boss.hp);
    this.hudR.setText(r);
  }

  // ===== 毎フレームの処理 =====
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const inp = this.ctl.read();
    this.drawWax(time); this.hud();
    this.faceDot.setPosition(this.pl.x + this.facing.x * 15, this.pl.y + this.facing.y * 15);
    if (this.state === 'dialog') return this.dialog.update(dt, inp.z);
    if (this.state === 'zukan' || this.state === 'event') return;

    this.clock += dt;
    // ダメージ後の無敵時間は点滅する
    if (this.inv > 0) { this.inv -= dt; this.pl.setAlpha(Math.floor(this.inv * 12) % 2 ? 0.3 : 1); } else this.pl.setAlpha(1);
    this.spits.update(dt);
    if (this.boss && this.phase === 'boss') this.boss.update(dt);
    if (this.state !== 'explore' || this.busy) return;

    if (inp.z) return this.interact();
    if (inp.x) return this.wipe();
    if (inp.c) return this.swing();
    if (inp.r && this.phase === 'town') return this.resetRoom();

    // 方向キー：軽く押すと向きだけ変わり、押し続けると進む
    const name = inp.dir;
    if (!name) { this.hold = null; return; }
    if (this.hold !== name) {
      this.hold = name; this.holdT = 0;
      this.wait = (this.faceName !== name);
      this.faceName = name; this.facing = DIRS[name];
      setPose(this.pl, name);
    }
    this.holdT += dt;
    if (this.wait && this.holdT < this.S.player.turnHoldSec) return;
    this.tryMove(this.facing);
  }
}
