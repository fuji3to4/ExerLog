# ExerLog

シンプルなエクササイズログ PWA。毎日の体調記録とトレーニング結果を手軽に残せます。

**[→ アプリを開く](https://fuji3to4.github.io/ExerLog/)**

---

## 機能

- **今日の記録** — 体調（気分・メモ）を保存し、おすすめエクササイズをワンタップで記録
- **ライブラリ** — エクササイズ一覧を検索・フィルタリング、動画リンクと詳細確認
- **履歴** — カレンダーから日を選んで過去の記録を閲覧・編集・削除
- **設定 / データ管理**
  - エクササイズのカスタム追加・編集・削除
  - エクササイズ一覧・ログ・体調記録を CSV でエクスポート
  - CSV からエクササイズをインポート
  - 全エクササイズ / 全ログの一括削除（二段階確認つき）
- **PWA** — ホーム画面に追加してオフラインでも動作
- **日英対応** — 設定から言語切り替え（日本語 / English）

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 15 (App Router, static export) |
| UI | React 19 |
| ストレージ | IndexedDB (Dexie.js) |
| PWA | next-pwa |
| テスト | Vitest + Testing Library |
| デプロイ | GitHub Pages (GitHub Actions) |

## ローカル起動

```bash
npm install
npm run dev
```

`http://localhost:3000` で起動します。

## ビルド

```bash
npm run build   # out/ に静的ファイルを出力
npm run test    # テスト実行
```

## データについて

すべてのデータはブラウザの IndexedDB にローカル保存されます。サーバーへの送信は一切行いません。

## ライセンス

[MIT](LICENSE)
