---
title: "Neovimでlspのエラー(現在の行)などをコピーする"
date: 2026-03-24
description: "Lspのエラーのコピーって必須よね"
tags: ["how2", "nvim"]
published: true
---

以下を設定として読み込まれるようにする。

```lua: keymap.lua
vim.keymap.set("n", "dc", function()
  local diags = vim.diagnostic.get(0, { lnum = vim.fn.line(".") - 1 })
  local cmap = {
    [1] = "Error",
    [2] = "Warn",
    [3] = "Info",
    [4] = "Hint",
  }

  if #diags > 0 then
    local d = diags[1]
    local ebuf =
      string.format("%s: %s, %s, by %s at %d:%d-%d:%d", cmap[d.severity], d.message, d.code, d.source, d.lnum, d.col, d.end_lnum, d.end_col)
    vim.fn.setreg("+", ebuf)
    vim.notify("Diagnostic copied!", vim.log.levels.INFO)
  end
end, { desc = "Copy diagnostic message" })
```

## 仕組み

### lspの結果

lspの結果は`local diags = vim.diagnostic.get(0, { lnum = vim.fn.line(".") - 1 })`で取得できる。`vim.fn.line(".") - 1`は現在の行番号(indexの関係で-1する)を使って現在の行を`vim.diagnostic.get`に渡す。

lspの結果は以下の構造だそう。

```lua
{
  bufnr = 8,                  -- バッファ番号
  code = "undefined-global",  -- エラーコード
  col = 6,                    -- 開始列（0-indexed）
  end_col = 9,                -- 終了列（0-indexed）
  end_lnum = 25,              -- 終了行（0-indexed）
  lnum = 25,                  -- 開始行（0-indexed）
  message = "Undefined global `vim`.",  -- メッセージ本文
  namespace = 45,             -- diagnostic namespace ID
  severity = 2,               -- 1=Error 2=Warn 3=Info 4=Hint
  source = "Lua Diagnostics.", -- 診断元LSP名

  user_data = {               -- LSP生データ（より詳細）
    lsp = {
      code = "undefined-global",
      message = "Undefined global `vim`.",
      range = {               -- LSPのrange（こちらも0-indexed）
        start     = { line = 25, character = 6 },
        ["end"]   = { line = 25, character = 9 },
      },
      severity = 2,
      source = "Lua Diagnostics.",
    }
  }
}
```

### 結果のフォーマット

さっきの構造から必要そうなフィールドの値をstring.format()でフォーマットする。

```lua
local d = diags[1]
local ebuf = string.format(
  "%s: %s, %s, by %s at %d:%d-%d:%d",
  cmap[d.severity],d.message, d.code,
  d.source, d.lnum, d.col, d.end_lnum,
  d.end_col)
```

上記のようにフォーマットすると以下のような結果が得られる。

```
Warn: Undefined global `vim`., undefined-global, by Lua Diagnostics. at 38:4-38:7
```

### severityの変換

severityは数字なので、以下のマップを使って数字を文字に変換する。

```lua
local cmap = {
  [1] = "Error",
  [2] = "Warn",
  [3] = "Info",
  [4] = "Hint",
}
```

### コピーする

`vim.fn.setreg()`を使ってvimのクリップボードにコピーする。"+"を使うことでシステムのクリップボードに入れる。あと通知も一応。

```
vim.fn.setreg("+", ebuf)
vim.notify("Diagnostic copied!", vim.log.levels.INFO)
```

## demo

<video autoplay loop muted playsinline style="max-width: 100%; height: auto;">
  <source src="/blog/videos/demo.webm" type="video/webm">
  <source src="/blog/videos/demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
