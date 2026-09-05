import { formatLong, holidayName, type YMD } from '../lib/dates';

export type Theme = 'auto' | 'light' | 'dark';

interface Props {
  today: YMD;
  theme: Theme;
  onTheme: (t: Theme) => void;
  masked: boolean;
  onMask: () => void;
  userName: string;
  onLogout: () => void;
}

export default function TopBar(p: Props) {
  const hol = holidayName(p.today);
  return (
    <div className="top">
      <div className="date">
        {formatLong(p.today)}
        {hol && <span className="sub" style={{ marginLeft: 4 }}>{hol}</span>}
      </div>
      <div className="right">
        <button onClick={p.onMask} aria-pressed={p.masked}>
          {p.masked ? '表示する' : '伏せる'}
        </button>
        <span className="seg">
          {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} aria-pressed={p.theme === t} onClick={() => p.onTheme(t)}>
              {t === 'auto' ? '自動' : t === 'light' ? '明' : '暗'}
            </button>
          ))}
        </span>
        <span>{p.userName}</span>
        <button onClick={p.onLogout}>出る</button>
        <span className="build">build {__BUILD_TIME__}</span>
      </div>
    </div>
  );
}
