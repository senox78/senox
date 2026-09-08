---
title: "nix profile install xxxしか書いてないpkgをflake.nixに記述する"
date: 2026-08-08
description: "profileは試すにはいいけどね"
tags: ["nix"]
published: true
---

今回はniriで全ws上でのpipを実現する[probeldev/niri-float-sticky](https://github.com/probeldev/niri-float-sticky)を例に使う。

READMEのInstallationに以下のようなものしか書いてない場合にflake.nixなどの設定として書いておきたい。

```shell
nix profile install github:probeldev/niri-float-sticky
```

こうなら

```nix: flake.nix
{
  description = "dotfiles: NixOS + flakes + Home Manager";

  inputs = {
```
