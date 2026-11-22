import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ItemCard } from '../components/ItemCard';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { useApp } from '../context/AppContext';
import type { ItemReport } from '../types/campusfind';
import { buildLeaderboard } from '../utils/xpEngine';

export const LandingPage: React.FC = () => {
  const { items, users, locations, currentUser } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemReport | null>(null);

  const recentFound = useMemo(
    () => items.filter((i) => i.type === 'found').slice(0, 3),
    [items]
  );

  const recentLost = useMemo(
    () => items.filter((i) => i.type === 'lost').slice(0, 3),
    [items]
  );

  const topHeroes = useMemo(
    () => buildLeaderboard(users, { limit: 4 }),
    [users]
  );

  const stats = useMemo(() => {
    const totalRecovered = items.filter((i) => i.status === 'Returned').length;
    const totalReports = items.length;
    const recoveryRate = totalReports > 0 ? `${Math.round((totalRecovered / totalReports) * 100)}%` : '0%';
    const activeCases = items.filter((i) => i.status !== 'Returned' && i.status !== 'Closed').length;
    const securityDeskCount = locations.filter((l) => l.hasSecurityDesk).length;
    return { totalRecovered, recoveryRate, activeCases, securityDeskCount };
  }, [items, locations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#1F2937] flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#1769AA] mb-3">
                University Lost & Found Network · AI-Assisted Recovery
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#10243B] tracking-tight leading-tight text-balance mb-4">
                Lost something? Find it here.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed mb-6">
                Centralized campus recovery connecting students, university security desks, and Good Samaritan finders through multimodal AI matching and verified ownership claims.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 mb-5 max-w-xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search lost or found campus belongings"
                    placeholder="Search wallets, earbuds, ID cards, bottles, buildings..."
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#F6F8FB] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA] focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 text-sm font-semibold text-white bg-[#10243B] rounded-lg hover:bg-[#1a3656] transition-colors whitespace-nowrap shrink-0"
                >
                  Search Items
                </button>
              </form>

              {/* Primary Dual Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={currentUser ? '/report-lost' : '/auth?redirect=/report-lost'}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] transition-colors whitespace-nowrap"
                >
                  <span>I Lost Something</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={currentUser ? '/report-found' : '/auth?redirect=/report-found'}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#10243B] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <span>I Found Something</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src="/src/assets/images/campus_hero_courtyard_1795355926669.jpg"
                  alt="University campus library atrium and sunlit courtyard"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-width Campus Statistics Strip */}
          <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#10243B] font-mono-num">{stats.totalRecovered}</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Items Returned to Owners</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#1769AA] font-mono-num">{stats.recoveryRate}</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Verified Recovery Rate</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#16A36A] font-mono-num">{stats.activeCases}</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Active Open Reports</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#10243B] font-mono-num">
                {stats.securityDeskCount} {stats.securityDeskCount === 1 ? 'Desk' : 'Desks'}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Security Custody Points</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Found Items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#10243B]">Recently Found on Campus</h2>
            <p className="text-sm text-slate-600 mt-1">
              Submitted by fellow students or held safely at campus security desks.
            </p>
          </div>
          <Link
            to="/browse?tab=found"
            className="text-sm font-semibold text-[#1769AA] hover:underline whitespace-nowrap"
          >
            View all found items
          </Link>
        </div>

        {recentFound.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm font-semibold text-[#10243B]">No found items reported yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Found a belonging on campus? Submit a report to match it with its owner.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentFound.map((item) => (
              <ItemCard key={item.itemId} item={item} onViewDetails={setSelectedItem} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Reported Lost Items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 w-full">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#10243B]">Recently Reported Lost</h2>
            <p className="text-sm text-slate-600 mt-1">
              Spotted one of these belongings? Report a match and earn Good Samaritan XP.
            </p>
          </div>
          <Link
            to="/browse?tab=lost"
            className="text-sm font-semibold text-[#1769AA] hover:underline whitespace-nowrap"
          >
            View all lost reports
          </Link>
        </div>

        {recentLost.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm font-semibold text-[#10243B]">No lost items reported yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Lost an item? Submit a lost report to scan matching campus findings automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentLost.map((item) => (
              <ItemCard key={item.itemId} item={item} onViewDetails={setSelectedItem} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#10243B]">How CampusFind Works</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              A transparent, privacy-first workflow designed for university campuses and schools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-[#F6F8FB] border border-slate-200">
              <p className="text-xs font-semibold text-[#1769AA] mb-2">01. Report with Photo & Private Clues</p>
              <h3 className="text-lg font-bold text-[#10243B] mb-2">Log Lost or Found Belongings</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Upload a photo to auto-extract brand, color, and category. Private identifying features stay encrypted from public view.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[#F6F8FB] border border-slate-200">
              <p className="text-xs font-semibold text-[#1769AA] mb-2">02. Multimodal AI Smart Matching</p>
              <h3 className="text-lg font-bold text-[#10243B] mb-2">Weighted Similarity Scoring</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Semantic text embeddings, visual comparison, attribute alignment, and campus proximity rank candidate matches from 0 to 100.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[#F6F8FB] border border-slate-200">
              <p className="text-xs font-semibold text-[#1769AA] mb-2">03. Verified Handover & XP Rewards</p>
              <h3 className="text-lg font-bold text-[#10243B] mb-2">Secure Return & Recognition</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Owners prove identity via private questions or Security Desk ID checks. Finders earn +100 XP, badges, and campus perks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Campus Heroes & Features Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-2xl font-bold text-[#10243B]">Built for Campus Trust</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Valuable items like phones, wallets, and student ID cards can be handed anonymously to University Security with full chain-of-custody tracking.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#1769AA] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#10243B]">Explainable AI Match Breakdown</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Every suggestion displays Text (35%), Image (30%), Attribute (20%), and Location/Time (15%) scores — never auto-approving claims without human verification.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#16A36A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#10243B]">Anonymous Reporting & Security Custody</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Finders can stay anonymous publicly while University Security logs locked storage drawers and reference IDs.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-[#10243B] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#10243B]">Good Samaritan XP & Canteen Rewards</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Verified returns unlock achievement tiers and simulated vouchers for campus coffee, stationery, and Dean’s certificates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#10243B]">Top Campus Heroes</h3>
                <p className="text-xs text-slate-500">Opt-in public community leaderboard</p>
              </div>
              <Link to="/leaderboard" className="text-xs font-semibold text-[#1769AA] hover:underline">
                Full leaderboard
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {topHeroes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No Campus Heroes ranked yet. Return found belongings to earn Good Samaritan XP.
                </div>
              ) : (
                topHeroes.map((hero) => (
                  <div key={hero.userId} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#F6F8FB] border border-slate-200 flex items-center justify-center text-xs font-mono-num font-bold text-[#10243B] shrink-0">
                        #{hero.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#10243B] truncate">{hero.displayName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {hero.department} · {hero.successfulReturns} returns
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono-num font-bold text-[#16A36A] whitespace-nowrap">
                      {hero.totalXP} XP
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#10243B] text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-white">CampusFind</p>
            <p className="text-xs text-slate-400 mt-1">
              Lost something? Find it here. · University Lost & Found Management System
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
            <Link to="/browse" className="hover:text-white">Browse Items</Link>
            <Link to="/campus-map" className="hover:text-white">Campus Map</Link>
            <Link to="/leaderboard" className="hover:text-white">Leaderboard</Link>
            <Link to="/help" className="hover:text-white">Security & Help</Link>
            <Link to="/auth" className="hover:text-white">Portal Sign In</Link>
          </div>
        </div>
      </footer>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
};
