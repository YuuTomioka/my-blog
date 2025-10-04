# Sidebar Component Design

## 🧱 概要

このディレクトリは、アプリケーション全体に共通する「サイドバー UI」の責務を担います。  
レイアウトの一部として組み込まれ、モバイル・PC 両方の表示モードに対応します。

---

## 📁 ディレクトリ構成

```
Sidebar/
├── Sidebar.tsx                # サイドバー本体の描画・オーバーレイ処理
├── SidebarContent.tsx        # サイドバー内部に表示するナビゲーションなどの中身
├── SidebarProvider.tsx       # 開閉状態の管理用Context（グローバルステート）
├── SidebarToggle.Mobile.tsx  # モバイル専用トグルボタン
├── SidebarToggle.Desktop.tsx # PC専用トグルボタン
└── README.md                 # ← このファイル
```

---

## 🧩 責務分離の考え方

| コンポーネント名           | 役割                                                                 |
|----------------------------|----------------------------------------------------------------------|
| `SidebarProvider`          | グローバルな開閉状態 (`open`, `toggle()`) を提供                     |
| `Sidebar`                  | サイドバーの見た目、開閉のアニメーション、モバイルオーバーレイ処理  |
| `SidebarContent`           | メニュー・リンク・UIなどサイドバー内部の実装                        |
| `SidebarToggle.Mobile`     | モバイル画面用の開閉トグルボタン（上部バーなどに設置）              |
| `SidebarToggle.Desktop`    | PC画面用のトグル（表示切り替え、折りたたみなど用途に応じて拡張）   |

---

## 📦 状態管理の方針

`SidebarProvider` が `open` 状態と `setOpen` / `toggle` を提供し、  
全てのトグルボタン・Sidebar 本体はこの Context を購読して動作します。

このように `Provider` で中央集権的に開閉状態を管理することで、  
モバイル/PC、任意の場所からトグルを制御でき、状態の不整合を防ぎます。

```tsx
// 使用例
const { open, toggle, setOpen } = useSidebar();
```

---

## 🧑‍💻 使用方法（レイアウト統合）

アプリ全体の `layout.tsx` にて以下のように統合します：

```tsx
<SidebarProvider>
  <header>
    <SidebarToggleMobile />
    <SidebarToggleDesktop />
  </header>

  <Sidebar />
  <SidebarMain>
    {children}
  </SidebarMain>
</SidebarProvider>
```

---

## 🔄 今後の拡張余地

* 折りたたみ表示（PCで `w-64` → `w-16`）
* アイコン付きメニュー（`lucide-react` など）
* サイドバーにタグフィルタや検索フォーム
* Next.js の `useSelectedLayoutSegment()` による動的ハイライト

---

## 🛠 技術的ポイント

* `use client` 前提（すべてクライアントコンポーネント）
* TailwindCSS のレスポンシブクラスで `md:` を軸に制御
* モバイルではスライドイン + 背景オーバーレイ

---

## 🧼 命名規則

* `Sidebar` … 外容器・レイアウト
* `SidebarContent` … 内部ナビゲーション要素
* `SidebarToggle.Mobile` / `.Desktop` … トグルはデバイス別に分離
* `SidebarProvider` … 状態管理の単一ソース

---
