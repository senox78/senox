---
title: "nvimのrustデバッガーへプロジェクトごとに引数を設定する"
date: 2026-06-27
description: ""
tags: ["debug", "nvim", "rust"]
published: true
---

lldb plugin(nvim-dap)の設定をいじる。argsにfunctionで毎回`.nvim/debug.lua`のテーブルから読めるようにする。

```lua: ~/.config/nvim/lua/plugins/lldb.lua
{
    "mfussenegger/nvim-dap",
    config = function()
      local dap = require("dap")

      dap.adapters.codelldb = {
       -- ~~
      }

      dap.configurations.rust = {
        {
          name = "Launch Rust",
          type = "codelldb",
          request = "launch",
          program = function()
           j
            return vim.fn.input("Path to executable: ", vim.fn.getcwd() .. "/target/debug/", "file")
          end,
          cwd = "${workspaceFolder}",
          -- 引数をproject-root/.nvim/debug.luaから読み込む
          args = function()
            local ok, result = pcall(dofile, vim.fn.getcwd() .. "/.nvim/debug.lua")
            if ok and type(result) == "table" then return result.args or {} end
            return {}
          end,
          stopOnEntry = false,
        },
      }
    end,
  }
```

プロジェクトディレクトリに`.nvim/debug.lua`を置く。

```lua: .nvim/debug.lua
return {
  args = {
    "next",
    "seq",
  },
}
```

これで`cargo run -- next seq`と同等の処理になる。
