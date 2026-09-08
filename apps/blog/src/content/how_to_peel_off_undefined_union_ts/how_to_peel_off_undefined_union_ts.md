---
title: "TSでundefined unitonの剥がし方"
date: 2026-05-12
tags: ["ts"]
published: false
---

自分用のメモ

```ts
type T = string | undefined;
```

## union

`|`: 演算子

```ts
type T = string | number;
```

like a enum

## typeof: narrowing

```ts
function f(x: A | B) {
  if (typeof x === A) {
    // x is A
  }
}
```

## undefined

`string | undefined`になる

```ts
type T = {
  a?: string;
};
```

null | undefinedを踏まないようにする。

```ts
function(x: T) {
    x.a?
}
```

## optional chaining + fallback

```ts
const v = obj?.
```
