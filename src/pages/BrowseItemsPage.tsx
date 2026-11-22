import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AppShell } from '../components/AppShell';
import { ItemCard } from '../components/ItemCard';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { useApp } from '../context/AppContext';
import { ITEM_COLORS } from '../data/campusLocations';
import type { ItemReport } from '../types/campusfind';

export const BrowseItemsPage: React.FC = () => {
  const { items, categories, locations, currentUser } = useApp();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<'found' | 'lost'>(
    searchParams.get('tab') === 'lost' ? 'lost' : 'found'
  );
  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [colorFilter, setColorFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedItem, setSelectedItem] = useState<ItemReport | null>(null);

  const filteredItems = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const b = brandFilter.trim().toLowerCase();

    return items
      .filter((item) => item.type === tab)
      .filter((item) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
        );
      })
      .filter((item) => (categoryFilter === 'All' ? true : item.category === categoryFilter))
      .filter((item) => (colorFilter === 'All' ? true : item.color.toLowerCase() === colorFilter.toLowerCase()))
      .filter((item) => (!b ? true : item.brand.toLowerCase().includes(b)))
      .filter((item) => (locationFilter === 'All' ? true : item.location === locationFilter))
      .filter((item) => {
        if (!dateFilter) return true;
        return (item.eventDate || item.createdAt).slice(0, 10) >= dateFilter;
      })
      .sort((a, bItem) => {
        const tA = Date.parse(a.createdAt);
        const tB = Date.parse(bItem.createdAt);
        return sortOrder === 'newest' ? tB - tA : tA - tB;
      });
  }, [items, tab, queryText, categoryFilter, colorFilter, brandFilter, locationFilter, dateFilter, sortOrder]);

  const content = (
    <div className="space-y-6">
      {/* Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setTab('found')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'found' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Found Items ({items.filter((i) => i.type === 'found').length})
            </button>
            <button
              type="button"
              onClick={() => setTab('lost')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'lost' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lost Items ({items.filter((i) => i.type === 'lost').length})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              aria-label="Search campus items"
              placeholder="Search by item name, brand, description..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            />
          </div>
        </div>

        {/* Multi-attribute Filters */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label htmlFor="filter-cat" className="block text-xs text-slate-500 mb-1">
              Category
            </label>
            <select
              id="filter-cat"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-color" className="block text-xs text-slate-500 mb-1">
              Color
            </label>
            <select
              id="filter-color"
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Colors</option>
              {ITEM_COLORS.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-brand" className="block text-xs text-slate-500 mb-1">
              Brand
            </label>
            <input
              id="filter-brand"
              type="text"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="Any brand"
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="filter-loc" className="block text-xs text-slate-500 mb-1">
              Location
            </label>
            <select
              id="filter-loc"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-date" className="block text-xs text-slate-500 mb-1">
              Since Date
            </label>
            <input
              id="filter-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="filter-sort" className="block text-xs text-slate-500 mb-1">
              Sort Order
            </label>
            <select
              id="filter-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#10243B]">No matching items found</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Try clearing one of your filters or switching between Lost and Found tabs.
          </p>
          <button
            type="button"
            onClick={() => {
              setQueryText('');
              setCategoryFilter('All');
              setColorFilter('All');
              setBrandFilter('');
              setLocationFilter('All');
              setDateFilter('');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard key={item.itemId} item={item} onViewDetails={setSelectedItem} />
          ))}
        </div>
      )}

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );

  if (currentUser) {
    return (
      <AppShell
        title="Browse Campus Belongings"
        subtitle="Search and filter active lost and found reports across campus"
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
          <h1 className="text-2xl font-bold text-[#10243B]">Browse Campus Belongings</h1>
          <p className="text-sm text-slate-600 mt-1">
            Private identifying details stay hidden until verified through an ownership claim.
          </p>
        </div>
        {content}
      </main>
    </div>
  );
};
