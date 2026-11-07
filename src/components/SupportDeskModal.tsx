import React, { useState } from 'react';
import { X, Headphones, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { SupportTicket } from '../types/drama';

interface SupportDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: SupportTicket[];
}

export const SupportDeskModal: React.FC<SupportDeskModalProps> = ({ isOpen, onClose, tickets }) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'tickets'>('submit');
  const [userName, setUserName] = useState('');
  const [issueCategory, setIssueCategory] = useState('Telegram Link Not Working / Broken');
  const [dramaTitle, setDramaTitle] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !issueDetails.trim()) return;

    const formattedText = `🎧 *NEW SUPPORT TICKET* 🎧\n\n👤 *User:* ${userName.trim()}\n⚠️ *Issue:* ${issueCategory}\n🎬 *Drama:* ${dramaTitle.trim() || 'General'}\n💬 *Message:* ${issueDetails.trim()}\n\n🌐 _Sent via AsiaFlix Prime Portal_`;

    const botUrl = `https://t.me/asiaflix_request_bot?text=${encodeURIComponent(formattedText)}`;
    window.open(botUrl, '_blank');

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      setIssueDetails('');
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#14151b] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Support & User Help Desk</h3>
            <p className="text-xs text-zinc-400">Official AsiaFlix private ticket portal</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 mb-5">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'submit'
                ? 'border-[#e50914] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Submit Issue / Complaint
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'border-[#e50914] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Admin Resolved Tickets</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded text-[10px] font-black">
              {tickets.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Submit */}
        {activeTab === 'submit' ? (
          <div className="overflow-y-auto pr-1 flex-1">
            {submitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <h4 className="text-sm font-black text-white">Ticket Sent to Telegram!</h4>
                <p className="text-xs text-zinc-400">
                  The AsiaFlix admin bot is receiving your ticket and will resolve it shortly. 🌸
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Your Telegram Username / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. @rahul_korea"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#e50914] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Issue Category *
                  </label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#181924] border border-white/10 text-white text-xs outline-none focus:border-[#e50914] cursor-pointer"
                  >
                    <option value="Telegram Link Not Working / Broken">🔗 Telegram Link Not Working / Broken</option>
                    <option value="Audio Mismatch / Low Quality">🔊 Audio Mismatch / Low Quality</option>
                    <option value="Missing Episodes in Series">📁 Missing Episodes in Series</option>
                    <option value="General Feedback / Suggestion">💬 General Feedback / Thank You</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Drama / Movie Name
                  </label>
                  <input
                    type="text"
                    value={dramaTitle}
                    onChange={(e) => setDramaTitle(e.target.value)}
                    placeholder="e.g. Rain or Shine, Colony"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#e50914] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Explain Your Issue *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    placeholder="Describe clearly kya issue hai (e.g. Ep 11 audio track)..."
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
        ) : (
          /* Tab 2: Admin Tickets */
          <div className="overflow-y-auto space-y-3 flex-1 pr-1">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white">
                    🎟️ #{t.id} · <span className="text-zinc-300">{t.title}</span>
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/30">
                    {t.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">Issue:</strong> "{t.issue}"
                </p>

                <div className="p-2.5 rounded-lg bg-black/50 border-l-2 border-[#e50914] text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-red-400 block mb-0.5">🛡️ AsiaFlix Official Support 🌸:</strong>
                  {t.reply}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
