# オバキッド捕獲作戦

ブラウザで遊べる、オバキッドを捕まえるゲームの制作記録です。v1.0.0 の完成をめざして開発中です。

## フォルダ構成

```
index.html          トップページ（版の一覧と開発日記）
v0.1/index.html     v0.1.0 最初の試作版（HTML ファイル1つ）
v0.2/index.html     v0.2.0（HTML ファイル1つ）
v0.3/               v0.3.0（最新版）
  index.html          ゲームの入り口
  js/                 プログラム
    main.js             ゲームの設定と起動
    scenes/             場面（読み込み、町と広場、図鑑）
    systems/            共通の仕組み（マス目と滑るルール、会話、音、イベント、ペロッパの動き など）
  data/               プログラムを触らずに書き換えられるデータ
    settings.json       調整用の数値
    characters.json     キャラクターの名前と画像
    dialog.json         セリフ・説明文
    obakid.json         図鑑の内容
    events.json         イベントの台本
    assets.json         画像と音のファイルの一覧
    maps/plaza.json     広場のマップ
  assets/images/      画像（ドット絵を置く）
  assets/audio/       BGM と効果音
  tools/              パズル検証プログラム
art/                絵の作業ファイル（GitHub には上げない）
lib/                ゲームエンジン Phaser 3.80.1 とそのライセンス（全版共通）
CHANGELOG.md        変更履歴
docs/
  DESIGN.md           企画・設計メモ
  plan-v0.3.md        v0.3 の作業メモ
  data-guide.md       data/ のファイルの書き方
  asset-list.md       画像と音の注文書（ファイル名・大きさ）
  event-script.md     イベントの台本の書き方
  release-check.md    公開前のネタバレ確認の手順
  plan-v0.3-publish.md  公開準備の作業メモ
  plan-v0.3-newpc.md  新しいPCでの作業環境の作業メモ
.nojekyll           GitHub Pages に余計な変換をさせないための空ファイル
.gitignore          GitHub に上げないファイルの設定
```

## 版の番号の付け方

`v0.2.1` のような3つの数字で表します（セマンティックバージョニング）。

| 変わる数字 | 意味 | 例 |
|---|---|---|
| 左 | 大きな節目。1.0.0 が最初の完成版 | v0.9.0 → v1.0.0 |
| 真ん中 | 新しい要素の追加や、遊びの変更 | v0.2.0 → v0.3.0 |
| 右 | 誤字・バグの修正、難易度の微調整 | v0.2.0 → v0.2.1 |

遊べるフォルダは「真ん中の数字が変わる節目」ごとに作ります（`v0.1/`、`v0.2/` …）。
右の数字だけが変わる小さな修正は、そのフォルダの中身を上書きし、GitHub のタグと CHANGELOG.md に記録します。

## 手元で遊ぶ

v0.3 からは、画像やデータを別のファイルから読み込みます。そのため、index.html をダブルクリックで開くだけでは動きません。
「ローカルサーバー」（自分のパソコンの中だけで動く小さな Web サーバー）を通して開いてください。

### Python を使う方法（何もインストールしなくてよい）

1. PowerShell を開き、次のコマンドを貼り付けて Enter（フォルダの場所は自分の環境に合わせる）
   ```
   python -m http.server 8000 --bind 127.0.0.1 --directory C:\GitHub\obakid
   ```
2. ブラウザで `http://127.0.0.1:8000/` を開く
3. 終わるときは、PowerShell の画面で Ctrl + C を押す

ファイルを書き換えたら、ブラウザを再読み込み（F5）すると反映されます。

### VS Code を使う方法

VS Code の拡張機能「Live Server」でこのフォルダを開き、index.html を表示してください。

## 絵・音・セリフを差し替える

- 絵と音：決まった名前のファイルを `v0.3/assets/images/` や `v0.3/assets/audio/` に置くだけで変わります。名前と大きさは `docs/asset-list.md` を見てください
- 名前・セリフ・図鑑・マップ・調整用の数値：`v0.3/data/` のファイルを書き換えます。書き方は `docs/data-guide.md` を見てください
- イベント（キャラが歩いたり話したりする場面）：`v0.3/data/events.json` に台本を書きます。書き方は `docs/event-script.md` を見てください

## パズルを検証する

マップやモップの回数を変えたら、パズルが今までどおりの難しさで解けるかを、総当たりのプログラムで確かめます。
Node.js（https://nodejs.org/ の LTS 版）が必要です。

1. PowerShell で、このフォルダ（`obakid`）に移動する
   ```
   cd C:\GitHub\obakid
   ```
2. 次のコマンドを実行する
   ```
   node v0.3/tools/verify-puzzle.js
   ```
3. 次の3つの結果に「○」が付けば合格です（20秒ほどかかります）
   - モップ（決められた回数）で解ける
   - モップが1回少ないと解けない
   - 木箱が無いと解けない

最後に「解き方の一例」も表示されます。

## 小さな修正をするとき（例：v0.3.0 → v0.3.1）

1. `v0.3/` の中のファイルを直接修正する
2. ページ内の表記（`v0.3/index.html` の `<title>` と見出し下の説明）を v0.3.1 に変える
3. CHANGELOG.md に「v0.3.1」の項目を追加する
4. GitHub Desktop でコミットし、そのコミットに `v0.3.1` のタグを付けて Push する

## 新しい要素を追加するとき（例：v0.4.0）

1. 最新版のフォルダ（`v0.3`）を丸ごとコピーして `v0.4` にする
2. `v0.4/index.html` の表記を v0.4.0 に変える
3. トップページ index.html の「最新版」リンクを `v0.4/` に変え、v0.3.x を「過去の版」に移す
4. CHANGELOG.md と、トップページの開発日記に変更内容を書く
5. GitHub Desktop でコミットし、`v0.4.0` のタグを付けて Push する

## クレジット

- ゲームエンジン：[Phaser](https://phaser.io/)（MIT License）
- フォント：DotGothic16（SIL Open Font License）

本作は非公式のファン制作作品です。
