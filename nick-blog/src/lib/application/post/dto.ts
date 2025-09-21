// DTOs shared across server/application layers

/** 記事のフロントマター (DTO) */
export type PostFrontMatter = {
  slug?: string;
  year?: string; // for archive
  month?: string; // for archive
  day?: string; // for archive
  title?: string;
  excerpt?: string;
  tags?: string[];
  status?: 'draft' | 'published';
  cover?: string;
  date?: string; // ISO 8601 format
}

/** S3から取得した記事データ (DTO) */
export type S3PostDto = {
  key: string; // post/YYYY/MM/DD/slug/index.md
  frontMatter: PostFrontMatter;
  body?: string;
}

/** 記事メタデータ (DTO) */
export type PostMeta = {
  key: string; // S3オブジェクトキー
  slug: string; // スラッグ
  year: string; // 年（アーカイブ用）
  month: string; // 月（アーカイブ用）
  day: string; // 日（アーカイブ用）
  title?: string; // タイトル
  excerpt?: string; // 概要
  tags?: string[]; // タグ
  status?: 'draft' | 'published'; // 公開状態
  cover?: string; // カバー画像URL
  date?: string; // 投稿日（ISO 8601形式）
};

/** 記事表示用モデル (DTO) */
export type PostViewModel = {
  slug: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  coverURL?: string;
  date?: string;
  html: string;
}