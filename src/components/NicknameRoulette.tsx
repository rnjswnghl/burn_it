import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Dices, CheckCircle2, Lock, Unlock, Flame } from 'lucide-react';
import { sound } from '../utils/audio';

interface NicknameRouletteProps {
  initialNickname?: string;
  onConfirm: (nickname: string) => void;
  isModal?: boolean;
  onCancelModal?: () => void;
}

export const ADJECTIVES = [
  '불타는', '잿빛의', '타오르는', '칠흑의', '고독한',
  '고요한', '신비로운', '날카로운', '방랑하는', '검붉은',
  '묵묵한', '비장한', '순백의', '맹렬한', '황혼의',
  '잠들지 않는', '붉게 물든', '서늘한', '타버린', '은밀한',
  '거친', '찬란한', '그을린', '어둠의', '불멸의',
  '깊은', '사나운', '새벽의', '자유로운', '망각의'
];

export const NOUNS = [
  '목탄', '성냥', '스케치', '잉걸불', '도화지',
  '화염', '연필', '그림자', '불사조', '방화광',
  '연기', '소각자', '불씨', '흑요석', '화가',
  '기록관', '탐험가', '바람', '흔적', '나비',
  '잿더미', '등불', '늑대', '서약서', '시인',
  '수호자', '영혼', '비밀', '봉인', '심연'
];

export const NUMBERS = [
  '007', '777', '101', '404', '089', '999',
  '333', '012', '505', '808', '256', '707',
  '119', '001', '888', '365', '042', '666',
  '911', '100', '555', '204', '314', '990', '024'
];

export const NicknameRoulette: React.FC<NicknameRouletteProps> = ({
  initialNickname,
  onConfirm,
  isModal = false,
  onCancelModal,
}) => {
  // Parse initial nickname if present: "형용사 명사 숫자"
  const parsedInitial = initialNickname ? initialNickname.split(' ') : [];

  const [adjIndex, setAdjIndex] = useState<number>(() => {
    if (parsedInitial[0]) {
      const idx = ADJECTIVES.indexOf(parsedInitial[0]);
      if (idx !== -1) return idx;
    }
    return Math.floor(Math.random() * ADJECTIVES.length);
  });

  const [nounIndex, setNounIndex] = useState<number>(() => {
    if (parsedInitial[1]) {
      const idx = NOUNS.indexOf(parsedInitial[1]);
      if (idx !== -1) return idx;
    }
    return Math.floor(Math.random() * NOUNS.length);
  });

  const [numIndex, setNumIndex] = useState<number>(() => {
    if (parsedInitial[2]) {
      const idx = NUMBERS.indexOf(parsedInitial[2]);
      if (idx !== -1) return idx;
    }
    return Math.floor(Math.random() * NUMBERS.length);
  });

  // Locked reels
  const [lockAdj, setLockAdj] = useState(false);
  const [lockNoun, setLockNoun] = useState(false);
  const [lockNum, setLockNum] = useState(false);

  // Spinning states: sequentially stops!
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinAdj, setSpinAdj] = useState(false);
  const [spinNoun, setSpinNoun] = useState(false);
  const [spinNum, setSpinNum] = useState(false);

  const [hasEverSpun, setHasEverSpun] = useState(false);
  const [confirmedAnim, setConfirmedAnim] = useState(false);

  const animTimerRef = useRef<number | null>(null);

  // Trigger sequential spin
  const startSequentialSpin = () => {
    if (isSpinning) return;
    sound.playTap();
    setIsSpinning(true);
    setHasEverSpun(true);

    // Start spinning active reels
    if (!lockAdj) setSpinAdj(true);
    if (!lockNoun) setSpinNoun(true);
    if (!lockNum) setSpinNum(true);

    let tickCount = 0;
    const interval = window.setInterval(() => {
      tickCount++;
      sound.playRouletteTick(1 + (tickCount % 4) * 0.1);

      if (!lockAdj && tickCount < 10) {
        setAdjIndex(prev => (prev + 1) % ADJECTIVES.length);
      }
      if (!lockNoun && tickCount < 18) {
        setNounIndex(prev => (prev + 1) % NOUNS.length);
      }
      if (!lockNum && tickCount < 26) {
        setNumIndex(prev => (prev + 1) % NUMBERS.length);
      }
    }, 90);

    // 1. Sequential Stop 1: 형용사 (after 1000ms)
    window.setTimeout(() => {
      setSpinAdj(false);
      sound.playRouletteStop();
      // Select final random item
      if (!lockAdj) {
        setAdjIndex(Math.floor(Math.random() * ADJECTIVES.length));
      }
    }, 1000);

    // 2. Sequential Stop 2: 명사 (after 1800ms)
    window.setTimeout(() => {
      setSpinNoun(false);
      sound.playRouletteStop();
      if (!lockNoun) {
        setNounIndex(Math.floor(Math.random() * NOUNS.length));
      }
    }, 1800);

    // 3. Sequential Stop 3: 숫자 (after 2600ms)
    window.setTimeout(() => {
      setSpinNum(false);
      sound.playRouletteStop();
      if (!lockNum) {
        setNumIndex(Math.floor(Math.random() * NUMBERS.length));
      }
      clearInterval(interval);
      setIsSpinning(false);
      sound.playWin();
    }, 2600);
  };

  // Auto-spin on very first visit if user hasn't spun yet
  useEffect(() => {
    if (!initialNickname && !hasEverSpun) {
      const timer = window.setTimeout(() => {
        startSequentialSpin();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentNickname = `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]} ${NUMBERS[numIndex]}`;

  const handleConfirm = () => {
    if (isSpinning) return;
    sound.playMatchStrike();
    setConfirmedAnim(true);

    try {
      localStorage.setItem('bw_confirmed_nickname', currentNickname);
    } catch {
      // ignore
    }

    window.setTimeout(() => {
      onConfirm(currentNickname);
    }, 600);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center p-2.5 sm:p-6 bg-[#0c0a09] text-stone-200 overflow-y-auto select-none">
      {/* Background ambient charcoal embers */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/30 via-stone-950/70 to-black" />

      {/* Main Parchment Slot Machine Frame */}
      <div className="relative w-full max-w-2xl bg-[#1c1917] border-2 border-[#44403c] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center z-10 my-auto">
        {/* Top Brass / Charcoal Header */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2 w-full min-w-0">
          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 animate-pulse shrink-0" />
          <span className="text-[10px] sm:text-xs font-serif tracking-[0.12em] sm:tracking-[0.25em] text-amber-500/90 uppercase font-bold whitespace-nowrap">
            Pencil & Charcoal Studio
          </span>
          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 animate-pulse shrink-0" />
        </div>

        <h2 className="text-xl sm:text-3xl leading-tight font-serif font-black tracking-tight text-[#f5f5f4] text-center text-balance break-keep mb-1">
          소각자 닉네임 슬롯 룰렛
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-stone-400 text-center text-pretty break-keep font-serif mb-5 sm:mb-6 max-w-md">
          흑백 스케치북과 목탄의 세계에 오신 것을 환영합니다.
          <br />
          <span className="text-amber-400/90 font-medium">
            형용사 · 명사 · 숫자
          </span>
          가 순차적으로 회전하여 당신만의 고유한 칭호를 완성합니다.
        </p>

        {/* The 3-Reel Mechanical Slot Display */}
        <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-4 p-2 sm:p-4 bg-[#0c0a09] border-2 border-[#292524] rounded-2xl shadow-inner mb-5 sm:mb-6 relative">
          {/* Glass glare effect */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-black/30" />

          {/* Reel 1: 형용사 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between gap-0.5 w-full px-0.5 sm:px-1 mb-1.5 min-w-0">
              <span className="text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-serif font-bold text-amber-400 tracking-normal sm:tracking-wider whitespace-nowrap">
                1. 형용사
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setLockAdj(!lockAdj);
                }}
                disabled={isSpinning}
                title={lockAdj ? '고정 해제' : '슬롯 고정'}
                className={`p-0.5 sm:p-1 rounded text-[10px] transition-colors shrink-0 ${
                  lockAdj
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {lockAdj ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>

            <div className="w-full h-28 sm:h-32 bg-[#f5efe6] border-2 border-[#57534e] rounded-xl flex flex-col items-center justify-center p-2 shadow-inner overflow-hidden relative">
              {/* Paper grain */}
              <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:8px_8px] opacity-15 pointer-events-none" />

              {/* Slot content */}
              <div
                className={`flex flex-col items-center justify-center transition-all duration-100 ${
                  spinAdj ? 'blur-[1px] -translate-y-2 opacity-75' : 'translate-y-0 opacity-100'
                }`}
              >
                <span className="text-[11px] text-stone-500 font-serif mb-0.5">Adjective</span>
                <span className="text-lg sm:text-xl md:text-2xl font-serif font-black text-[#1c1917] tracking-tight text-center">
                  {ADJECTIVES[adjIndex]}
                </span>
                {spinAdj && (
                  <span className="text-[10px] text-amber-700 animate-pulse mt-0.5 font-mono">
                    회전 중...
                  </span>
                )}
              </div>

              {/* Slot window borders */}
              <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-stone-900/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-stone-900/40 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Reel 2: 명사 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between gap-0.5 w-full px-0.5 sm:px-1 mb-1.5 min-w-0">
              <span className="text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-serif font-bold text-amber-400 tracking-normal sm:tracking-wider whitespace-nowrap">
                2. 명사
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setLockNoun(!lockNoun);
                }}
                disabled={isSpinning}
                title={lockNoun ? '고정 해제' : '슬롯 고정'}
                className={`p-0.5 sm:p-1 rounded text-[10px] transition-colors shrink-0 ${
                  lockNoun
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {lockNoun ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>

            <div className="w-full h-28 sm:h-32 bg-[#f5efe6] border-2 border-[#57534e] rounded-xl flex flex-col items-center justify-center p-2 shadow-inner overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:8px_8px] opacity-15 pointer-events-none" />

              <div
                className={`flex flex-col items-center justify-center transition-all duration-100 ${
                  spinNoun ? 'blur-[1px] -translate-y-2 opacity-75' : 'translate-y-0 opacity-100'
                }`}
              >
                <span className="text-[11px] text-stone-500 font-serif mb-0.5">Noun</span>
                <span className="text-lg sm:text-xl md:text-2xl font-serif font-black text-[#1c1917] tracking-tight text-center">
                  {NOUNS[nounIndex]}
                </span>
                {spinNoun && (
                  <span className="text-[10px] text-amber-700 animate-pulse mt-0.5 font-mono">
                    회전 중...
                  </span>
                )}
              </div>

              <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-stone-900/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-stone-900/40 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Reel 3: 숫자 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between gap-0.5 w-full px-0.5 sm:px-1 mb-1.5 min-w-0">
              <span className="text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-serif font-bold text-amber-400 tracking-normal sm:tracking-wider whitespace-nowrap">
                3. 숫자
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setLockNum(!lockNum);
                }}
                disabled={isSpinning}
                title={lockNum ? '고정 해제' : '슬롯 고정'}
                className={`p-0.5 sm:p-1 rounded text-[10px] transition-colors shrink-0 ${
                  lockNum
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {lockNum ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>

            <div className="w-full h-28 sm:h-32 bg-[#f5efe6] border-2 border-[#57534e] rounded-xl flex flex-col items-center justify-center p-2 shadow-inner overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:8px_8px] opacity-15 pointer-events-none" />

              <div
                className={`flex flex-col items-center justify-center transition-all duration-100 ${
                  spinNum ? 'blur-[1px] -translate-y-2 opacity-75' : 'translate-y-0 opacity-100'
                }`}
              >
                <span className="text-[11px] text-stone-500 font-serif mb-0.5">Number</span>
                <span className="text-lg sm:text-xl md:text-2xl font-mono font-black text-[#1c1917] tracking-wider text-center">
                  #{NUMBERS[numIndex]}
                </span>
                {spinNum && (
                  <span className="text-[10px] text-amber-700 animate-pulse mt-0.5 font-mono">
                    회전 중...
                  </span>
                )}
              </div>

              <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-stone-900/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-stone-900/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Result Banner */}
        <div className="w-full p-4 bg-[#292524] border border-[#57534e] rounded-2xl flex flex-col items-center justify-center mb-6 shadow-md relative overflow-hidden">
          <div className="text-[11px] font-serif text-stone-400 mb-1 tracking-wider uppercase">
            완성된 칭호 미리보기
          </div>
          <div className="text-lg sm:text-2xl leading-tight font-serif font-black text-amber-300 tracking-wide text-center flex items-center justify-center gap-1.5 sm:gap-2 w-full min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="break-keep text-balance">{currentNickname}</span>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          </div>

          {confirmedAnim && (
            <div className="absolute inset-0 bg-amber-500/90 text-stone-950 font-black text-lg sm:text-xl font-serif flex items-center justify-center animate-bounce z-20">
              ✓ 닉네임 확정 완료! 스튜디오 진입 중...
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          {/* Spin Button */}
          <button
            id="btn-spin-roulette"
            type="button"
            onClick={startSequentialSpin}
            disabled={isSpinning}
            className={`flex-1 py-3.5 px-5 rounded-xl font-serif font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
              isSpinning
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600 hover:border-amber-400 active:scale-95'
            }`}
          >
            <Dices className={`w-4 h-4 text-amber-400 ${isSpinning ? 'animate-spin' : ''}`} />
            <span className="break-keep text-center leading-tight">
              {isSpinning ? '슬롯 순차 정지 중...' : '다시 룰렛 돌리기'}
              {!isSpinning && <span className="hidden min-[400px]:inline"> (Re-roll)</span>}
            </span>
          </button>

          {/* Confirm Button */}
          <button
            id="btn-confirm-nickname"
            type="button"
            onClick={handleConfirm}
            disabled={isSpinning}
            className={`flex-1 py-3.5 px-5 rounded-xl font-serif font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl ${
              isSpinning
                ? 'bg-amber-900/40 text-amber-600/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-stone-950" />
            <span className="break-keep text-center leading-tight">이름 확정 후 게임 진입</span>
          </button>
        </div>

        {/* Modal Cancel if user is just changing name */}
        {isModal && onCancelModal && (
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onCancelModal();
            }}
            disabled={isSpinning}
            className="mt-3 text-xs text-stone-400 hover:text-stone-200 underline font-serif"
          >
            취소하고 현재 이름 유지하기
          </button>
        )}

        <div className="mt-4 text-[11px] text-stone-500 font-serif text-center">
          * 이름 확정 후에만 게임에 진입할 수 있으며, 상단 프로필에서 언제든 재추첨할 수 있습니다.
        </div>
      </div>
    </div>
  );
};
