# 🔤 types 層

## 役割
プロジェクト横断で使える型ユーティリティや抽象型（Result型、ID型、Date型など）を管理します。

- 特定ドメインやユースケースに依存しない型のみを置く
- 外部ライブラリ型のラップなどもここで行う

## 参照ルール
✅ 全レイヤーからimport可能（循環しない）

## 例
- `Result<T, E>` 型
- `Brand<K, T>` 型
- `Nullable<T>` 型

## サンプル
```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```