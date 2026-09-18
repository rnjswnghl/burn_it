import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { Header } from './components/Header';
import { NicknameRoulette } from './components/NicknameRoulette';
import { PaperBurner } from './components/PaperBurner';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#0c0a09] text-stone-200 p-6 text-center font-serif">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mb-4 text-2xl font-bold border border-rose-800">
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-2">화면을 표시하는 중 문제가 발생했습니다</h2>
          <p className="text-sm text-stone-400 max-w-md mb-6">
            {this.state.error?.message || '일시적인 오류가 발생했습니다. 아래 버튼을 눌러 다시 로드해 보세요.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-colors shadow-lg"
          >
            스튜디오 다시 시작
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Check if user already confirmed a nickname
  const [confirmedNickname, setConfirmedNickname] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bw_confirmed_nickname');
    } catch {
      return null;
    }
  });

  // Modal toggle for re-rolling nickname from inside the game
  const [showRouletteModal, setShowRouletteModal] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const handleConfirmNickname = (newNickname: string) => {
    try {
      localStorage.setItem('bw_confirmed_nickname', newNickname);
    } catch {
      // ignore
    }
    setConfirmedNickname(newNickname);
    setShowRouletteModal(false);
  };

  return (
    <ErrorBoundary>
      <div
        ref={scrollRootRef}
        onScroll={event => setShowBackToTop(event.currentTarget.scrollTop > 320)}
        className="ui-scrollbar flex flex-col w-full h-dvh min-h-dvh bg-[#0c0a09] text-stone-200 overflow-x-hidden overflow-y-auto md:h-full md:min-h-screen md:overflow-hidden font-sans"
      >
        {/* If no nickname is confirmed yet (first visit), start strictly with Nickname Slot Roulette */}
        {!confirmedNickname ? (
          <NicknameRoulette onConfirm={handleConfirmNickname} />
        ) : (
          <>
            <Header
              nickname={confirmedNickname}
              onOpenRoulette={() => setShowRouletteModal(true)}
            />

            <main className="flex-1 w-full min-h-0 overflow-visible md:overflow-hidden relative flex flex-col">
              <PaperBurner
                nickname={confirmedNickname}
                onOpenRoulette={() => setShowRouletteModal(true)}
              />
            </main>

            {/* In-game Roulette Modal if user wants to change nickname */}
            {showRouletteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="w-full max-w-2xl my-auto">
                  <NicknameRoulette
                    initialNickname={confirmedNickname}
                    onConfirm={handleConfirmNickname}
                    isModal={true}
                    onCancelModal={() => setShowRouletteModal(false)}
                  />
                </div>
              </div>
            )}

            {showBackToTop && (
              <button
                type="button"
                onClick={() => scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="md:hidden fixed right-4 bottom-4 z-40 w-11 h-11 rounded-full border border-amber-500/50 bg-stone-950/95 text-amber-400 shadow-xl shadow-black/50 flex items-center justify-center"
                aria-label="페이지 맨 위로 이동"
                title="맨 위로"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
