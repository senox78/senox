---
title: "nixメモ"
date: 2026-06-30
description: "nixに関するメモ書き"
tags: ["memo", "nix"]
published: true
---

:::message
終始怪しい理解です。あくまで個人的なアウトプットということで。
いつか整理したい
:::

## configuration.nix

NixOSの設定ファイル? machineのhostnameとかbootloaderとかKVMのユーザーとか割とシステム全体の設定?

## flake

`flake.nix`と`flake.lock`により完全にバージョンを固定した依存関係をプロジェクトで共有できる機能。これを使えば他人のプロジェクトも(きっと)手前でbuildできるし、ちょっと書けばhome-managerにも混ぜることができる。

## home manager

ユーザーごとのpkgやconfigなどの配置を宣言するツール。個人的にはmacOSなどでも使えるのでLinux専用とかじゃない物はできるだけこちらに書いておきたい。Debianなどのnot-NixOSなOSでもnixをstand aloneで使うときに便利なので。

## nix shell

一時的にnixのpkgなどを使う。サブシェルのような形なのでexitすればそのpkgは使えなくなる。

## nix develop

(多分)`flake.nix`などを使ってプロジェクトごとに依存関係を記述する。Cとかの魔境になりがちな依存関係解決の一助になる?

## nix profile

home-managerのコマンド版というか、imperative(命令的)な操作でパッケージをユーザー環境へインストールするやつ。個人的にはdotfilesなどでnixの設定も共有しているので、普通に再現性を落とすのであまり使いたくない。

## nix profileが提供されているプロジェクトで、home-managerに入れるには

例えば[tirith.sh](https://tirith.sh/)という危険なコマンドをチェックするツール。install helpのnixの項目はこれしかありません。`profile`を使いたくない && zshrcなどに読ませるぽいので、home-managerに入れてしまいましょう。

:::details[この環境について]

だいたいこんな環境の話。自分で使うようなpkgは基本的にcommon_user.nixに入れてる。

```bash
├──  flake.lock
├──  flake.nix
├── 󱂵 home
│   ├──  alice.nix
│   ├──  common_user.nix
│   └──  seli.nix
├──  hosts
│   └──  desktop
│       ├──  configuration.nix
│       └──  hardware-configuration.nix
└─  modules
    ├──  common.nix
    ├──  desktop.nix
    └──  thinkpad.nix
```

:::

```bash
nix profile install github:sheeki03/tirith
```

これを、こういう感じに書くことでhome managerでインストールができる。

```nix: flake.nix
{
  # ~~~
  inputs = {
    tirith = {
      url = "github:sheeki03/tirith";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  # ~~~
}
```

```nix: home/common_usr.nix
{
  config,
  pkgs,
  inputs,
  lib,
  ...
}:
let
  # ~~~
  tirith = inputs.tirith.packages.${pkgs.system}.default;
  basePackages = with pkgs; [
    tirith
  ];
in
{
  # ~~~
}
```
