import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen grid place-items-center bg-slate-950 px-5 text-white">
          <section className="w-full max-w-xl rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold">เปิดแอปไม่สำเร็จ</h1>
            <p className="mt-2 text-sm text-slate-300">
              แอปพบข้อผิดพลาดขณะเปิดหน้า กรุณาคัดลอกข้อความด้านล่างเพื่อใช้ตรวจสอบ
            </p>
            <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-red-200">
              {this.state.error.message}
            </pre>
            <button
              className="mt-4 rounded-xl bg-white px-4 py-2 font-medium text-slate-950"
              onClick={() => window.location.reload()}
              type="button"
            >
              โหลดหน้าใหม่
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
