import React, { useState } from 'react';
import { X, Film, Send, Sparkles } from 'lucide-react';
import { AudioType } from '../types/drama';

interface RequestDramaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDramaModal: React.FC<RequestDramaModalProps> = ({ isOpen, onClose }) => {
  const [dramaName, setDramaName] = useState('');
  const [telegramUser, setTelegramUser] = useState('');
  const [releaseYear, setReleaseYear] = useState('2026');
  const [audioPreference, setAudioPreference] = useState<string>('Hindi Dubbed');
  const [customNote, setCustomNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dramaName.trim() || !telegramUser.trim()) return;

    const formattedText = `🎬 *NEW DRAMA REQUEST* 🌸\n\n👤 *User:* ${telegramUser.trim()}\n📌 *Title:* ${dramaName.trim()}\n📅 *Year:* ${releaseYear || 'N/A'}\n🔊 *Audio:* ${audioPreference}\n📝 *Note:* ${customNote.trim() || 'Clean 1080p FHD'}\n\n🌐 _Sent via AsiaFlix Prime Portal_`;

    const botUrl = `https://t.me/asiaflix_request_bot?text=${encodeURIComponent(formattedText)}`;
    window.open(botUrl, '_blank');

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      setDramaName('');
      setCustomNote('');
    }, 2200);
  };

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

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-[#e50914]/20 text-[#ff2b54]">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Request a Drama or Movie</h3>
            <p className="text-xs text-zinc-400">Direct telegram bot upload dispatcher</p>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h4 className="text-sm font-black text-white">Telegram Bot Opened!</h4>
            <p className="text-xs text-zinc-400">
              Press "Send" in Telegram to deliver your request directly to the admin queue. 🌸
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Drama / Movie Name *
              </label>
              <input
                type="text"
                required
                value={dramaName}
                onChange={(e) => setDramaName(e.target.value)}
                placeholder="e.g. Vincenzo, Hidden Love, When the Camellia Blooms"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#e50914] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Your Telegram Username *
              </label>
              <input
                type="text"
                required
                value={telegramUser}
                onChange={(e) => setTelegramUser(e.target.value)}
                placeholder="e.g. @rahul_kdrama"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#e50914] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Release Year
                </label>
                <input
                  type="text"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#e50914] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Audio Preference
                </label>
                <select
                  value={audioPreference}
                  onChange={(e) => setAudioPreference(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#181924] border border-white/10 text-white text-xs outline-none focus:border-[#e50914] cursor-pointer"
                >
                  <option value="Hindi Dubbed">Hindi Dubbed</option>
                  <option value="Fan Dubbed">Fan Dubbed</option>
                  <option value="Eng Sub / Original">Eng Sub / Original</option>
                  <option value="Any Available">Any Available</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Custom Note (Optional)
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Please provide 1080p FHD batch link if possible"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#e50914] outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#229ed9] to-[#1778b5] hover:from-[#2bb0f0] hover:to-[#1c8ad0] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Open Bot in Telegram & Send</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
