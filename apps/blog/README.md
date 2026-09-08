## せの Blog

`https://senox.cc/blog/` で公開する Astro application です。monorepo root からは `bun run dev` / `bun run build`、この directory からは従来どおり `bun run dev` / `bun run build` を実行できます。

production build は monorepo root の `dist/blog/` に生成され、Cloudflare Pages 用の `_headers` と `_redirects` は `dist/` 直下へ配置されます。

Astro, Cloudflare Pages.

## ビルド機能・記法

markdownパイプラインは`src/markdown-pipeline.js`に集約されていて、サイト本体のレンダリングと`/html/<slug>`エンドポイントで共有される。

### Typst風記法(remark-typst)

`*strong*` / `_emphasis_` / `#footnote[内容]` / 行頭`=`見出し(`=`がh2) / `#quote(...)[引用文]`。詳細は[writeing_rule.md](./writeing_rule.md)を参照。

出典付き引用は`#quote(attribution: "Markdown - Wikipedia", url: "https://ja.wikipedia.org/wiki/Markdown")[引用文]`のように書くと`<figure><blockquote cite="..."> + <figcaption><cite>`になる(引数は両方任意)。

### ディレクティブ(remark-directive)

| 記法                  | 出力                                                 |
| --------------------- | ---------------------------------------------------- |
| `:::message`          | 黄色の注意ボックス                                   |
| `:::alert`            | 赤色の警告ボックス                                   |
| `:::details[ラベル]`  | 折りたたみ(`<details>`/`<summary>`)                  |
| `:::row`              | ブロック単位の横並び(下記・新規記事ではこちらを推奨) |
| `:::image-row`        | 画像の横並び(既存記事との互換用)                     |
| `:::pros` / `:::cons` | `+` / `−` 付きリスト                                 |
| その他任意の名前      | その名前がclassになった`<div>`(インラインは`<span>`) |

`:::image-row`内の画像は1枚なら原寸(コンテナ幅まで)、2枚なら半分ずつ、3枚以上は高さを揃えて横スクロール。既存記事との互換用として残している。

新規記事では汎用的な`row`を使う。直下の無名`:::`で囲んだ範囲（または名前付きディレクティブ）が1アイテムになり、画像とキャプション、コードブロックなどをまとめられる。入れ子にするため外側のコロンを4個にする。

```markdown
::::row
:::
![画像A](./a.png)

画像Aの説明
:::
:::
![画像B](./b.png)

画像Bの説明
:::
::::
```

子ブロックが1個なら通常幅、2個なら半分ずつ、3個以上なら各ブロックを横スクロールで表示する。意味を持たせたい場合は無名`:::`の代わりに`:::figure`など任意の名前も使える。

### pros / consリスト

- `- :+ 項目` / `- :- 項目` → 通常リスト内に`+` / `−`項目を混在できる
- `+ 項目`で始まる箇条書きはリスト全体がprosになる

### コードブロックタイトル(remark-code-title)

言語名の後に`:`を付けてタイトルを書くとコードブロック上部に表示される。

````markdown
```rust: main.rs
fn main() {}
```
````

各コードブロックにはクライアントサイドでCopyボタンが付く。

### 画像(altサフィックス)

altテキストに`#xxx`を含めるとサイズ・挙動を制御できる。

| サフィックス   | 効果                                       |
| -------------- | ------------------------------------------ |
| `#auto`        | 原寸(width: auto)                          |
| `#small`       | 200px                                      |
| `#medium`      | 48%                                        |
| `#middle`      | 50%                                        |
| `#upper`       | 80%                                        |
| `#no-lightbox` | クリック拡大(ライトボックス)の対象外にする |
| `#no-deco`     | リンク画像の下線・外部リンクアイコンを消す |
| `#download`    | リンクにダウンロードアイコンを付ける       |

記事内の画像はクリックでライトボックス表示(`h`/`l`・矢印キーで前後、`Esc`で閉じる)。

### その他

- 記事中の行に裸のツイートURL(`https://x.com/.../status/...`)を置くと埋め込みに変換
- 記事中の行に裸のLab86 Music Link URL(`https://music.lab86.io/link/...`)を置くと、曲名・アーティスト・ジャケットを取得してブログ内の音楽カードに変換
- 外部リンクは自動で`target="_blank"` + 外部リンク装飾
- 脚注の戻りリンク`↩`はSVGアイコンに置換(iOSの絵文字化対策)
- 各記事はraw表示エンドポイントあり: `/md/<slug>`(markdown)、`/html/<slug>`(HTML)
- OG画像はsatoriでビルド時に自動生成(`/og/<slug>.png`)

### 記事の作成

```sh
./new  # bun製の対話スクリプト。タイトル等を入力するとsrc/content/にひな形を生成
```

frontmatterスキーマ(`src/content.config.ts`): `title`, `date`, `published`(必須) / `latest_edit_at`, `description`, `tags`(任意)。

### タグのチェック・正規化

`bun run tags`で`src/content`内の記事と`src/data/external.json`のタグを検査できる。Unicode正規化・前後空白除去・小文字化、および`src/dev_tools/tag-rules.json`に定義した別名を適用対象として報告する。

#### 基本操作

```sh
bun run tags
```

報告だけを行い、ファイルは変更しない。たとえば`Linux`は`linux`、`colomn`は設定済みの`column`として表示される。

```sh
bun run tags -- --fix
```

報告された安全な変更を適用する。タグは小文字・NFKC正規化され、別名へ置換され、同一記事内で重複したタグは1つにまとめられる。実行前に`bun run tags`で差分を確認すること。

```sh
bun run tags:check
```

CIなどの確認用。正規化が必要なタグまたは未抑制の類似タグがある場合、終了コード`1`で終了する。

#### 別名ルールの生成

```sh
bun run tags -- --generate-rules
```

既存タグから別名ルールの候補を表示する。4文字以上かつ編集距離1以内の表記ゆれだけを対象にし、出現回数が多い方へ寄せる保守的な推定を行う。表示のみで、設定ファイルは変更しない。

候補を確認してから反映する場合は、次を実行する。

```sh
bun run tags -- --generate-rules --write-rules
```

#### ルールの編集

プロジェクト固有の同義語や、意図的に似ているが別物のタグは[タグルール](./src/dev_tools/tag-rules.json)に記述する。

```json
{
  "aliases": {
    "neovim": "nvim",
    "colomn": "column"
  },
  "ignoreSimilar": [["nvim", "vim"]]
}
```

`aliases`は左側を右側の正規表記へ置換する。`ignoreSimilar`は類似タグの警告を抑制する。`neovim`と`nvim`のような意味上の同義語は自動生成では判断できないため、ここに手動で追加する。

### push前のまとめ準備

```sh
bun run prepare:git
```

タグの正規化・重複除去・辞書順ソート、`src/content`配下の画像圧縮、ソース／設定ファイルのPrettier整形、production buildを順に実行する。Gitコマンド（add・commit・pushを含む）は一切実行しないため、このコマンドの後に内容を確認してからGit操作へ進める。画像は元より小さくなる場合だけ上書きし、バックアップファイルは作成しない。まず変更内容だけ確認する場合は`bun run prepare:git -- --check`、buildを省く場合は`--skip-build`を付ける。旧名の`bun run prepare:push`も互換用エイリアスとして利用できる。

## 相互リンク

募集中です。以下に例。200x40px

[![pre](./links_preview.png)](https://senox.cc/blog/me/#links)
