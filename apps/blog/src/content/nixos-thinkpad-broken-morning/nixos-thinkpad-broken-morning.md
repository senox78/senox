---
title: "朝起きたらNixOSなThinkPadが壊れていたので、OSを入れ替えた"
date: 2026-06-06
description: "ぶっ壊れたNixOS ThinkPadを復旧させたかった話"
tags: ["linux", "nix", "repair"]
published: true
---

## 結論: 未解決. Deabinにした

**Debian**をベースにパッケージマネージャーをnixにした。Feforaも良いけどSELinux等々がnixと衝突しそうだったため。

理由としては「面倒。忙しい。手っ取り早い解決手段がある」ので。

https://x.com/senox78/status/2062778014069674394

:::message

- NixOSが原因かは不明
- なんならHyprlandとgdmの相性の悪さかも
- いろいろ助言くれた方たち、ありがとうございました
  :::

---

これ以降は愚にもつかないやったことメモ。

---

## 現状(Fri Jun 5 14:00)

- 朝起きたらNixOSがインストールされたThinkPad(以下nixpad)が死んでいた
  - 具体的には起動後にnixの世代選択画面が表示され、その後bootは進むが途中(ないしboot後に)GUIのログイン画面が起動しない
  - と思ったらTTYへの切り替えもできない
  - => おそらくBootが完了してない
- 当日は試験だっため予備のmacで無事
- 帰ってきた <- 今ここ
- AIと問答したところ、バッテリー切れのシャットダウンによるファイルシステム破損の可能性
  - 詳細は後述

## バッテリー切れの可能性

普段はnixpadには60W程度のACを接続している。が、昨日の夜はMacBookに使っていたため画面を開き(実は4Kモニターに繋いたまま)一晩放置してしまった。

朝起きたら案の定、バッテリー切れで死んでいた。特に保存が必要な操作もなかったはずなのでそのまま起動してみると上記の不具合。

## 解決へ: Live NixOS

とりあえずその辺に転がっていたNixOSの入ったVentoy USBでlive環境に入り、`lsblk`。(これ以降は割とclaude, chatgptの奴隷となり手足となります)

### ssh

live環境からコピペもできないのは不便なのでsshする。どうせliveなので容赦無く設定を変える。

1. ssh使用時にパスワードが必要なので、nixpad(live)側で`passwd nixos`としてliveのデフォルトユーザーである`nixos`にパスワードを設定する
1. mac(予備)からsshのpub keyを`ssh-copy-id`でnixpad(live)に渡す
1. `ssh nixos@nixpad-ip-addr`

```bash
[nixos@nixos:~]$ uname -a
Linux nixos 7.0.6 #1-NixOS SMP PREEMPT_DYNAMIC Mon May 11 06:21:59 UTC 2026 x86_64 GNU/Linux
```

できた。

### lsblk

sdaがUSBでnvmeが2枚あり、`1n1`の方がNixOSの方。

```bash
[nixos@nixos:~]$ lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
loop0         7:0    0   3.4G  1 loop /nix/.ro-store
sda           8:0    1  14.4G  0 disk
├─sda1        8:1    1  14.4G  0 part
│ ├─ventoy  254:0    0   3.5G  1 dm   /iso
│ └─sda1    254:1    0  14.4G  0 dm
└─sda2        8:2    1    32M  0 part
nvme0n1     259:0    0 476.9G  0 disk
├─nvme0n1p1 259:1    0  93.1G  0 part
└─nvme0n1p4 259:2    0 383.8G  0 part
nvme1n1     259:3    0 476.9G  0 disk
├─nvme1n1p1 259:4    0     1G  0 part
├─nvme1n1p2 259:5    0 467.1G  0 part
└─nvme1n1p3 259:6    0   8.8G  0 part
```

fsckでパーティションを確認。

```
[nixos@nixos:~]$ sudo fsck -y /dev/nvme1n1p2
fsck from util-linux 2.41.4
fsck: fsck.crypto_LUKS not found; ignore /dev/nvme1n1p2
```

暗号化されている。そういえばしていました。こういうトラブルシューティングの時マジで不便なんですよね。`cryptsetup`で解除して、blkidでパーティションを確認。cryptsetupは`/dev/mapper/xxx`に解除ずみを置きます。

```bash
[nixos@nixos:~]$ sudo cryptsetup luksOpen /dev/nvme1n1p2 nixos-root
Enter passphrase for /dev/nvme1n1p2:

[nixos@nixos:~]$ sudo blkid /dev/mapper/nixos-root
/dev/mapper/nixos-root: LABEL="root" UUID="7331cdbb-110a-4412-a6c4-cd6a9164ed0a" BLOCK_SIZE="4096" TYPE="ext4"
```

ext4ですね。

### ファイルシステムは正常らしい

```bash
[nixos@nixos:~]$ sudo fsck -y /dev/mapper/nixos-root
fsck from util-linux 2.41.4
e2fsck 1.47.3 (8-Jul-2025)
root: clean, 2620773/30613504 files, 45325128/122453274 blocks
```

### マウントする & ログチェック

```bash
[nixos@nixos:~]$ sudo mount /dev/mapper/nixos-root /mnt

[nixos@nixos:~]$ sudo mount /dev/nvme1n1p1 /mnt/boot

[nixos@nixos:~]$ lsblk
nvme1n1        259:3    0 476.9G  0 disk
├─nvme1n1p1    259:4    0     1G  0 part  /mnt/boot
├─nvme1n1p2    259:5    0 467.1G  0 part
│ └─nixos-root 254:2    0 467.1G  0 crypt /mnt
└─nvme1n1p3    259:6    0   8.8G  0 part
```

ちゃんとマウントできてる。

`nixos-enter`でシステムに入る。

```bash
[nixos@nixos:~]$ sudo nixos-enter
warning: not applying UID change of user ‘gdm-greeter-2’ (60580 -> 60579) in /etc/passwd
warning: not applying UID change of user ‘gdm-greeter-3’ (60581 -> 60580) in /etc/passwd
warning: not applying UID change of user ‘gdm-greeter-4’ (60582 -> 60581) in /etc/passwd
setting up /etc...

[root@nixos:/]#
```

ここからClaudeにしたがってログをあるだけ渡していきます。面倒なのでカット。

### GDMのWaylandセッションが起動失敗らしい

```bash
gdm-wayland-session: Unable to run session
gdm: GdmDisplay: Session never registered, failing
```

> GDMがWaylandセッションを起動しようとするたびに失敗し、greeterアカウントを使い果たしてフリーズしています。

> ただ、よくある原因として WaylandセッションのXDG_RUNTIME_DIR権限問題 または compositorのクラッシュ が考えられます。

-- Claudea Sonnet 4.6 Low

どうやらHyprlandとGDMの相性が悪い?

そろそろHyprlandを卒業してもいい。

いろいろファイルを渡したらとりあえずnixをrebuildするように...  
=> 治らず

**終わり**
