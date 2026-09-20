---
title: "pythonでcliを書くメモ"
date: 2026-09-20
description: "Pyで完結するものに関しては強力よね"
tags: [python]
published: true
---

前提?

個人的にpythonはpkg manager(pipとかuv)が必要なるほどの環境で使うべきではないと思ってます。`main.py`の1ファイルで完結するレベルまでが限界だと思っています。確かにuvやらnix?とかで依存を閉じることは有用だとは思いますが、外部を頼ってまでPythonを使う理由もないよなぁと。

殆どのLinux環境にpython3の処理系が入ってることから汎用スクリプト, shell系より型の表現が強いなどを考えると上記の中であれば極めて強力なツールだとは。

---

## args parse

stdとか標準であるlibを使うのもいいけどシンプルなものであればこれでも。

```python
import sys

# python3 main.py foo bar
args = sys.argv[1:]

# 空ならエラーに
if not args:
    err("no args!")

print(args[0]) # foo
print(args[1]) # bar
```

## read toml

tomllibというlibがstdにあるらしい。

```python: load toml from file
import tomllib

with open("path/to/file", "rb") as f:
    loaded_toml_data = tomllib.load(f)

# loaded_toml_dataは[str, Any]なデータを持つ

for k, v in loaded_toml_data.items():
    print(f"key: {k}")
    print(f"value: {v}")
    print("\n")
```

---

随時追記予定
