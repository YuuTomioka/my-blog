# 🏗 AWSアーキテクチャ設計書 - Next.jsブログ基盤 (CloudFront + OAC + Amplify構成)

## 🎯 概要

このブログシステムは、Next.js（App Router）によるSSG/ISR構成と、記事/画像コンテンツをS3バケットに分離・管理し、CloudFront経由で配信する構成をとる。  
Amplify Hosting によりNext.jsをホスティングしつつ、S3は直接公開せず**CloudFront + OAC**を通して配信セキュリティとパフォーマンスを担保する。

---

## 🧱 使用AWSサービス構成

| サービス        | 用途                                       |
|-----------------|--------------------------------------------|
| **S3**          | Markdown記事・画像・OGP等の静的ファイル格納（非公開） |
| **CloudFront**  | S3への高速配信＋キャッシュ＋署名付きアクセス制御（公開） |
| **OAC**         | CloudFront → S3 へのセキュアなアクセス経路構築（Origin Access Control） |
| **Amplify Hosting** | Next.js アプリのホスティング（SSR/ISR/API含む） |
| **IAM**         | GitHub Actions用ロール（S3アップロード権限） |
| **GitHub Actions** | content/ 更新時の S3同期 & ISR再検証トリガー |
| **Route53**     | 独自ドメインとSSL/TLS証明書の統合 |

---

## 🪵 S3バケット設計

- バケット名：`your-blog-content-bucket`
- パブリックアクセス：**すべてブロック**
- フォルダ構造（prefix）：
    - posts/2025/09/hello-world/index.md
    - posts/2025/09/hello-world/cover.jpg
- バケットポリシー：**CloudFront OACのみ許可（public read無し）**
- アップロード方式：GitHub Actions による `aws s3 sync`
- MIME設定：`Content-Type: text/markdown`, `image/png`, `text/css` 等を明示
- メタ：必要に応じて `Cache-Control`, `ETag`, `Expires` を付与

---

## 🌐 CloudFront設計

- Origin：`your-blog-content-bucket.s3.amazonaws.com`
- **OACを有効化**
- キャッシュポリシー（パスごとにTTL設計）：

    | パスパターン       | TTL               | 備考                       |
    |-------------------|------------------|----------------------------|
    | `posts/*.md`      | 300秒（5分）     | プロフィールなどは短く設定可 |
    | `assets/*`        | 1年 + immutable  | 画像・CSS・JS等              |

- CORS：`AllowedOrigins=["https://yourdomain.com"]`
- ドメイン：`assets.yourdomain.com` などにCNAME割り当て（任意）

---

## 🖥 Amplify Hosting設計

- Next.js App Router 構成
- ISR：ページ単位で `revalidate`、または `fetch(..., { next: { revalidate } })`
- API：`/api/revalidate`, `/api/revalidate-tag` によってオンデマンド再検証
- 環境変数：
    ```env
    S3_BUCKET=your-blog-content-bucket
    NEXT_PUBLIC_ASSET_BASE_URL=https://dxxx.cloudfront.net
    REVALIDATE_TOKEN=********
    CONTENT_BACKEND=s3
    ```

---

## 🔁 GitHub Actions フロー

- 対象：
    content/ ディレクトリの変更時（Markdown・画像）
- 処理：
    1. 差分取得（Git diff）
    2. S3同期（差分アップロード + 不要ファイル削除）
    3. ISR再検証APIを呼び出し（対象ページ/タグのみ）

---

## 🔐 IAM設計

- **GitHub Actions用IAMロール**
    - アクセス制限：
        ```json
        {
            "Action": [
                "s3:ListBucket",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::your-blog-content-bucket",
                "arn:aws:s3:::your-blog-content-bucket/*"
            ]
        }
        ```
    - 認証方式：GitHub OIDC + IAM Role

---

## 🧠 運用のポイント
- `.md` や `.jpg` などの拡張子単位でS3オブジェクトの Cache-Control を調整
- CloudFrontキャッシュの即時反映には Invalidation or Cache-Control: no-cache を使い分ける
- APIルートでの revalidateTag() により、ページを再ビルドせずに差分だけ即時反映可能

---

## 🧪 テスト & 保守

| テスト内容 | 手順 |
| --- | --- |
| 初回公開 | Amplifyにpush → ページ表示確認 |
| 記事更新 | `content/` をGitHubで更新 → S3同期 → ISR再検証API実行 → 表示確認 |
| キャッシュ削除 | CloudFront Invalidate or API revalidate |
| セキュリティ | S3のpublic accessを定期確認、CloudFront以外からのアクセス遮断 |