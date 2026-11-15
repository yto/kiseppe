# AGENTS.md

キセッペ（Kiseppe）: amazon.co.jp の Kindle ページに価格推移グラフと実質割引率を表示する Chrome / Firefox 拡張機能。

## 構成

- `chrome/` が本体。`firefox/` は `chrome/` を手作業でコピーしたもの
- 2つの差分は `manifest.json` の `browser_specific_settings` だけ（2026-11-15 時点）。コードを直すのは `chrome/` 側で、そのあと `firefox/` にコピーする
- 開発の記録は `ChangeLog`、リリースノートは `CHANGES.md`

## このリポジトリは public

コミットしたものは誰でも読める。サーバの構成・ホスト名・運用の内情など、外に出したくないことは `notes/` に書く。

## 作業メモ

`notes/` は private リポ `yto/kiseppe-notes` の clone で、このリポでは `.gitignore` してある。各マシンで1回だけ次を打つ。

```
git clone git@github.com:yto/kiseppe-notes.git notes
```

`notes/` が無いときは、clone していないマシンにいるだけの可能性が高い。

調査・検討の経緯は notes/ に `<topic>-<YYYY-MM-DD>.md` の形式で置く。
topic は英数字とハイフン（本文は日本語でよい）。
冒頭に作成日と目的、末尾に「## 参照」を書く。
調べ物をするときは、Web より先にリポジトリ内の Markdown を grep する（notes/ 以外にあるメモや記録も含む）。
まず `grep -rl --include='*.md'` でファイル名を出し、関係のありそうなファイルの該当箇所だけ読む。

`notes/` 内の変更は `notes/` の中で `git commit` する（このリポのコミットには入らない）。
