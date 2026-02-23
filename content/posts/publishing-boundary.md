---
title: 公開境界の設計（VaultとBlogを分離する理由）
slug: publishing-boundary
status: published
created_at: '2026-02-21'
tags:
  - architecture
  - blog
categories:
  - tech/architecture
summary: Vaultと公開ブログを分離することで安全に運用する方法
---

# 公開境界とは？

Vaultには以下が含まれます：

- 未公開メモ
- 思考ログ
- AI生成内容
- 下書き

これらをそのまま公開すると事故ります。

## 解決方法

公開用Repoを分ける：

- my-vault → 非公開
- my-blog → 公開

## exportの役割

exportは「境界」です：

- publishedだけを通す
- それ以外は遮断

## この構造のメリット

- 誤爆しない
- CIがシンプル
- 再現性が高い

---

関連記事：
- [[getting-started-static-blog]]
