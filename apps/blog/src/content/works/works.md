---
title: "works"
date: 2026-07-28
description: "作ったものとか"
tags: ["me"]
published: true
---

<a href="../me" class="link--underline link--external" target="_blank" rel="noopener noreferrer">About Me</a>

## ghost_git_writer

LLMでGitコミットメッセージ、README、または差分要約を作成するツール。本当はサブコマンドではなく別コマンドとして実装するべきだったためいつか分けることを検討中...

TSへ書き換えて別コマンドになった。

[Github Repository](https://github.com/senox78/ghost_git_writer)

![ggw#upper](./eg-of-ggw.png)

## dotfiles

Hyprland + Archを中心としたdotfiles。個人用ですが、ある程度汎用化してあるため流用可能。含まれる設定などはREADMEを参照ください。

[GitHub Repository](https://github.com/senox78/dotfiles)

![Hl](./my_my.png)

## wlmstr

awww を利用した stateful な壁紙管理 CLI ツールです。指定したディレクトリ内の画像を順番に管理し、実行するたびに壁紙を切り替えます。スライドモードとして、順方向、逆方向、ランダムをサポートしています。Rust製。

[GitHub Repository](https://github.com/senox78/wlmstr)

![wlmstr help](./wlmstr_help.png)

## hyprPanopticon

Hyprlandでworkspaceを円形に一覧するツール。Rust, GTK4, Layer shell. ほとんどfable5さんが書いた。

[Github Repository](https://github.com/senox78/hyprPanopticon), [Web site](https://hyprpanopticon.uliboooo.dev/)

![hyprPanopticon](./hyprPanopticon.png)

## 初心者向けLinux doc

大学のLinuxサークル(申請中)のメンバー([@liar2357](https://github.com/liar235)と[@senox78(自分)](https://github.com/senox78))と共同でリリースを行ったサイトです。Linuxを始めるにあたっての基礎的な学習を行う事を目的としたサイトです。

私は主に文書を、[@liar2357](https://github.com/liar2357)はサイト(React等)のシステムを構築しました。

[GitHub Repository](https://github.com/linux-club-tid/linux-docs-next), [Website](https://linux-docs-next.pages.dev/)

![screenshot](./screenshot_linudoc.png)

## easy_storage

Rustにおけるstructやenumデータを、JSONまたはTOML形式で容易にファイルへ保存、読み込みするためのTraitを提供するライブラリ。実質的にはserdeのラッパー。

[GitHub Repository](https://github.com/senox78/easy_storage), [crates.io](https://crates.io/crates/easy_storage)

```rust: usage
use serde::{Deserialize, Serialize};
use easy_storage::Storeable;

#[derive(Debug, Serialize, Deserialize)]
struct User {
    name: String,
    email: String,
}

impl Storeable for User {}
```

## track2line

VoiSona Talk などから出力された音声ファイルの名前を、台詞テキストを参照して一括変換するツール。メイン機能はLibとして分離されており、CLIとGUI版を開発している。GUIは[egui](https://github.com/emilk/egui)で実装。

[GitHub Repository [CLI]](https://github.com/senox78/track2line)
[GUI](https://github.com/senox78/track2line_gui)
[Lib](https://github.com/senox78/track2line_lib)

![t2l-img](./t2l-gui.png)

## hypr-presto

GTK製のWayland向けアプリランチャー。アプリを1つのキーストロークで起動。例えば以下の場合にはhypr-presto起動後に`f`を押すだけでFirefoxが起動する。登録するアプリは設定ファイルで定義。prestoは演奏記号で[極めて速く](https://ja.wiktionary.org/wiki/presto)という意味から。

[Github Repository](https://github.com/senox78/hypr-presto)

![demo-presto](./demo-presto.png)

## cli_playground

CLIにおける引数などの一般的な、解析結果のみを表示するコマンドです。これは環境を壊さずにCLIを練習するためのものです。

[GitHub Repository](https://github.com/senox78/cli_playground)

![1#upper](./cli-play1.png)
![2#upper](./cli-play2.png)

## voime

Linuxでwhisperを用いた音声入力をできるようにすることを目指すプロジェクト。元々はIMEとして開発する予定であったため、Voice + IMEとして`voime`としたが ~~IMEとしての実装が面倒になったため、~~ ポップアップで文字起こししてクリップボードにコピーする形に。

[GitHub Repository](https://github.com/senox78/voime)

## local_issues_lib

GitHubのIssuesと似たような課題管理をローカルで行うための機能を提供するlib。下記の`fork_notes`にて使用。

[GitHub Repository](https://github.com/senox78/local_issues_lib)

## fork_notes

上記の`local_issues_lib`をGUIとして実装したもの。GUIは`egui`を利用。

[GitHub Repository](https://github.com/senox78/fork_notes)

![demo](./fork_notes_shot.png)

## task_manage_practice_mbt

Moonbitの練習用。ソフトウェアの完成度よりMoonbitの使い方を勉強している途中。

[GitHub Repository](https://github.com/senox78/task_manage_practice_mbt)

## Mother_is_angry

x.comへアクセスした際に[hacker news](https://news.ycombinator.com/)にリダイレクトするだけのChrome extenstion。名前に意味はないです。

[GitHub Repository](https://github.com/senox78/Mother_is_angry)

## min_lisp

プログラミング練習のための最小限のLisp環境。開発中のためまだ全然未完成。

[Github Repository](https://github.com/senox78/lisp_min_practice)

![result](./shot_of_lisp_machine.png)

## blog

このサイト。About meもblogの記事の1つの扱いです。

[Github Repository](https://github.com/senox78/blog)

Astroとcloudflare pagesで静的配信しています。外部リンクへの自動属性付与などいろいろ楽に書けるようにしてます。
