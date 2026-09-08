---
title: "Neovim toggle-term内のスペースが重い"
date: 2026-07-01
description: "SPCのtimeoutが原因でした"
tags: ["fix", "nvim", "term"]
published: true
---

## 問題: toggle-term内のspaceを開けると以上に重い

nvimでtoggle-termを使っているのですが、その上でスペースを入れる、つまりコマンドとオプションの入力などをすると以上に入力可能になるまでの時間が伸びる。

```zsh: on toggle-term
ls .config/
# 👆このタイミングで`.config/`が入力できるようになるのが遅い
```

最初はzsh-abbrなどの展開が遅いのかと思っていた。しかし`bash`でも遅いので他の原因...

また後からわかりますがおそらくこの待ち時間は`1000ms`程度とわかります。コマンドラインとしてはストレスの出る遅さですね。

## 原因: SpaceをLeaderにしており、それのタイムアウト待ちだった

私はhelixに一瞬浮気したあたりからSpace keyをnvimのメインのleader keyにしていたのですが、そうするとSpaceを離しても**1000ms**はspaceの判定が残るようになります。その間に`f`などを押せば指定の操作が発火すると言う仕組みです。[^1]つまり毎回1000msかけて入力されたspaceがprefixかspaceかを判定するわけです。

そしてなぜか使ってもいない`<Leader>`を使ったkey bindが設定に含まれていました。toggle termは普通に`ctrl + \`の方が使いやすく、そのような設定にしてましたが念のためで`<Leader>`(Space)の設定も書いていたようです。

**つまりtoggle term上でもSpaceが押されるたびに1000msの判定をしていた**

そりゃ遅いわけです。

```lua: ~/.config/nvim/lua/plugins/term.lua
return {
  {
    "akinsho/toggleterm.nvim",
    version = "*",
    config = function()
      -- 色んな設定

      -- Toggle terminal (`Ctrl + \`でtermをtoggleする)
      vim.keymap.set(
        { "n", "t" },
        "<C-\\>",
        function() vim.cmd("ToggleTerm") end,
        { noremap = true, silent = true }
      )

      -- 👇こいつが邪魔してた
      vim.keymap.set(
        { "n", "t" },
        "<Leader>\\",
        function() vim.cmd("ToggleTerm") end,
        { noremap = true, silent = true }
      )
    end,
  },
}
```

普通にこの`"<Leader>\\",`の設定を消して解決です。

快適zsh on toggleterm。

## 似ていることは前にもあった

[snacks.nvimのlsp symbolsが遅かった原因-Zenn](https://zenn.dev/uliboooo/articles/49e95a8956d71e)

だいたい同じ原因です。普通の入力に使うキーを無理矢理prefixとかのメタ的なキーにするのはちょっと面倒くさいですね。

[^1]: 私の場合はfzf finder
