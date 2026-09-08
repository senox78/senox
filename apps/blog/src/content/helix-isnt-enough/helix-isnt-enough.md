---
title: "Helixは中途半端では"
date: 2026-07-31
description: "file pickerすらも廃せば?"
tags: ["column", "helix"]
published: false
---

= Helixというエディター

> - Vim-like modal editing
> - Multiple selections
> - Built-in language server support
> - Smart, incremental syntax highlighting and code editing via tree-sitter

-- [Helix -README.md](https://github.com/helix-editor/helix/blob/master/README.md)

[Kakoune](https://kakoune.org/)から強く影響を受けた、TUI Editor。VimやEmacs, VS Codeが拡張性を意識している中、Helixは拡張機能(少なくとも'26/7/31には)を持っておらず、エディターの機能はbuilt-inされたものだけになっている少し珍しいエディタ。

---

私は前に少し触り、それなりに面白かったのでたまに使っている。

---

== lsp内蔵

helixは開かれたファイルやプロジェクトからPATHを辿って使えそうなlauguage serverを探し、見つかればそれと勝手に接続してEditor上でよしなに使えるようにしてくれる。

そのためデフォルトのままではHelixが認知しているlanguage serverしか使えない。ただ設定ファイルで追加はできるし、元の対応も多い(300くらい?#footnote[`hx --health | wc -l`で300行程度. ただ他の出力もあるので少なく見積もって250くらい?])。

Neovimなどで`lspconfig`を書くといった手間がない感じでそれは普通に便利。私はそこまでマイナーな言語触りませんし。

= いろいろ機能は無い

- そもそもUnixを名乗るのであれば、ファイルピッカーいらんだろとは
  - ほんとにシンプルなエディタにするならyaziからスポット的に起動するとか
