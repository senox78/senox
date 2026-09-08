# 説明画像(SVG)生成規約

記事内の概念説明図をSVGで生成するときの規約。既存例: `src/content/niri-shiso-awanaide/*.svg`

## 基本構成

- 手書きせずコードとして読めるSVGを書く。グラデーション・影・フィルタは使わない
- ルート要素: `viewBox` と `width`/`height` を明示。横幅は `1360` を基準にし、高さは内容に合わせる
- フォントはルートに指定: `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"`
- 全面に白背景を敷く: `<rect width="..." height="..." fill="#ffffff"/>`
- スタイルは冒頭の `<style>` にまとめ、短い意味ベースのクラス名を使う(例: `.ws` workspace, `.win` window, `.mon` monitor, `.t` text, `.tl` 見出し, `.tr` 警告テキスト, `.arw` 矢印)
- セクションごとに `<!-- コメント -->` で区切り、何を描いているか書く

## 色

色数は最低限。「中立色 + 青」を基本とし、必要なときだけ緑・赤茶を足す。
すべて「淡い塗り + 同系統の濃い1pxストローク」のペアで使う。

| 役割 | fill | stroke |
| --- | --- | --- |
| 背景 | `#ffffff` | — |
| 中立の入れ物(ワークスペース等) | `#f1efe8` | `#5f5e5a` |
| 主役・青 | `#e6f1fb` | `#185fa5` |
| 対比・強調したい正例(緑) | `#e1f5ee` | `#0f6e56` |
| 警告・問題点(赤茶) | `#faece7` | `#993c1d` |
| 概念的な枠(モニタ等) | `none` | `#184f95` |
| 補助線・矢印 | — | `#898781` |
| 本文テキスト | `#52514e` | — |

- 緑は「別グループ」や「うまくいく側」の対比に、赤茶は「問題・注意」にだけ使う。装飾目的で色を増やさない
- 警告テキストは赤茶 `#993c1d`、枠に紐づくラベルはその枠のストローク色に合わせる

## 線と角丸

- 実体のある箱: `stroke-width: 1`、実線
- 概念的・仮想的な境界(ビューポート、空間の範囲): 破線で描く
  - モニタ枠: `stroke-width: 3; stroke-dasharray: 14 10`
  - 広い空間の外周: `stroke-width: 2; stroke-dasharray: 8 8`
  - 視線などの細い補助線: `stroke-width: 2; stroke-dasharray: 1 7; stroke-linecap: round`
- 角丸は階層で使い分け: 内側の小さい箱 `rx="8"` → 入れ物 `rx="10"` → 外周の枠 `rx="14"`〜`rx="16"`

## テキスト

- ラベルは英語小文字の短い句(例: `ws 1`, `monitor 2`, `no room left — push it to another ws`)
- フォントサイズは 19–22px の範囲: 見出し 22px、本文・ラベル 20px、警告 19px
- 図の下部に1行で結論・補足のキャプションを置く(中央寄せなら `text-anchor="middle"`)

## 矢印

`<defs>` にマーカーを定義して `marker-end` で使う:

```svg
<marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="#898781"/>
</marker>
```

線は `stroke: #898781; stroke-width: 3`。
