import { Component, type ErrorInfo, type ReactNode } from 'react';

// このプロジェクトが存在する理由は「黙って壊れて気づけなかった」ことなので、
// 落ちたときに真っ白（真っ黒）にせず、何が起きたかを画面に出す。
interface State { error: Error | null; stack: string }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, stack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ stack: info.componentStack ?? '' });
    console.error('[morning-cockpit] 画面が落ちました', error, info);
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="wrap" style={{ paddingTop: 32 }}>
        <div className="banner" style={{ display: 'block' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 500 }}>画面が落ちました。</p>
          <p className="sub" style={{ margin: 0, color: 'inherit' }}>
            下の文をそのままコピーして送ってください。保存済みのデータは無事です。
          </p>
        </div>
        <div className="card">
          <p className="sec">エラー</p>
          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0,
            fontSize: 13, lineHeight: 1.7,
          }}>
{error.name}: {error.message}
{'\n'}{error.stack ?? ''}
{stack ? `\n--- どの部品か ---${stack}` : ''}
          </pre>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="primary" onClick={() => location.reload()}>読み直す</button>
            <button onClick={() => {
              navigator.clipboard.writeText(
                `${error.name}: ${error.message}\n${error.stack ?? ''}\n${stack}`,
              ).then(() => alert('コピーしました'), () => alert('上の文を選んでコピーしてください'));
            }}>エラーをコピー</button>
          </div>
        </div>
      </div>
    );
  }
}
