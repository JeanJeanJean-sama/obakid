// =====================================================
// セリフ・文章の取り出し（data/dialog.json）
// "hana.first" のような名前で、セリフを取り出す。
// 文章の中の {hana} {mopMax} などは、名前や数字に置きかえる。
// =====================================================

export class TextBank {
  // dialog：dialog.json の中身 / vars：置きかえる言葉の一覧（例：{ hana: 'ハナさん' }）
  constructor(dialog, vars) {
    this.dialog = dialog;
    this.vars = vars;
  }

  // "hana.first" → dialog.hana.first を取り出す
  raw(key) {
    return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.dialog);
  }

  // {名前} を置きかえる。extra でその場だけの言葉も渡せる（例：{ left: 3 }）
  fill(str, extra = {}) {
    const v = { ...this.vars, ...extra };
    return String(str).replace(/\{(\w+)\}/g, (m, name) => (name in v ? String(v[name]) : m));
  }

  // セリフを「画面ごとの配列」で取り出す（会話ウィンドウ用）
  lines(key, extra) {
    const r = this.raw(key);
    if (r === undefined) {
      console.warn(`dialog.json に「${key}」が見つかりません`);
      return ['[' + key + ']'];
    }
    return (Array.isArray(r) ? r : [r]).map(s => this.fill(s, extra));
  }

  // 1つの文として取り出す（HUD や浮かぶ文字用）
  line(key, extra) {
    return this.lines(key, extra).join('\n');
  }
}
