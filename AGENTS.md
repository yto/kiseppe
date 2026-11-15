# AGENTS.md

キセッペ（Kiseppe）: amazon.co.jp の Kindle ページに価格推移グラフと実質割引率を表示する Chrome / Firefox 拡張機能。

## 構成

- `chrome/` が本体。コードはここだけを直す。Chrome にはこのフォルダをそのまま「パッケージ化されていない拡張機能」として読み込める
- `firefox/` には Firefox 版との差分だけを置く。今は `manifest-overrides.json`（`browser_specific_settings`）だけ
- `./build.sh` で `dist/chrome/` と `dist/firefox/` を作り、ストア提出用の zip（`dist/kiseppe-{chrome,firefox}-<version>.zip`）を出す。firefox 版の `manifest.json` は `chrome/manifest.json` に `firefox/manifest-overrides.json` を jq で重ねたもの
- Firefox で動作確認するときは、`./build.sh` のあと `about:debugging` から `dist/firefox/manifest.json` を一時的に読み込む
- バージョンは `chrome/manifest.json` の1か所だけ直せばよい
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
