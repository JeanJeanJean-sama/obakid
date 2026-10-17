# 公開前のネタバレ確認の手順

版を GitHub で公開する前に、毎回この手順で確認します。

> **大事なこと**：GitHub に一度上げた内容は、あとでファイルを消しても、過去の記録（履歴）から読めてしまいます。ネタバレは「上げる前」に止めるのが基本です。

## いつ行うか

- zip を作る前（手順1〜4）
- zip を作ったあと、GitHub に上げる前（手順5〜6）

Claude Code に「docs/release-check.md の手順で確認して」と頼んでも構いません。その場合も、結果は自分の目で確かめてください。

## 手順1　非公開の資料の置き場所を確かめる

- [ ] ネタバレを含む書類が、すべて `private/` フォルダの中にある
- [ ] フォルダの一番上の `.gitignore` に `private/` と書いてある

## 手順2　言葉の一覧を最新にする

- [ ] `private/spoiler-words.txt` に、新しく決まった物語の言葉（キャラの正体、新しい展開の名前など）を書き足した

この一覧自体もネタバレなので、`private/` の外には置きません。

## 手順3　言葉で検索する

PowerShell で、このフォルダ（`obakid`）に移動してから、次の2つを順に貼り付けて実行します。

```
cd C:\GitHub\obakid
```

**(1) ファイルの中身を検索する**

```
$words = Get-Content private\spoiler-words.txt -Encoding UTF8 | Where-Object { $_ -ne '' -and -not $_.StartsWith('#') }
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\private\\' -and $_.Extension -in '.md','.html','.json','.js','.txt' } | Select-String -Pattern $words -SimpleMatch -Encoding UTF8
```

**(2) ファイルの名前を検索する**

```
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\private\\' } | Where-Object { $n = $_.Name; $words | Where-Object { $n -like "*$_*" } } | Select-Object FullName
```

- [ ] どちらも、何も表示されなかった

何か表示されたら、その行を読んで、本当にネタバレかどうかを判断します。言葉が一致しても、ネタバレでない場合もあります。

## 手順4　目で確かめる

言葉の検索では見つからないネタバレもあります。次の場所を読んで確かめます。

| 場所 | 確かめること |
|---|---|
| 版のフォルダの `data/`（dialog.json、events.json、obakid.json、characters.json など） | この版で遊べる場面より先のセリフ・イベント・図鑑が入っていないか。使わないキャラが登録されていないか |
| 版のフォルダの `assets/` | まだ出てこないキャラの絵や音が入っていないか |
| 版のフォルダの `js/` | プログラムの中のコメントや文章に、先の展開が書いていないか |
| `docs/` の書類（DESIGN.md、作業メモ、素材の注文書、説明書） | 物語の詳細や、正体・展開がわかる書き方がないか |
| README.md、CHANGELOG.md、トップページの開発日記 | 今後の展開を書いていないか（「次はこういう話になる」など） |

- [ ] 上の場所に、ネタバレは無かった

## 手順5　zip の中を確かめる

- [ ] zip の中に `private/` が無い
- [ ] zip の中に `.gitignore` と `.nojekyll` がある

## 手順6　GitHub Desktop で確かめる

zip を別の PC のリポジトリに展開したあと、コミットする前に確かめます。

- [ ] 変更一覧に、`private` の中のファイルが出ていない
- [ ] 変更一覧に、見覚えのないファイルが出ていない

## ネタバレが見つかったとき

- 書類の中のネタバレ：その部分を `private/STORY.md` などに移し、元の書類には「非公開の資料にある」とだけ残す
- 版のフォルダの中のネタバレ：Claude Code への作業メモ（`docs/plan-v0.x.md`）に、取り除く作業として書く
- 直したら、手順3からもう一度確認する
