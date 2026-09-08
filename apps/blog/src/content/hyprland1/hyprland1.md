---
title: "タイリングの話をしないHyprlandの紹介"
date: 2026-03-26
description: "Hyprlandの紹介"
tags: ["linux", "tiling"]
published: true
---

今回は代表的なWMとしてHyprlandを主に話しますが、代替はSwayとかi3とかのWMにも共通してる話です。

## 今だけのSpecial Workspace

そもそもHyprlandはワークスペース(以下ws)という単位で複数のウィンドウをまとめて管理します。Windowsの仮想デスクトップやmacのスペースに相当する機能です。

基本的に、wsは横方向に順に管理されます。これはHyprlandでも同様に1,2,3...9のように管理されます。少し特別?なのはHyprlandのwsはキーボードの数字で移動することがメインのため、9(もしくは0を10として)個のwsが標準的です。[^1]

これらの標準のwsとは別に、**Special Workspace**と呼ばれるwsがHyprlandには存在します。これらにはindexがなく固有の名前で管理されます。これらはwsの列とは独立しているため、モニターにもwsの順番にも縛られずに**いつでも, どこからでも**呼び出すことができます。

私の使い方としてはgmailやDiscord, todoアプリなどの常時起動しておきたいツールを置いておくために使っています。Msgという名前で管理しています。

![](https://storage.googleapis.com/zenn-user-upload/352ab9131b4f-20260326.png)

左にgmailとDiscord, 右にtodo.

## 自分だけのstatus bar

以下は私のstatus barです。status barとはWindowsのタスクバーやmacのmenu barに相当します。一般的にHyprlandなどのWMのみの提供となっているツールにbarは付属しない[^2]ので、自分で用意することになります。

用意が必要な点が面倒でもあり、自分だけの情報表示を行うことができます。デザインもcssで自由です(私は面倒なのでAIに雰囲気を伝えて書いてもらいました)。

全体
![](https://storage.googleapis.com/zenn-user-upload/72781d0e3ba9-20260326.png)
左:ws一覧
![](https://storage.googleapis.com/zenn-user-upload/dbc356fa370f-20260326.png)
センター: 時間, アクティブウィンドウの名前
![](https://storage.googleapis.com/zenn-user-upload/47bca6d85171-20260326.png)
右: 再生情報,CPU温度,音量,BT,Net,バッテリー,[TLP](https://wiki.archlinux.org/title/TLP) status,tray,通知センター
![](https://storage.googleapis.com/zenn-user-upload/ec00140c8fd7-20260326.png)

これは[waybar](https://github.com/alexays/waybar)という超メジャーなbarを使っています。waybarは比較的デフォルトがシンプルで、ユーザーが独自に設定を書いて行く文化が強いです。ただユーザーが多いのか比較的情報も多いので便利。

最近は設定を書かずに使えるbarを提供するものも増えていてそれらを選ぶのも良い選択です。

https://malpenzibo.github.io/ashell/

他にはこのあたりのページを。
https://wiki.hypr.land/Useful-Utilities/Status-Bars/

## なんでも選べる。圧倒的なmodulability

ここまででも普通のOSなら(なんならGNOMEとかでも)いじれない,いじるのが面倒な箇所までカスタムできることがわかったと思います。[^3]

それ以外にも、Hyprlandでは壁紙の制御や通知センター、アプリランチャーなども好きなものを選ぶことができます~~しないと使い物にならないです~~。

これはHyprlandがあくまで**Wayland Compositor**というウィンドウ管理のみを提供するソフトウェアであり、それ以外のデスクトップ環境 ( 壁紙制御, ロック画面, 通知センター, アプリランチャー, XDG portal, スクショツール )については外部ツールに任せる形であり、それらは独立して動作する(モジュール化されている)ため、コアな機能に見えても入れ替え可能なのです。

いわばUnix哲学的?

これがHyprlandの最大の**メリットであり、デメリット**です。

例えば私は先程のツールたちを以下に選んでいます。多分比較的標準的な構成。

|                  |              |
| :--------------: | :----------: |
|     壁紙制御     | `awww(swww)` |
|    ロック画面    |  `hyprlock`  |
|   通知センター   |   `Swaync`   |
| アプリランチャー |   `fuzzel`   |
|  スクショツール  |  `Hyprshot`  |

またツールだけでなくこれらの設定も自由に記述できる上にCLIなどから操作するものが多いため、bashスクリプトやsystemd timerを用いて操作の自動化なども行えます。既存のツールの挙動が気に入らない場合などに自分で挙動を決めることができます。また最近はAIもあるので比較的Bashも楽に書けます。

私は壁紙を00,15,30,45分のタイミングで切り替えたかったので、awwwを実行するスクリプトをsystemdのtimerで回してます。またそのタイマーの再生停止もスクリプトで制御してます。

Hyprlandはキーバインドによってスクリプトを実行するなどがとても容易なため、このあたりのカスタマイズはやりたい放題です。

https://zenn.dev/uliboooo/articles/c4264b097f1abf

スクリプトとか設定とか全部あるrepo。

https://github.com/Uliboooo/dotfiles

## 設定を書きたくないならGNOMEへどうぞ

Hyprlandは自由度がとても高いということはわかっていただいたと思います。しかし、その強大なメリットには、**終わりの見えないdotfiles盆栽**, **古くて使えない設定フィールド**, **いつのものかわからないdocの提供**などの割と面倒な代償を支払っています。

環境とかこだわりはない、すぐにコードが書きたいといった方は素直にGNOMEやKDE(こっちのほうがカスタム性高そう)を使った方が幸せだと思います。

実際、私もどちらかといえば設定ファイルはあまり書きたくないし、とりあえず動く環境のほうが好きです。しかし、冒頭で紹介したSpecial Workspaceや自分だけのwaybarデザインなどを一度使ってしまうと、それが無い他の環境ではあまりに幸せ指数が下がってしまうようになってしまったので、おそらくもうしばらくはHyprland沼 もといdotfiles盆栽から抜けられそうにないです。

特にSpecial workspaceは致命的。

[^1]: 設定のやりようで、キー数の限界までwsの数を増やすことはできる

[^2]: Swayかなんかは同梱されてるものがあった気がする

[^3]: ここまでのカスタムならKDEの方が楽なのはそう
