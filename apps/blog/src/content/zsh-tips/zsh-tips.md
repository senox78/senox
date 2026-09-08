---
title: "Zsh便利集"
date: 2026-07-07
description: "short hund集的な"
tags: ["zsh"]
published: true
---

随時追加予定

## ディレクトリ内のheicをjpegに

```zsh
for f in ./*.heic(.N); do magick "$f" "${f%.heic}.jpg"; done
```

`(.N)`は通常ファイルだけにするっていう意味らしい。ディレクトリとか入っちゃうしね(e.g. `..`とか`.`)
