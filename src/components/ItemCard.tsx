import React, { useState } from 'react';
import { Package } from 'lucide-react';
import type { ItemReport } from '../types/campusfind';

export const STATUS_STYLES: Record<string, string> = {
  Lost: 'text-amber-700',
  Found: 'text-[#1769AA]',
  Matched: 'text-[#1769AA]',
  'Claim Pending': 'text-amber-700',
  'Handed to Security': 'text-[#10243B]',
  Returned: 'text-[#16A36A]',
  Closed: 'text-slate-500',
};

export const ItemCard: React.FC<{
  item: ItemReport;
  onViewDetails: (item: ItemReport) => void;
  actionLabel?: string;
}> = ({ item, onViewDetails, actionLabel = 'View details' }) => {
  const [imgError, setImgError] = useState(false);

  const formattedDate = new Date(item.eventDate || item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {item.imageURL && !imgError ? (
          <img
            src={item.imageURL}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 p-4 text-center">
            <Package className="w-8 h-8 mb-2" />
            <span className="text-xs font-medium text-slate-500">{item.category}</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
          <span className="font-medium text-slate-700">
            {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
          </span>
          <span className={`font-semibold ${STATUS_STYLES[item.status] || 'text-slate-600'}`}>
            {item.status}
          </span>
        </div>

        <h3 className="text-base font-semibold text-[#10243B] line-clamp-1 mb-1">{item.title}</h3>

        <p className="text-xs text-slate-500 mb-2 truncate">
          {item.category} · {item.color} · {item.location} · {formattedDate}
        </p>

        <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">{item.description}</p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 truncate">By {item.reporterDisplay}</span>
          <button
            type="button"
            onClick={() => onViewDetails(item)}
            className="px-3 py-1.5 text-xs font-semibold text-[#1769AA] hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </article>
  );
};
