import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, clearCalendarToken, getCalendarToken, login, logout } from './firebase';
import {
  addDays, detectClockSkew, isBusinessDay, logicalToday, type YMD,
} from './lib/dates';
import { eligibleRoutines, last30Days } from './lib/eligible';
import { isManualOrder, isOpen, sortTasks } from './lib/priority';
import {
  addStalled, addTask, clearFocus, clearTaskOrder, nudge, reopenStalled, reorderTasks,
  resolveStalled, restoreTask, setFocus, setWorked, toggleCheck, unnudge, updateTask,
  useDayLog, useRecentLogs, useStalled, useTasks, useYesterdayLog,
} from './lib/store';
import {
  CalendarApiError, fetchTodayEvents, NoTokenError, readCalendarCache, saveCalendarCache,
} from './lib/calendar';
import { buildBackup, downloadJson } from './lib/export';
import { INITIAL_TASKS } from './data/initialTasks';
import type { Stalled, WhenTag } from './types';
import SectionTitle from './components/SectionTitle';
import TopBar, { type Theme } from './components/TopBar';
import { ClockSkewBanner, HolidayTableBanner, SyncBanner } from './components/Banners';
import FocusCard from './components/FocusCard';
import StalledList from './components/StalledList';
import RoutineChecks from './components/RoutineChecks';
import TodaySchedule, { type CalState } from './components/TodaySchedule';
import TaskList, { SoonCard } from './components/TaskList';

const nowHHMM = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  if (user === undefined) return <div className="wrap"><p className="empty">読み込んでいます…</p></div>;
  if (!user) {
    return (
      <div className="wrap gate">
        <h1>朝の司令塔</h1>
        <p className="sub">重村先生専用。Googleでログインしてください。</p>
        <div style={{ marginTop: 24 }}>
          <button className="primary" onClick={() => login().catch((e) => setAuthError(e.code || e.message))}>
            Googleでログイン
          </button>
        </div>
        {authError && (
          <div className="card" style={{ marginTop: 24 }}>
            <p style={{ color: 'var(--alert)', margin: 0 }}>ログインできませんでした</p>
            <p className="sub" style={{ marginTop: 8 }}>
              <code>{authError}</code><br />
              この画面をそのまま撮って送ってください。
            </p>
          </div>
        )}
      </div>
    );
  }
  return <Cockpit user={user} />;
}

function Cockpit({ user }: { user: User }) {
  /* ───── 日付。1分ごとに監視し、またいだら読み直す ───── */
  const [today, setToday] = useState<YMD>(() => logicalToday());
  useEffect(() => {
    const check = () => {
      const t = logicalToday();
      if (t !== today) location.reload();
    };
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check); };
  }, [today]);
  useEffect(() => { setToday(logicalToday()); }, []);

  /* ───── 見た目の設定 ───── */
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('mc.theme') as Theme) || 'auto',
  );
  useEffect(() => {
    localStorage.setItem('mc.theme', theme);
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const [masked, setMasked] = useState(() => localStorage.getItem('mc.masked') === '1');
  useEffect(() => { localStorage.setItem('mc.masked', masked ? '1' : '0'); }, [masked]);

  /* ───── 時計ずれ ───── */
  const [skew, setSkew] = useState<number | null>(null);
  useEffect(() => { detectClockSkew().then(setSkew); }, []);

  /* ───── データ ───── */
  const [tasks, tasksSync] = useTasks();
  const [stalled, stalledSync] = useStalled();
  const [log, logSync] = useDayLog(today);
  const recent = useRecentLogs(useMemo(() => last30Days(today), [today]));

  const openTasks = useMemo(
    () => sortTasks(tasks.filter(isOpen), today), [tasks, today],
  );
  const closedTasks = useMemo(
    () => tasks.filter((t) => !isOpen(t))
      .sort((a, b) => (b.doneAt ?? b.deletedAt ?? '').localeCompare(a.doneAt ?? a.deletedAt ?? '')),
    [tasks],
  );
  const calendarSaysWork = isBusinessDay(today);
  const working = log.worked ?? calendarSaysWork;
  const eligible = useMemo(() => eligibleRoutines(today, working), [today, working]);

  /* ───── 今日の最優先 ───── */
  const [skip, setSkip] = useState(0);
  // 全件から引く。openTasks から引くと「終わった」を押した瞬間に一覧から外れ、
  // カードが黙って次の候補に入れ替わってしまう（何を閉じたのか分からなくなる）。
  const chosen = tasks.find((t) => t.id === log.focusTaskId) ?? null;

  // 昨日「手はつけた」で終わった仕事は、今朝いちばんの候補にする。
  // 手をつけたものを翌日に忘れるのが、いちばんもったいない。
  const yLog = useYesterdayLog(addDays(today, -1));
  const carriedOver = useMemo(() => {
    if (yLog?.focusResult !== 'started' || !yLog.focusTaskId) return null;
    return openTasks.find((t) => t.id === yLog.focusTaskId) ?? null;
  }, [yLog, openTasks]);

  // 候補の並び。積み残しがあれば先頭に置き、「別のにする」で普通の順に移る。
  const candidates = useMemo(() => {
    if (!carriedOver) return openTasks;
    return [carriedOver, ...openTasks.filter((t) => t.id !== carriedOver.id)];
  }, [carriedOver, openTasks]);
  const candidate = candidates.length ? candidates[skip % candidates.length] : null;

  const streak = useMemo(() => {
    const days = last30Days(today);
    const hit = days.filter((d) => (recent[d]?.checked?.length ?? 0) > 0).length;
    return { hit, of: days.length };
  }, [recent, today]);

  const soon = useMemo(
    () => openTasks.find((t) => t.important && !t.dueDate) ?? null, [openTasks],
  );

  /* ───── カレンダー ───── */
  const [cal, setCal] = useState<CalState>({ kind: 'idle' });
  const loadCalendar = useCallback(async () => {
    // ポップアップは「押された直後」でないとブラウザに塞がれる。
    // 通信を1回でも挟んでから login() を呼ぶと、無言でブロックされる。
    // そのため、トークンの有無だけを同期的に見て、無ければ先にログインする。
    try {
      if (!getCalendarToken()) await login();
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setCal({ kind: 'idle' });
      } else if (err.code === 'auth/popup-blocked') {
        setCal({
          kind: 'error',
          message: 'ポップアップがブロックされました。アドレス欄の右端のアイコンから許可してください。',
          at: new Date(),
        });
      } else {
        setCal({ kind: 'error', message: err.code ?? String(e), at: new Date() });
      }
      return;
    }

    setCal({ kind: 'loading' });
    try {
      const events = await fetchTodayEvents(today);
      saveCalendarCache(today, events);
      setCal({ kind: 'ok', events, at: new Date(), live: true });
    } catch (e) {
      if (e instanceof NoTokenError) {
        // 手元のトークンが古い。捨てておけば、次に押したときログインからやり直せる。
        clearCalendarToken();
        setCal({ kind: 'notoken' });
      } else if (e instanceof CalendarApiError) {
        setCal({
          kind: 'error',
          message: `HTTP ${e.status}${e.reason ? ` / ${e.reason}` : ''}　${e.detail}`,
          advice: e.advice,
          at: new Date(),
        });
      } else {
        setCal({ kind: 'error', message: (e as Error).message, at: new Date() });
      }
    }
  }, [today]);

  /* ───── 開いた時点で、押さなくても予定を出す ─────
     ①手元に残っている今日のぶんをすぐ出す（更新のたびに空になるのをやめる）
     ②読む許可が生きていれば、黙って取り直して差し替える
     許可が切れているときに、こちらからログイン窓を開くことはしない。
     押していないのに窓が出るのは、本人にとって「壊れた」に見える。 */
  useEffect(() => {
    const cached = readCalendarCache(today);
    if (cached) {
      setCal({ kind: 'ok', events: cached.events, at: new Date(cached.at), live: false });
    }
    if (!getCalendarToken()) return;

    let alive = true;
    fetchTodayEvents(today)
      .then((events) => {
        if (!alive) return;
        saveCalendarCache(today, events);
        setCal({ kind: 'ok', events, at: new Date(), live: true });
      })
      .catch((e) => {
        // 手元に写しがあるなら、それを出したまま黙る（「◯時点の写し」と出ている）。
        // 何も無いときだけ、理由を画面に出す。握りつぶさない。
        if (!alive || cached) return;
        if (e instanceof NoTokenError) { clearCalendarToken(); setCal({ kind: 'notoken' }); }
        else if (e instanceof CalendarApiError) {
          setCal({ kind: 'error', message: `HTTP ${e.status}`, advice: e.advice, at: new Date() });
        }
      });
    return () => { alive = false; };
  }, [today]);

  /* ───── キーボード ───── */
  const [help, setHelp] = useState(false);
  const eligibleRef = useRef(eligible);
  eligibleRef.current = eligible;
  const logRef = useRef(log);
  logRef.current = log;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') { setHelp((v) => !v); return; }
      if (e.key === 'Enter' && logRef.current.focusTaskId) {
        setFocus(today, { focusResult: 'done' });
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        const daily = eligibleRef.current.filter((r) => r.cadence === 'daily');
        const r = daily[n - 1];
        if (r) {
          const on = !logRef.current.checked.includes(r.id);
          toggleCheck(today, r.id, on, eligibleRef.current.map((x) => x.id));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [today]);

  /* ───── 拾われなかった失敗を必ず画面に出す ───── */
  const [crash, setCrash] = useState<string | null>(null);
  useEffect(() => {
    const onRej = (e: PromiseRejectionEvent) => {
      const r = e.reason as { code?: string; message?: string } | undefined;
      setCrash(`${r?.code ?? ''} ${r?.message ?? String(e.reason)}`.trim());
    };
    window.addEventListener('unhandledrejection', onRej);
    return () => window.removeEventListener('unhandledrejection', onRej);
  }, []);

  /* ───── 書き出し（バックアップ） ───── */
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    setExporting(true);
    try {
      const data = await buildBackup(today);
      downloadJson(data, `morning-cockpit-${today}.json`);
    } catch (e) {
      const r = e as { code?: string; message?: string };
      setCrash(`書き出しに失敗しました： ${r.code ?? ''} ${r.message ?? String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  /* ───── やることの並び替え ───── */
  const manual = useMemo(() => isManualOrder(openTasks), [openTasks]);

  // 見えている順そのままに帯と番号を振り直す。差分だけ書くと、自動順から手動順へ
  // 移った最初の1回で、触っていないものの順番が決まらない。
  const applyOrder = (items: { id: string; first: boolean }[]) => { reorderTasks(items); };

  const backToAuto = () => {
    const ids = tasks.filter((t) => typeof t.order === 'number').map((t) => t.id);
    if (ids.length) clearTaskOrder(ids);
  };

  // 手で並べている間に足したものは、いちばん上に出す。
  // 下に付けると、長い一覧の末尾に埋もれて、足したことごと忘れる。
  const nextTopOrder = () => {
    if (!manual) return undefined;
    const os = openTasks.map((t) => t.order).filter((o): o is number => typeof o === 'number');
    return (os.length ? Math.min(...os) : 1) - 1;
  };

  /* ───── 操作 ───── */
  const eligibleIds = eligible.map((r) => r.id);

  // すでに入っている題名は飛ばす。何度押しても増えないので、途中で失敗しても押し直せる。
  const missingSeeds = INITIAL_TASKS.filter(
    (s) => !tasks.some((t) => t.title === s.title),
  );
  const [importing, setImporting] = useState(false);
  const importSeed = async () => {
    setImporting(true);
    try {
      for (const s of missingSeeds) {
        await addTask({
          title: s.title, important: s.important, dueDate: s.dueDate, createdAt: today,
        });
      }
    } catch (e) {
      const r = e as { code?: string; message?: string };
      setCrash(`取り込みに失敗しました： ${r.code ?? ''} ${r.message ?? String(e)}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="toonarrow">
        <strong>この画面はパソコン用です。</strong><br />
        スマホからは、Discordのエステルに聞いてください。
      </div>

      <div className="wrap desktop-only">
        <TopBar
          today={today} theme={theme} onTheme={setTheme}
          masked={masked} onMask={() => setMasked((v) => !v)}
          userName={user.displayName ?? user.email ?? ''}
          onLogout={() => logout()}
          onExport={doExport} exporting={exporting}
        />

        <SyncBanner syncs={[tasksSync, stalledSync, logSync]} onRetry={() => location.reload()} />

        {crash && (
          <div className="banner">
            <div>
              うまくいかなかった操作があります。<br />
              <code>{crash}</code>
            </div>
            <button onClick={() => setCrash(null)}>閉じる</button>
          </div>
        )}
        <ClockSkewBanner skewMs={skew} />
        <HolidayTableBanner today={today} />

        {help && (
          <div className="card" style={{ marginBottom: 14 }}>
            <SectionTitle>キー操作</SectionTitle>
            <p className="sub" style={{ margin: 0 }}>
              1〜5：ルーティンワークを入れる／外す　　Enter：今日の最優先を「終わった」にする　　? ：この一覧
            </p>
          </div>
        )}

        {missingSeeds.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <SectionTitle>はじめに</SectionTitle>
            <p style={{ margin: '0 0 12px' }}>
              やることリストの{missingSeeds.length}件が、まだ入っていません。
              <span className="sub">（元のファイルは消しません。すでに入っているものは飛ばします）</span>
            </p>
            <button className="primary" disabled={importing} onClick={importSeed}>
              {importing ? '取り込んでいます…' : `${missingSeeds.length}件を取り込む`}
            </button>
          </div>
        )}

        {tasks.length === 0 ? null : (
          <FocusCard
            today={today} candidate={candidate} chosen={chosen} log={log}
            hasAnyTask={openTasks.length > 0} streak={streak} carriedOver={carriedOver}
            onChoose={(id) => setFocus(today, { focusTaskId: id, focusResult: null })}
            onSkip={() => setSkip((s) => s + 1)}
            onReselect={() => clearFocus(today)}
            onResult={(r) => {
              setFocus(today, { focusResult: r, focusClosed: true });
              if (r === 'done' && chosen) updateTask(chosen.id, { doneAt: today });
            }}
            onWhen={(w: WhenTag) => setFocus(today, { focusWhen: w })}
            onCreateFirst={async (title) => {
              const id = await addTask({ title, important: true, createdAt: today });
              setFocus(today, { focusTaskId: id, focusResult: null });
            }}
          />
        )}

        <div className="cols">
          <StalledList
            today={today} rows={stalled} masked={masked}
            onNudge={(id) => nudge(id, today)}
            onUnnudge={(id) => unnudge(id, today)}
            onReopen={(id) => reopenStalled(id)}
            onResolve={(id, outcome: Stalled['outcome']) => resolveStalled(id, today, outcome)}
            onAdd={(who, what) =>
              addStalled({ who, what, requestedAt: today, nudges: [] })}
          />
          <RoutineChecks
            eligible={eligible} log={log}
            calendarSaysWork={calendarSaysWork} working={working}
            onToggle={(id, on) => toggleCheck(today, id, on, eligibleIds)}
            onSetWorking={(v) => setWorked(today, v)}
          />
          <TodaySchedule
            state={cal} nowHHMM={nowHHMM()} when={log.focusWhen ?? null}
            onLoad={loadCalendar}
          />
        </div>

        {tasks.length > 0 && (
          <div className="stack">
            <SoonCard today={today} task={soon} />
            <TaskList
              today={today} tasks={openTasks} closed={closedTasks}
              manual={manual} onReorder={applyOrder} onAuto={backToAuto}
              onAdd={(title, important, dueDate) =>
                addTask({
                  title, important, dueDate, createdAt: today, order: nextTopOrder(),
                })}
              onDone={(id) => updateTask(id, { doneAt: today })}
              onDelete={(id) => updateTask(id, { deletedAt: today })}
              onRestore={(id) => restoreTask(id)}
            />
          </div>
        )}
      </div>
    </>
  );
}
