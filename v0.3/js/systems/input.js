// =====================================================
// キー入力と、スマホ用の画面ボタン
// =====================================================

// 画面ボタン（index.html の #pad）が押されているかどうか
export const TOUCH = { up: false, down: false, left: false, right: false, z: false, x: false, c: false, r: false };

// 画面ボタンに、押した・離したの反応を付ける（起動時に1回だけ呼ぶ）
export function bindTouchPad() {
  document.querySelectorAll('#pad .btn').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); TOUCH[k] = true; b.classList.add('on'); };
    const off = e => { e.preventDefault(); TOUCH[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, off));
  });
}

// 場面（シーン）ごとに作る、入力の読み取り係
export class Controls {
  constructor(scene) {
    const kb = scene.input.keyboard;
    this.cur = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D');
    this.keys = { z: kb.addKey('Z'), x: kb.addKey('X'), c: kb.addKey('C'), r: kb.addKey('R'), enter: kb.addKey('ENTER') };
    this.prevT = {};
  }

  // 「今この瞬間に押された」か（押しっぱなしは数えない）
  pressed(name, key) {
    const t = TOUCH[name] && !this.prevT[name];
    this.prevT[name] = TOUCH[name];
    return Phaser.Input.Keyboard.JustDown(key) || t;
  }

  // 毎フレーム呼ぶ。押されたボタンと、押している方向を返す
  read() {
    const JD = Phaser.Input.Keyboard.JustDown;
    const zk = this.pressed('z', this.keys.z), sp = JD(this.cur.space), en = JD(this.keys.enter);
    const out = {
      z: zk || sp || en,
      x: this.pressed('x', this.keys.x),
      c: this.pressed('c', this.keys.c),
      r: this.pressed('r', this.keys.r),
      dir: null,
    };
    if (this.cur.up.isDown || this.wasd.W.isDown || TOUCH.up) out.dir = 'up';
    else if (this.cur.down.isDown || this.wasd.S.isDown || TOUCH.down) out.dir = 'down';
    else if (this.cur.left.isDown || this.wasd.A.isDown || TOUCH.left) out.dir = 'left';
    else if (this.cur.right.isDown || this.wasd.D.isDown || TOUCH.right) out.dir = 'right';
    return out;
  }
}
