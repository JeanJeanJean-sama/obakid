// =====================================================
// イベントシーン（台本どおりに進む場面）
// data/events.json に書いた命令を、上から順番に1つずつ実行する。
// 命令の書き方は docs/event-script.md を参照。
//
// 場面（シーン）の側には、次のものを用意しておく：
//   scene.say(lines, onDone)   会話を表示する
//   scene.getActor(who)        "player" や "takeru" から、キャラの情報を返す
//   scene.eventActions         "call" 命令で呼べる処理の一覧
//   scene.text / scene.snd / scene.S（settings）
// =====================================================
import { cx } from './ui.js';
import { setPose } from './sprites.js';

export class Cutscene {
  constructor(scene) {
    this.s = scene;
  }

  // 台本（命令の配列）を実行する。終わったら onDone を呼ぶ
  play(steps, onDone) {
    this.steps = steps || [];
    this.i = 0;
    this.onDone = onDone;
    this.next();
  }

  // 次の命令を実行する
  next() {
    const s = this.s;
    if (this.i >= this.steps.length) {
      s.state = 'explore';
      if (this.onDone) this.onDone();
      return;
    }
    const st = this.steps[this.i++];
    s.state = 'event'; // イベント中は、プレイヤーは操作できない
    const go = () => this.next();

    switch (st.do) {
      // セリフを表示する { "do":"say", "text":"dialog.json の名前" }
      case 'say':
        return s.say(s.text.lines(st.text), go);

      // 待つ { "do":"wait", "sec":0.5 }
      case 'wait':
        return s.time.delayedCall((st.sec ?? 0.5) * 1000, go);

      // 画面を揺らす { "do":"shake", "sec":0.4, "power":0.01 }
      case 'shake': {
        const ms = (st.sec ?? 0.3) * 1000;
        s.cameras.main.shake(ms, st.power ?? 0.01);
        return s.time.delayedCall(ms, go);
      }

      // キャラを指定のマスまで歩かせる { "do":"walk", "who":"takeru", "to":[7,10] }
      case 'walk':
        return this.walk(st, go);

      // キャラの向きを変える { "do":"face", "who":"takeru", "dir":"down" }
      case 'face': {
        const a = s.getActor(st.who);
        if (a) setPose(a.spr, st.dir);
        return go();
      }

      // 効果音を鳴らす { "do":"sound", "key":"se_rumble" }
      case 'sound':
        s.snd.se(st.key);
        return go();

      // BGM を変える・止める
      case 'bgm':
        s.snd.bgm(st.key);
        return go();
      case 'stopBgm':
        s.snd.stopBgm();
        return go();

      // プログラムに用意した処理を呼ぶ { "do":"call", "name":"spawnBoss" }
      case 'call': {
        const fn = s.eventActions && s.eventActions[st.name];
        if (fn) fn(); else console.warn(`イベントの call に、知らない名前「${st.name}」があります`);
        return go();
      }

      default:
        console.warn(`イベントに、知らない命令「${st.do}」があります`);
        return go();
    }
  }

  // 歩かせる：まず横に、次に縦に、1マスずつ進む（壁などは気にしない）
  walk(st, done) {
    const s = this.s, a = s.getActor(st.who);
    if (!a) { console.warn(`イベントの walk に、知らないキャラ「${st.who}」があります`); return done(); }
    const [tx, ty] = st.to;
    const path = [];
    let { x, y } = a.pos();
    while (x !== tx) { const dx = Math.sign(tx - x); x += dx; path.push({ x, y, dir: dx > 0 ? 'right' : 'left' }); }
    while (y !== ty) { const dy = Math.sign(ty - y); y += dy; path.push({ x, y, dir: dy > 0 ? 'down' : 'up' }); }
    const ms = st.ms ?? s.S.player.walkMs * 1.5;

    const stepTo = (i) => {
      if (i >= path.length) { setPose(a.spr, path.length ? path[path.length - 1].dir : 'down'); return done(); }
      const p = path[i];
      a.setPos(p.x, p.y);
      setPose(a.spr, p.dir, true);
      if (a.label) s.tweens.add({ targets: a.label, x: cx(p.x), y: p.y * 32 - 6, duration: ms });
      s.tweens.add({ targets: a.spr, x: cx(p.x), y: cx(p.y), duration: ms, onComplete: () => stepTo(i + 1) });
    };
    stepTo(0);
  }
}
