import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit3, EyeOff, PlusCircle, Sparkles, XCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';

export const MyReportsPage: React.FC = () => {
  const { currentUser, rawItemsForPrivileged, closeItemReport, runMatchingForItem } = useApp();
  const navigate = useNavigate();

  const myReports = useMemo(
    () => rawItemsForPrivileged.filter((i) => i.reportedBy === currentUser?.userId),
    [rawItemsForPrivileged, currentUser]
  );

  return (
    <AppShell
      title="My Lost & Found Reports"
      subtitle="Manage active listings, private features, anonymous status, and AI matches"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-sm text-slate-600">
          Showing <span className="font-mono-num font-bold text-[#10243B]">{myReports.length}</span> reports submitted by you.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/report-lost"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#10243B] rounded-lg"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Lost</span>
          </Link>
          <Link
            to="/report-found"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Found</span>
          </Link>
        </div>
      </div>

      {myReports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
          You have not submitted any lost or found reports yet.
        </div>
      ) : (
        <div className="space-y-4">
          {myReports.map((item) => (
            <article
              key={item.itemId}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-24 h-18 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  {item.imageURL ? (
                    <img src={item.imageURL} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {item.type.toUpperCase()} · {item.status} · {item.location}
                    {item.isAnonymous && (
                      <span className="inline-flex items-center gap-1 ml-2 text-[#1769AA] font-medium">
                        <EyeOff className="w-3 h-3" /> Anonymous publicly
                      </span>
                    )}
                  </p>
                  <h2 className="text-base font-bold text-[#10243B] truncate mt-0.5">{item.title}</h2>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-1">{item.description}</p>
                  {item.privateFeatures && (
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-semibold">Private feature:</span> {item.privateFeatures}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    await runMatchingForItem(item.itemId);
                    navigate('/matches');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1769AA] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Find Matches</span>
                </button>
                {item.status !== 'Closed' && item.status !== 'Returned' && (
                  <>
                    <Link
                      to={`/report-${item.type}?edit=${item.itemId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => closeItemReport(item.itemId)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
};
