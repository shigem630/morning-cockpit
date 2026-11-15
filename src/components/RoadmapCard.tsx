// 改革の地図。学校改革ロードマップの「全体のどこにいるか」を毎朝目に入れるための札。
//
// 中身はコードに書かない。リポジトリが公開なので、学校の計画は Firestore
// （cockpit/main/meta/roadmap。本人のUIDしか読めない）に置き、ここは表示だけする。
// 更新は ~/esthel-discord-bot/roadmap-map.mjs で行う（Claude が中身を作る）。
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { daysBetween, formatShort, type YMD } from '../lib/dates';
import SectionTitle from './SectionTitle';

const ym = (d: YMD) => { const [y, mo] = d.split('-').map(Number); return `${y}年${mo}月`; };

interface Phase { from: YMD; to: YMD; name: string; note?: string }
interface Milestone { date: YMD; label: string; why: string }
interface Pillar { tag: string; name: string; what: string }
interface RoadmapMap {
  goal: string;
  target?: string;
  updated?: YMD;
  phases: Phase[];
  milestones: Milestone[];
  pillars?: Pillar[];
  rules?: string[];
}

function useRoadmap(): RoadmapMap | null {
  const [m, setM] = useState<RoadmapMap | null>(null);
  useEffect(() => onSnapshot(
    doc(db, 'cockpit', 'main', 'meta', 'roadmap'),
    (snap) => setM((snap.data() as RoadmapMap | undefined) ?? null),
    () => setM(null),
  ), []);
  return m;
}

export default function RoadmapCard({ today }: { today: YMD }) {
  const m = useRoadmap();
  if (!m || !Array.isArray(m.phases) || !Array.isArray(m.milestones)) return null;

  const phase = m.phases.find((p) => p.from <= today && today <= p.to) ?? null;
  const next = m.milestones
    .filter((x) => x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const head = next[0] ?? null;
  const after = next.slice(1, 3);
  const left = head ? daysBetween(today, head.date) : null;

  return (
    <div className="card roadmap" style={{ marginBottom: 14 }}>
      <SectionTitle note={m.updated ? `${formatShort(m.updated)} 更新` : undefined}>改革の地図</SectionTitle>
      <p className="rm-goal">{m.goal}{m.target && <span className="sub">　{m.target}</span>}</p>
      <div className="rm-row">
        <div>
          <span className="rm-k">今の段階</span>
          {phase
            ? <><b>{phase.name}</b><span className="sub">（{ym(phase.from)}〜{ym(phase.to)}）</span>
                {phase.note && <span className="sub rm-note">{phase.note}</span>}</>
            : <span className="sub">期間外です。地図を作り直す時期です</span>}
        </div>
        {head && (
          <div>
            <span className="rm-k">次の山場</span>
            <b>{head.label}</b>
            <span className="sub">（{formatShort(head.date)}・{left === 0 ? '今日' : `あと${left}日`}）</span>
            <span className="sub rm-note">何のため：{head.why}</span>
          </div>
        )}
      </div>
      {after.length > 0 && (
        <p className="sub rm-after">
          その次：{after.map((x) => `${formatShort(x.date)} ${x.label}`).join('　／　')}
        </p>
      )}
      <details className="rm-more">
        <summary>全体を見る</summary>
        {m.pillars && m.pillars.length > 0 && (
          <ul className="rm-list">
            {m.pillars.map((p) => <li key={p.tag}><b>{p.tag} {p.name}</b>　<span className="sub">{p.what}</span></li>)}
          </ul>
        )}
        <ul className="rm-list">
          {m.phases.map((p) => (
            <li key={p.from} aria-current={p === phase ? 'step' : undefined}>
              <b>{ym(p.from)}〜{ym(p.to)}</b>　{p.name}
              {p.note && <span className="sub">　{p.note}</span>}
            </li>
          ))}
        </ul>
        {m.rules && m.rules.length > 0 && (
          <ul className="rm-list">
            {m.rules.map((r) => <li key={r} className="sub">{r}</li>)}
          </ul>
        )}
      </details>
    </div>
  );
}
