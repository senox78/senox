---
title: "私のLinux環境を晒す(自慢)"
date: 2026-07-01
description: "hyprlandとかぁ"
tags: ["column", "dev", "env", "nvim"]
published: true
---

![my desktop](./imgs/desktop.png)

dotfilesは[こちら(GitHub)](https://github.com/Uliboooo/dotfiles)。

基本的にパクっていただいて結構ですが、fastfetchなどの設定はMITライセンスのもの(人の)を流用してるのでLICENSEの表記が必要なことがあります。

## OS: NixOS

友人やTwitterで**強く**勧められ使ってみたら案外楽だったので。

基本的に手間をかけたりしたくないのと、自分の記憶と作業の精度を信用してないので再現性のあるシステムは相性がいい。

Archなどのようなハックして云々するよりは、計算機として抽象化されたものを使える感?がいいです。

設定はだいたい以下の構成で、NixOS(+ homemanager), Linux + Standalone nix, or macOS(nix)といった感じ。最近はmacOSのサポートをサボっているので、rebuildに失敗する。

```bash
dotfiles
├──  flake.lock
├──  flake.nix
├── 󱂵 home
│   ├──  alice.nix # mac向け
│   ├──  common_user.nix # どっちも
│   └──  seli.nix  # linux向け
├──  hosts
│   └──  desktop
│       ├──  configuration.nix
│       └──  hardware-configuration.nix
└──  modules
    ├──  common.nix
    ├──  desktop.nix
    └──  thinkpad.nix
```

正直nixの記述面でのコストは全てAIで踏み倒したため、私はほぼnixという言語は書けない。

まあ使えてるので良し。

## エディタ: Neovim(lazy.nvim)

[neovim config](https://github.com/Uliboooo/dotfiles/tree/main/.config/nvim)

1年弱前くらいから始めた。理由はカッコいいから。普通に慣れれば楽でvimがないエディタが嫌いになるくらいには馴染んだ。ただ惰性で使っているのでマクロとかよくわからないし、未だにpluginを作れる気はしない。

vscode -> nvim -> helix -> nvimといった感じで、一瞬helixを使ってやっぱりvimが欲しくなり戻ってきた。

このhelix -> nvimの過程でいくつかnvimに逆輸入した機能があり、

- `<Leader>`をSpace barに
  - :+ Ctrlより親指で押しやすい位置にある
  - :- 通常の入力とprefixとの判定で詰まることがある[^2]
- ファイラーをfzfなpickerに
  - 基本的には[snacks.nvim](https://github.com/folke/snacks.nvim)を使ってる[^1]
  - :+ 1発でファイルを開ける
  - :- ツリー構造は見にくい(`/foo/index.ts`とかが苦手になる[^3])

左がfzfなfile picker, 右がlspの一覧。どちらの似たUIで操作できるのでスイッチコストが低め。lsp経由のcode actionsなども似たUIなので楽。

:::image-row
![snacks.nvim file piker on nvim#medium](./imgs/nvim-picker.png)
![lsp on nvim#medium](./imgs/nvim_lsp.png)
:::

## Window Manager: Hyprland

[hyprland config](https://github.com/Uliboooo/dotfiles/tree/main/.config/hypr)

みんな大好きなHyprlandです。選定理由としては

- 周りのツールが揃ってる(hyprlidle, lock, shot, etc...)
- 雑に強めの効果をつけれる
- auto-tilingで頭空っぽにして操作できる
- rofiなどと組み合わせれば自分の使いやすい環境に簡単にできる

くらいです。

個人的に好きなカスタムをいくつか

### waybar

ぶっちゃけ書いたのはほぼAIですが、好みに仕上げてます。waybarは文字ベースなのでアイコンはnerd fontsのiconを使ってます。kittyかわいいね。イメージはネオン管。

これはBarで細長くてスクショに入らないので切って並べてますが、上からleft, center(正確には温度計以降がright), rightになってます。特にrightのシステム系はそれぞれhyprlandのfloating windowでkittyを起動して適切なTUIが動くようになってます。[^4]

![waybar](./imgs/waybar.png)

### キーボードだけのウィンドウ リサイズ

hyprlandにはsub mapというものがあり、特定のモードによってキーバインドを変更出来ます。

そこで私は`SUPER + R`でresizeモードに入り、`hjkl`でウィンドウをリサイズできるようにしています。

<blockquote class="twitter-tweet">
    <p lang="ja" dir="ltr"></p>
    <a href="https://x.com/senox78/status/2071042133914755396?s=20"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

### rofiにいろいろ集約

デスクトップでは様々なものを選択しますが、それぞれが別のUIでは面倒です。そこでrofiの`dmenu`モードを使って色んなことを同様のUIで操作できるようにしています。

左上からapp launcher, clipboard history, コマンドパレット, 即時lockとかlogoutとか。パレットはキーバインドにするほどじゃないやつとか。

:::image-row
![lau#medium](./imgs/launcher.png)
![lau#medium](./imgs/cliphist.png)
![lau#medium](./imgs/cmd_pl.png)
![lau#medium](./imgs/lcok.png)
:::

## ターミナル: kitty

特別に理由もないですが、nix手入れやすい & linuxで使いやすいを求めると自然にこうなった感じ。tab機能くらいしか使ってない。強いて言うなら独自のプロトコルでエスケープシーケンスで文字サイズを同一バッファー内で変更できるので、`presenterm`などとの相性が良いというのもある。

## Shell: Zsh

bash互換強めでabbrが使えるとなると割と妥協点。対話だけならfishもいいけど、たまに互換性とかで面倒になるので結局zshに。

## 壁紙制御: awww + wlmstr(自作)

waylandの壁紙を制御するツールは多いですが私はなんとなくで[awww](https://codeberg.org/LGFae/awww)というツールを使っています。

使い方はごくシンプルで`awww-daemon`を起動した後に、`awww img <path/to/img>`で壁紙が適用されます。しかし`awww`にはディレクトリから写真を選ぶとか、スライドショー的な機能はなく前まではbash scriptでどうにかしていました。

ただスライド用のディレクトリの切り替えなどの機能が欲しくなって来て、bashで書くのが限界になったため、Rustで同様のツールを書き直しました。[wlmstr](https://github.com/Uliboooo/wlmstr)

やってることはごく単純で、現在のフォルダパス、現在の背景画像パスを`XDG_DATA_HOME/wlmstr/data.json`に保持して、適切な`awww`を実行するというラッパーです。それを`systemd --user`で定期的に実行することで自動スライドショーにしてます。

一応ファイルが動画系なら`mpvpaper`という動画を背景にするやつで起動します。私は重いのであんまり使いませんが。

## ハード: ThinkPad

特にこだわりはない。USレイアウトのラップトップを国内で調達できるのがMacbookかThinkPadか、くらいか感じなので... (DELLもあったかな?) 強いて言うならもっと輝度が高くまででるマシンにすればよかったとは。窓が近いとつらい。300nitsがMAXなので。

[^1]: 他にもいろんな便利機能(statuscolumn, indent guides, etc...)があって便利。細かいpluginsを吸収してくれる

[^2]: <a href="../neovim-toggleterm-spc-lag" class="link--underline link--external" target="_blank" rel="noopener noreferrer">Neovim toggle-term内のスペースが重い</a>

[^3]: `/foo/index.ts`じゃなくて`/foo/foo.ts`とかにしたくなるっていう。pickerでもディレクトリ命も検索対象だけどファイル名で絞れたほうが楽なので。

[^4]: 左から温度: `btop`, 音量: `wiremix`, BT: `bluetui`, Net: `nmtui`が起動する。

## 編集履歴

- Jul 02: 壁紙制御について`systemd`の話を追記
