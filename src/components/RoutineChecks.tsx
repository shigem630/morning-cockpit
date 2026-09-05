import type { Routine } from '../data/routines';
import type { DayLog } from '../types';

interface Props {
  eligible: Routine[];
  log: DayLog;
  /** 暦のうえで勤務日か（土日祝でないか） */
  calendarSaysWork: boolean;
  /** 実際に今日を出勤として扱っているか */
  working: boolean;
  onToggle: (id: string, on: boolean) => void;
  onSetWorking: (v: boolean) => void;
}

export default function RoutineChecks(p: Props) {
  const daily = p.eligible.filter((r) => r.cadence === 'daily');
  const weekly = p.eligible.filter((r) => r.cadence === 'weekly');
  const monthly = p.eligible.filter((r) => r.cadence.startsWith('monthly'));

  if (!p.working) {
    return (
      <div className="card">
        <p className="sec">今日のルーティンワーク</p>
        <p className="empty">
          {p.calendarSaysWork
            ? '今日は休みとして記録しました。'
            : '今日は勤務日ではありません。チェックはお休みです。'}
        </p>
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button onClick={() => p.onSetWorking(true)}>今日は出勤</button>
        </div>
      </div>
    );
  }

  const row = (r: Routine, num: number | null) => {
    const on = p.log.checked.includes(r.id);
    return (
      <label className={`chk${on ? ' on' : ''}`} key={r.id}>
        <input type="checkbox" checked={on}
          onChange={(e) => p.onToggle(r.id, e.target.checked)} />
        <span>{r.label}</span>
        {num !== null && (
          <span className="sub" style={{ marginLeft: 'auto', opacity: .5 }}>{num}</span>
        )}
      </label>
    );
  };

  return (
    <div className="card">
      <div className="rowbar">
        <p className="sec">今日のルーティンワーク</p>
        <button onClick={() => p.onSetWorking(false)}>今日は休み</button>
      </div>
      {daily.map((r, i) => row(r, i + 1))}
      {weekly.length > 0 && <p className="divider">今週</p>}
      {weekly.map((r) => row(r, null))}
      {monthly.length > 0 && <p className="divider">今月</p>}
      {monthly.map((r) => row(r, null))}
    </div>
  );
}
