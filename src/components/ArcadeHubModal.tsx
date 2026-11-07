import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Sparkles, RefreshCw, Trophy } from 'lucide-react';
import { DramaItem } from '../types/drama';

interface ArcadeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  dramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
}

export const ArcadeHubModal: React.FC<ArcadeHubModalProps> = ({
  isOpen,
  onClose,
  dramas,
  onSelectDrama,
}) => {
  const [activeTab, setActiveTab] = useState<'memory' | 'quiz' | 'wheel'>('memory');

  // --- MEMORY GAME STATE ---
  const icons = ['🌸', '🐰', '🍿', '🎬', '👑', '⚡'];
  const [cards, setCards] = useState<Array<{ id: number; icon: string; flipped: boolean; matched: boolean }>>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);

  const initMemoryGame = () => {
    const paired = [...icons, ...icons]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({
        id: idx,
        icon,
        flipped: false,
        matched: false,
      }));
    setCards(paired);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'memory') {
      initMemoryGame();
    }
  }, [isOpen, activeTab]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length >= 2 || cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    const newFlipped = [...flippedIndices, index];
    setCards(newCards);
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [i1, i2] = newFlipped;
      if (newCards[i1].icon === newCards[i2].icon) {
        newCards[i1].matched = true;
        newCards[i2].matched = true;
        setCards([...newCards]);
        setMatches((m) => m + 1);
        setFlippedIndices([]);
      } else {
        setTimeout(() => {
          newCards[i1].flipped = false;
          newCards[i2].flipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 800);
      }
    }
  };

  // --- QUIZ STATE ---
  const defaultQuiz = [
    {
      q: 'Which drama features a hotel conglomerate heir who hates fake smiles?',
      options: ['King the Land', 'Rain or Shine', 'Vincenzo', 'Doctor X'],
      answer: 'King the Land',
    },
    {
      q: 'What is the video quality provided on AsiaFlix Prime VIP network?',
      options: ['1080p FHD Clean Audio', '360p Cam Rip', 'Low Bitrate Webrip', 'Only 480p SD'],
      answer: '1080p FHD Clean Audio',
    },
    {
      q: 'Which 2026 epic mythological blockbuster movie is streaming in Hindi?',
      options: ['Hanuman Ansh (2026)', 'Colony (2026)', 'The Best Thing', 'Final Table'],
      answer: 'Hanuman Ansh (2026)',
    },
    {
      q: 'Why are AsiaFlix Prime episodes hosted in a private Telegram channel?',
      options: ['To prevent copyright crawler bans & keep links permanent', 'To sell tokens', 'To force signups', 'To show ads'],
      answer: 'To prevent copyright crawler bans & keep links permanent',
    },
    {
      q: 'On which days do official Weekend Mega Lineup drops upload?',
      options: ['Saturday & Sunday 7:00 PM IST', 'Only Monday Morning', 'Wednesday Night', 'Friday Midnight'],
      answer: 'Saturday & Sunday 7:00 PM IST',
    },
  ];

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const resetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedOption(null);
    setQuizFinished(false);
  };

  const handleSelectQuiz = (opt: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(opt);
    const isCorrect = opt === defaultQuiz[quizIndex].answer;
    if (isCorrect) setQuizScore((s) => s + 20);

    setTimeout(() => {
      if (quizIndex + 1 < defaultQuiz.length) {
        setQuizIndex((i) => i + 1);
        setSelectedOption(null);
      } else {
        setQuizFinished(true);
      }
    }, 1000);
  };

  // --- WHEEL STATE ---
  const [pickedDrama, setPickedDrama] = useState<DramaItem | null>(null);
  const [spinning, setSpinning] = useState(false);

  const spinWheel = () => {
    if (spinning || dramas.length === 0) return;
    setSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      const rand = dramas[Math.floor(Math.random() * dramas.length)];
      setPickedDrama(rand);
      count++;
      if (count > 16) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 90);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#14151b] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">AsiaFlix Arcade Hub 🌸</h3>
            <p className="text-xs text-zinc-400">Play games while waiting for your download</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-white/[0.04] p-1 rounded-xl mb-5 border border-white/5">
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'memory' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🃏 Memory Match
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'quiz' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎯 Trivia Quiz
          </button>
          <button
            onClick={() => setActiveTab('wheel')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'wheel' ? 'bg-[#e50914] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎡 Picker Wheel
          </button>
        </div>

        {/* TAB 1: MEMORY */}
        {activeTab === 'memory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span>Moves: <strong className="text-white">{moves}</strong></span>
              <span>Matched: <strong className="text-emerald-400">{matches}/6</strong></span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 max-w-[280px] mx-auto py-2">
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(i)}
                  className={`aspect-square rounded-xl text-xl flex items-center justify-center font-bold border transition-all ${
                    card.matched
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : card.flipped
                      ? 'bg-red-500/20 border-[#e50914] text-white'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-zinc-600'
                  }`}
                >
                  {card.flipped || card.matched ? card.icon : '❓'}
                </button>
              ))}
            </div>

            {matches === 6 && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs font-bold text-emerald-300">
                🎉 Great Job! All drama cards matched in {moves} moves!
              </div>
            )}

            <button
              onClick={initMemoryGame}
              className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Memory Match</span>
            </button>
          </div>
        )}

        {/* TAB 2: QUIZ */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {!quizFinished ? (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>Question <strong className="text-white">{quizIndex + 1}/{defaultQuiz.length}</strong></span>
                  <span>Score: <strong className="text-amber-400">{quizScore} pts</strong></span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm font-bold text-white min-h-[64px] flex items-center">
                  {defaultQuiz[quizIndex].q}
                </div>

                <div className="space-y-2">
                  {defaultQuiz[quizIndex].options.map((opt) => {
                    let btnStyle = 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-200';
                    if (selectedOption !== null) {
                      if (opt === defaultQuiz[quizIndex].answer) {
                        btnStyle = 'bg-emerald-500/30 border-emerald-500 text-white font-black';
                      } else if (opt === selectedOption) {
                        btnStyle = 'bg-red-500/30 border-[#e50914] text-white';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectQuiz(opt)}
                        disabled={selectedOption !== null}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold text-left border transition-all ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-3">
                <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
                <h4 className="text-base font-black text-white">Quiz Completed!</h4>
                <p className="text-xs text-zinc-400">
                  Final Score: <strong className="text-amber-400 text-sm">{quizScore} / 100</strong>
                </p>
                <button
                  onClick={resetQuiz}
                  className="px-5 py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-black shadow-lg hover:scale-105 transition-all"
                >
                  Play Quiz Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WHEEL */}
        {activeTab === 'wheel' && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-zinc-400">
              Confused what to binge watch tonight? Spin the wheel and let AsiaFlix decide!
            </p>

            <div className="p-6 rounded-2xl bg-white/[0.03] border-2 border-dashed border-[#e50914]/40 min-h-[140px] flex flex-col items-center justify-center">
              {pickedDrama ? (
                <div className="space-y-1">
                  <div className="text-lg font-black text-white">{pickedDrama.title}</div>
                  <div className="text-xs text-red-400 font-bold">{pickedDrama.defaultAudio} · {pickedDrama.releaseYear}</div>
                  <div className="text-[11px] text-zinc-400">{pickedDrama.category} · ★ {pickedDrama.rating}</div>
                </div>
              ) : (
                <div className="text-sm font-bold text-zinc-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tap Spin below!</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={spinWheel}
                disabled={spinning}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white text-xs font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {spinning ? 'Spinning...' : '🎡 Spin For Next Drama'}
              </button>

              {pickedDrama && !spinning && (
                <button
                  onClick={() => {
                    onSelectDrama(pickedDrama);
                    onClose();
                  }}
                  className="px-4 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/10 transition-all"
                >
                  View
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
