---
title: "swwwを使った背景制御ツールをbashで作る"
date: 2026-03-22
description: "自作ツール"
tags: ["linux", "wallpaper"]
published: true
---

## 環境

```bash
OS: Arch Linux x86_64
WM: Hyprland 0.54.2 (Wayland)
Kernel: Linux 6.19.9-arch1-1

Wallpaper_Manager: swww
Daemon_Manager: systemd
```

## 仕様

仕様というほどじゃないですが、動作に関する概要を。

- 指定のフォルダ内の画像を順`seq`,逆`rev`,ランダム`rnd`の順で背景に設定する
- user systemdを使って15分毎に自動切り替え

もっと具体的な仕組みについては以下のリストとフローチャートを。

- 壁紙の操作は`cycle_wallpapaer.sh`内で`swww`コマンドを用いる
- スクリプトはモードとして順`seq`,逆`rev`,ランダム`rnd`,スライドのポーズ`pse`の4つ
  - `pse`はsystemdのstart, stopをトグルする
- 15分(:00,15,30,45分)ごとにランダムで切り替わるようにuser systemdでスクリプトを叩く
- 現在の壁紙のパスは`$HOME/dotfiles/.config/hypr/env/CURRENT_PAPER`にテキストとして保持

```mermaid
flowchart TD
    TIMER["🕐 cycle_wallpaper.timer
    15分ごとに自動実行"]
    SERVICE["⚙️ cycle_wallpaper.service
    Type=oneshot / rnd モードで起動"]
    SCRIPT["📄 cycle_wallpaper.sh
    引数によって処理を分岐"]

    TIMER -->|Requires + OnCalendar| SERVICE
    SERVICE -->|ExecStart で呼び出し| SCRIPT

    SCRIPT --> CASE{引数 $1 の値は?}

    CASE -->|seq| SOR0["seq_or_rev / rev_mode=0
    ファイルを順番に進める"]
    CASE -->|rev| SOR1["seq_or_rev / rev_mode=1
    ファイルを逆順に戻る"]
    CASE -->|rnd| RND["random_paper
    shuf -n 1 でランダム選択"]
    CASE -->|pse| PSE["toggle_systemtimer
    タイマーの一時停止・再開"]

    SOR0 & SOR1 --> CP{"CURRENT_PAPER を確認
    ~/.config/hypr/env/"}

    CP -->|ファイルが存在して有効| GETALL["get_all
    find + sort で一覧を取得"]
    CP -->|ファイルなし・パス無効| FIRST["get_first_path
    一覧の先頭 head -1 を返す"]

    GETALL --> NEXT["get_next_path
    grep -A1 / -B1 で隣接行を取得"]
    NEXT -->|マッチ行の次が存在| WRITE
    NEXT -->|末尾・先頭に達したら折り返し| WRITE

    FIRST --> WRITE["CURRENT_PAPER に書き込み
    次回のために現在地を保存"]
    RND --> WRITE

    WRITE --> SWWW["🖼️ swww img [path]
    --transition-type center
    --transition-duration 0.5"]

    PSE --> END["systemctl --user start/stop
    タイマー状態を切り替えて終了"]
```

ちなみにhyprlandの設定で以下のようにして手動でも操作できるようにしてます。

```toml: ~/.config/hypr/hyprland.conf
# wallpapers
bind = $mainMod, W, exec, ~/dotfiles/script/cycle_wallpaper.sh "seq"
bind = $mainMod SHIFT, W, exec, ~/dotfiles/script/cycle_wallpaper.sh "rev"
bind = CONTROL ALT, W, exec, ~/dotfiles/script/cycle_wallpaper.sh "rnd"
bind = $mainMod CTRL, W, exec, ~/dotfiles/script/cycle_wallpaper.sh "pse"
```

## ソースコード

https://github.com/Uliboooo/dotfiles/blob/main/script/cycle_wallpaper.sh
https://github.com/Uliboooo/dotfiles/blob/main/.config/systemd/user/cycle_wallpaper.service
https://github.com/Uliboooo/dotfiles/blob/main/.config/systemd/user/cycle_wallpaper.timer
