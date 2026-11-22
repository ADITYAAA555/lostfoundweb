import React, { useState } from 'react';
import { HelpCircle, Phone, Send, ShieldAlert } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import type { SupportTicket } from '../types/campusfind';

const FAQS = [
  {
    q: 'How does CampusFind keep my private item details safe?',
    a: 'Private identifying features (card digits, lockscreen images, initials, or exact room spots) are stored in a restricted subcollection and hidden from public listings. Only the reporter, campus security staff, and admins can view them during claim verification.',
  },
  {
    q: 'Does a high AI matching score automatically approve a claim?',
    a: 'No. AI similarity scores (0–100) only help owners locate likely matches faster. Every ownership claim requires human verification by the finder, university security staff, or an administrator.',
  },
  {
    q: 'What should I do if I find an expensive phone, laptop, or wallet?',
    a: 'Select "Hand over to university security" when submitting your Found Report. You can also report anonymously to the public while still earning Good Samaritan XP once security confirms the return.',
  },
  {
    q: 'How are Good Samaritan XP points calculated?',
    a: 'Valid found reports earn +10 XP, verified successful returns earn +100 XP, and every 5th verified return grants a +100 XP milestone bonus. Duplicate rewards for the same item are blocked automatically.',
  },
];

export const HelpSupportPage: React.FC = () => {
  const { currentUser, locations, submitSupportTicket, supportTickets } = useApp();
  const primaryDesk = locations.find((l) => l.hasSecurityDesk);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('General Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    submitSupportTicket({ subject, category, message });
    setSubject('');
    setMessage('');
    setSubmitted(true);
  };

  const content = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: FAQs & Instructions */}
      <div className="lg:col-span-7 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#10243B] flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#1769AA]" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="divide-y divide-slate-100">
            {FAQS.map((item) => (
              <details key={item.q} className="py-3.5 group">
                <summary className="text-sm font-semibold text-[#10243B] cursor-pointer list-none flex items-center justify-between gap-4">
                  <span>{item.q}</span>
                  <span className="text-xs text-[#1769AA] shrink-0 group-open:hidden">Expand</span>
                  <span className="text-xs text-slate-400 shrink-0 hidden group-open:inline">Hide</span>
                </summary>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-[#10243B] mb-2">Reporting Instructions</h3>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
              <li>Take a clear photo of the item without exposing sensitive card numbers.</li>
              <li>Use Gemini Vision extraction or enter category, brand, and color accurately.</li>
              <li>Add a private identifying clue only the true owner would know.</li>
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#10243B] mb-2">Claiming Instructions</h3>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
              <li>Check AI Smart Matches or Browse Items for your lost belonging.</li>
              <li>Submit an ownership claim with exact private details and context.</li>
              <li>Bring your university ID card when collecting from Security Desks.</li>
            </ol>
          </div>
        </section>
      </div>

      {/* Right: Security Contact & Support Form */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#10243B] text-white rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#16A36A]" />
            <span>University Security Desk</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Main Gate Security Desk operates 24/7 for high-value electronics, wallets, passports, and campus ID cards.
          </p>
          <div className="text-xs space-y-1 pt-1 font-mono-num text-slate-200">
            <p>Primary Desk: {primaryDesk ? `${primaryDesk.name} (${primaryDesk.buildingCode})` : 'Configured Campus Security Office'}</p>
            <p>Operating Hours: {primaryDesk?.securityHours || '24/7 Operations'}</p>
            <p>Campus Email: security@institution.edu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#1769AA]" />
            <span>Contact Support or Report Suspicious User</span>
          </h2>

          {submitted && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              Ticket submitted! Our campus operations team has logged your message.
            </div>
          )}

          <div>
            <label htmlFor="sup-cat" className="block text-xs font-medium text-slate-700 mb-1">
              Inquiry Type
            </label>
            <select
              id="sup-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="General Inquiry">General Inquiry</option>
              <option value="Security Desk">University Security</option>
              <option value="Suspicious Activity">Report Suspicious User</option>
              <option value="Technical Bug">Technical Support</option>
              <option value="Feedback">Platform Feedback</option>
            </select>
          </div>

          <div>
            <label htmlFor="sup-subj" className="block text-xs font-medium text-slate-700 mb-1">
              Subject
            </label>
            <input
              id="sup-subj"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="sup-msg" className="block text-xs font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              id="sup-msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your question, feedback, or report details..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] inline-flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Inquiry</span>
          </button>

          {supportTickets.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-500">Recent Support Tickets</p>
              {supportTickets.slice(0, 3).map((t) => (
                <div key={t.ticketId} className="text-xs flex justify-between gap-2 text-slate-600">
                  <span className="truncate">{t.subject}</span>
                  <span className="font-semibold text-[#1769AA] shrink-0">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );

  if (currentUser) {
    return (
      <AppShell
        title="Help, Security & Support"
        subtitle="Reporting guidelines, FAQs, campus security contacts, and feedback"
      >
        {content}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#10243B]">Help, Security & Support</h1>
          <p className="text-sm text-slate-600 mt-1">
            Answers, safety instructions, and campus security desk information.
          </p>
        </div>
        {content}
      </main>
    </div>
  );
};
