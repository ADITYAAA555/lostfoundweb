import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { useApp } from '../context/AppContext';
import type { ItemReport } from '../types/campusfind';

export const MatchesPage: React.FC = () => {
  const { currentUser, items, matches, aiStatus, runMatchingForItem } = useApp();
  const [selectedItem, setSelectedItem] = useState<ItemReport | null>(null);
  const [openClaimOnModal, setOpenClaimOnModal] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<'all' | 'strong' | 'possible'>('all');

  const myItems = useMemo(
    () => items.filter((i) => i.reportedBy === currentUser?.userId && i.status !== 'Closed'),
    [items, currentUser]
  );

  const relevantMatches = useMemo(() => {
    const isPriv = currentUser?.role === 'admin' || currentUser?.role === 'security';
    return matches
      .filter((m) =>
        isPriv
          ? true
          : m.lostOwnerId === currentUser?.userId || m.foundReporterId === currentUser?.userId
      )
      .filter((m) => {
        if (tierFilter === 'strong') return m.combinedScore >= 80;
        if (tierFilter === 'possible') return m.combinedScore >= 60 && m.combinedScore < 80;
        return true;
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }, [matches, currentUser, tierFilter]);

  const handleRescan = async (itemId: string) => {
    setScanningId(itemId);
    try {
      await runMatchingForItem(itemId);
    } finally {
      setScanningId(null);
    }
  };

  return (
    <AppShell
      title="AI Smart Matching"
      subtitle="Weighted similarity scoring: Text (35%) · Image (30%) · Attributes (20%) · Location & Time (15%)"
    >
      {/* Mode & Disclaimer Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-[#10243B] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1769AA]" />
            <span>
              Engine Mode:{' '}
              {aiStatus.geminiConfigured
                ? `Live Gemini Multimodal Embeddings (${aiStatus.embeddingModel})`
                : 'Deterministic Text, Attribute & Spatial Fallback (Local Engine)'}
            </span>
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Scores measure similarity only (80–100 Strong, 60–79 Possible, &lt;60 Low). Ownership is never auto-approved without human verification.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 w-fit">
          {[
            { id: 'all', label: 'All Matches' },
            { id: 'strong', label: 'Strong (80+)' },
            { id: 'possible', label: 'Possible (60–79)' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTierFilter(t.id as 'all' | 'strong' | 'possible')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tierFilter === t.id ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rescan Toolbar for User's Active Reports */}
      {myItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#10243B]">Re-run Smart Matching on your reports:</span>
          <div className="flex flex-wrap gap-2">
            {myItems.map((it) => (
              <button
                key={it.itemId}
                type="button"
                disabled={scanningId === it.itemId}
                onClick={() => handleRescan(it.itemId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1769AA] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanningId === it.itemId ? 'animate-spin' : ''}`} />
                <span>{it.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matches List */}
      {relevantMatches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-[#10243B]">No AI matches in this threshold</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Report a lost or found item or switch to All Matches to inspect lower-priority similarity candidates.
          </p>
          <div className="pt-2">
            <Link
              to="/report-lost"
              className="inline-flex px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg"
            >
              Report a Lost Item
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {relevantMatches.map((match) => {
            const lostItem = items.find((i) => i.itemId === match.lostItemId);
            const foundItem = items.find((i) => i.itemId === match.foundItemId);
            const targetToClaim =
              currentUser?.userId === match.lostOwnerId ? foundItem : lostItem || foundItem;

            const scoreColor =
              match.combinedScore >= 80
                ? 'text-[#16A36A]'
                : match.combinedScore >= 60
                  ? 'text-[#1769AA]'
                  : 'text-slate-600';

            return (
              <article
                key={match.matchId}
                className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
              >
                {/* Candidate Image */}
                <div className="lg:col-span-3 aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  {targetToClaim?.imageURL ? (
                    <img
                      src={targetToClaim.imageURL}
                      alt={targetToClaim.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      No photograph
                    </div>
                  )}
                </div>

                {/* Details & Breakdown */}
                <div className="lg:col-span-6 space-y-2.5">
                  <div className="text-xs text-slate-500">
                    <span className={`font-bold ${scoreColor}`}>{match.tier}</span>
                    <span> · </span>
                    <span>
                      {match.aiMode === 'gemini-live' ? 'Gemini Embedding' : 'Deterministic Match'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#10243B]">
                    {foundItem?.title || 'Found Item'}
                  </h3>

                  <p className="text-xs text-slate-600">
                    Matched against lost report: <span className="font-semibold">{lostItem?.title}</span>
                  </p>

                  <p className="text-xs text-slate-500">
                    Location: {foundItem?.location} · Reported{' '}
                    {new Date(foundItem?.createdAt || match.createdAt).toLocaleDateString()}
                  </p>

                  {/* Component Score Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-500">Text (35%)</p>
                      <p className="font-mono-num font-bold text-[#10243B]">{match.textScore}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Image (30%)</p>
                      <p className="font-mono-num font-bold text-[#10243B]">{match.imageScore}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Attr (20%)</p>
                      <p className="font-mono-num font-bold text-[#10243B]">{match.attributeScore}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Loc/Time (15%)</p>
                      <p className="font-mono-num font-bold text-[#10243B]">{match.locationTimeScore}</p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 pt-1">
                    <span className="font-semibold text-[#10243B]">Matching reasons: </span>
                    {match.reasons.join(' · ')}
                  </div>
                </div>

                {/* Combined Score & Actions */}
                <div className="lg:col-span-3 flex lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5">
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-slate-500">Weighted Score</p>
                    <p className={`text-3xl font-mono-num font-extrabold ${scoreColor}`}>
                      {match.combinedScore}
                      <span className="text-sm font-normal text-slate-400">/100</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap lg:flex-col gap-2 w-auto lg:w-full">
                    {targetToClaim && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenClaimOnModal(false);
                            setSelectedItem(targetToClaim);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-[#10243B] bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                          View Details
                        </button>
                        {currentUser?.userId !== targetToClaim.reportedBy && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenClaimOnModal(true);
                              setSelectedItem(targetToClaim);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
                          >
                            Submit Claim
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ItemDetailModal
        item={selectedItem}
        defaultOpenClaim={openClaimOnModal}
        onClose={() => setSelectedItem(null)}
      />
    </AppShell>
  );
};
