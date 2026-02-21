---
title: "Next.js × S3で最小構成の静的ブログを作る"
slug: "getting-started-static-blog"
date: "2026-02-21"
status: "published"
tags: ["nextjs", "aws", "blog"]
categories: ["tech/web"]
summary: "Next.jsのstatic exportとS3 + CloudFrontでブログを公開する最小構成を解説"
---

# Next.js × S3で静的ブログ

このブログは以下の構成で動いています：

- Next.js (static export)
- S3 (ホスティング)
- CloudFront (CDN)

## なぜこの構成か？

- コストが安い
- シンプル
- 可用性が高い

## データの流れ

Vault → export → blog repo → build → S3 → CloudFront

## まとめ

- Markdownで記事を書く
- exportで公開用データを生成
- pushすると自動デプロイ

---

関連記事：
- [[publishing-boundary]]