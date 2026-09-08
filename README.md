# senox.cc

Bun workspaces で `senox.cc` 配下のサイトを管理する monorepo です。

```text
apps/
  web/     senox.cc 本体（現在は placeholder）
  blog/    https://senox.cc/blog/
packages/
  shared/  将来の共通 UI / styles / config
```

## Commands

```sh
bun install
bun run dev          # blog dev server
bun run build        # blog production build
bun run preview:blog
bun run tags:check
```

production build は `dist/blog/` に blog を生成します。Cloudflare Pages の build output directory は `dist` を指定します。

blog 固有の記法と開発ツールは [apps/blog/README.md](./apps/blog/README.md) を参照してください。
