import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base はリポジトリ名と大文字小文字まで完全一致させること。
// 不一致だとアセットが404し、エラーも出ずに真っ白になる。
export default defineConfig({
  base: '/morning-cockpit/',
  // GitHub Pages は main ブランチの /docs を配信する。
  // ここに組み立て済みのものを置き、リポジトリの中身＝公開中の中身、という状態を保つ。
  build: { outDir: 'docs', emptyOutDir: true },
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify(
      new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date())
    ),
  },
});
