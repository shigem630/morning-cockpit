import type { ReactNode } from 'react';

/** 見出しの共通部品。名前は短く、説明は小さく添える。 */
export default function SectionTitle({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <p className="sec">
      {children}
      {note && <span className="note">{note}</span>}
    </p>
  );
}
