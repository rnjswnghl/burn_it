import React, { useState } from 'react';
import { Flame, Volume2, VolumeX, Sparkles, HelpCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  nickname: string;
  onOpenRoulette: () => void;
}

export const Header: React.FC<HeaderProps> = ({ nickname, onOpenRoulette }) => {
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted);
  const [showGlobalHelp, setShowGlobalHelp] = useState<boolean>(false);

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) sound.playTap();
  };

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-[#1c1917] border-b border-[#292524] shrink-0 z-20">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-stone-900 border border-amber-500/40 flex items-center justify-center shadow-md shadow-amber-500/20">
          <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
        </div>
        <div>
          <h1 className="text-sm font-black font-serif tracking-tight text-white flex items-center gap-2">
            흑백 불태우기 게임
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              CHARCOAL & PAPER
            </span>
          </h1>
        </div>
      </div>

      {/* Confirmed Player Nickname Badge */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onOpenRoulette();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#292524] border border-[#44403c] hover:border-amber-500/60 transition-all text-xs font-serif shadow-sm active:scale-95"
          title="닉네임 슬롯 룰렛 열기"
        >
          <span className="text-stone-400 text-[11px]">소각자:</span>
          <span className="font-bold text-amber-300 tracking-wide">{nickname}</span>
          <Sparkles className="w-3 h-3 text-amber-400" />
        </button>

        {/* Sound Toggle */}
        <button
          id="btn-sound-toggle"
          onClick={toggleMute}
          className={`p-1.5 rounded-lg border transition-colors ${
            isMuted
              ? 'bg-stone-900 border-stone-800 text-stone-500'
              : 'bg-stone-900 border-stone-700 text-amber-400'
          }`}
          title={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
