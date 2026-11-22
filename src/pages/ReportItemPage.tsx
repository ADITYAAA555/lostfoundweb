import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock, Shield, Sparkles, Upload } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { ITEM_COLORS } from '../data/campusLocations';
import type { HandoverPreference, ItemType } from '../types/campusfind';
import { isValuableCategory, validateImageFile, validateItemReportInput } from '../utils/validation';

export const ReportItemPage: React.FC<{ reportType: ItemType }> = ({ reportType }) => {
  const {
    categories,
    locations,
    rawItemsForPrivileged,
    submitItemReport,
    updateItemReport,
    aiStatus,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const existingItem = editId ? rawItemsForPrivileged.find((i) => i.itemId === editId) : undefined;

  const [title, setTitle] = useState(existingItem?.title || '');
  const [category, setCategory] = useState(existingItem?.category || categories[0]);
  const [brand, setBrand] = useState(existingItem?.brand || '');
  const [color, setColor] = useState(existingItem?.color || ITEM_COLORS[0]);
  const [description, setDescription] = useState(existingItem?.description || '');
  const [location, setLocation] = useState(existingItem?.location || locations[0]?.name || '');
  const [eventDate, setEventDate] = useState(
    existingItem?.eventDate
      ? existingItem.eventDate.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [privateFeatures, setPrivateFeatures] = useState(existingItem?.privateFeatures || '');
  const [exactLocationNote, setExactLocationNote] = useState(existingItem?.exactLocationNote || '');
  const [imageURL, setImageURL] = useState(existingItem?.imageURL || '');
  const [handoverPreference, setHandoverPreference] = useState<HandoverPreference>(
    existingItem?.handoverPreference || 'safe_return'
  );
  const [isAnonymous, setIsAnonymous] = useState(existingItem?.isAnonymous || false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valuableDetected = isValuableCategory(category, title);

  useEffect(() => {
    if (handoverPreference === 'anonymous') {
      setIsAnonymous(true);
    }
  }, [handoverPreference]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile({ type: file.type, size: file.size });
    if (!check.valid) {
      setErrors((prev) => ({ ...prev, image: check.error || 'Invalid file.' }));
      return;
    }
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.image;
      return copy;
    });
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageURL(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeWithGemini = async () => {
    if (!imageURL || !imageURL.startsWith('data:')) {
      setAiMessage('Upload a JPEG, PNG, or WebP photograph first to extract item details with Gemini Vision.');
      return;
    }
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: imageURL }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAiMessage(data.error || 'Gemini Vision unavailable. Please fill in item details manually.');
      } else {
        const ext = data.extracted;
        if (ext.title) setTitle(ext.title);
        if (ext.category && categories.includes(ext.category)) setCategory(ext.category);
        if (ext.brand) setBrand(ext.brand);
        if (ext.color) setColor(ext.color);
        if (ext.description) setDescription(ext.description);
        if (ext.isValuable && reportType === 'found') {
          setHandoverPreference('security_desk');
        }
        setAiMessage(
          `Details extracted via ${data.model}${ext.suggestedPrivatePrompt ? ` · Tip: Note a private detail such as "${ext.suggestedPrivatePrompt}"` : ''}`
        );
      }
    } catch {
      setAiMessage('Could not reach Gemini Vision service. Fill in fields manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateItemReportInput({
      title,
      category,
      color,
      description,
      location,
      eventDate,
      privateFeatures,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      if (existingItem) {
        await updateItemReport(existingItem.itemId, {
          title,
          category,
          brand,
          color,
          description,
          location,
          eventDate: new Date(eventDate).toISOString(),
          imageURL,
        });
        navigate('/my-reports');
      } else {
        await submitItemReport({
          type: reportType,
          title,
          category,
          brand,
          color,
          description,
          privateFeatures,
          exactLocationNote,
          imageURL,
          location,
          eventDate: new Date(eventDate).toISOString(),
          isAnonymous: reportType === 'found' ? isAnonymous || handoverPreference === 'anonymous' : false,
          handoverPreference: reportType === 'found' ? handoverPreference : undefined,
        });
        navigate('/matches');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={
        existingItem
          ? `Edit Report: ${existingItem.title}`
          : reportType === 'lost'
            ? 'Report Lost Item'
            : 'Report Found Item'
      }
      subtitle={
        reportType === 'lost'
          ? 'Submitting automatically runs AI smart matching against all active campus found items.'
          : 'Earn +10 XP for a valid found report and +100 XP upon verified return.'
      }
    >
      <form onSubmit={handleSubmit} className="max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <label htmlFor="item-title" className="block text-xs font-semibold text-slate-700 mb-1">
              Item Name *
            </label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={reportType === 'lost' ? 'e.g., Leather Wallet' : 'e.g., Wireless Earbuds'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5">
              <label htmlFor="item-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                id="item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-3 pr-7 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="item-brand" className="block text-xs font-semibold text-slate-700 mb-1">
                Brand
              </label>
              <input
                id="item-brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Manufacturer or brand"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="item-color" className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Color *
              </label>
              <select
                id="item-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full pl-3 pr-7 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {ITEM_COLORS.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="item-desc" className="block text-xs font-semibold text-slate-700 mb-1">
              Public Description *
            </label>
            <textarea
              id="item-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe visible characteristics without revealing private verification secrets..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-location" className="block text-xs font-semibold text-slate-700 mb-1">
                {reportType === 'lost' ? 'Last Seen Location *' : 'Location Found *'}
              </label>
              <select
                id="item-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name} ({loc.buildingCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="item-date" className="block text-xs font-semibold text-slate-700 mb-1">
                {reportType === 'lost' ? 'Date & Time Lost *' : 'Date & Time Found *'}
              </label>
              <input
                id="item-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Private Identifying Features */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#10243B]">
              <Lock className="w-3.5 h-3.5 text-[#1769AA]" />
              <span>Private Identifying Features (Never Shown Publicly)</span>
            </div>
            <textarea
              rows={2}
              value={privateFeatures}
              onChange={(e) => setPrivateFeatures(e.target.value)}
              placeholder="e.g., Lockscreen wallpaper, last 4 digits of student card, sticker inside case, initials..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={exactLocationNote}
              onChange={(e) => setExactLocationNote(e.target.value)}
              placeholder="Exact spot note (visible only to you, security staff & admins)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {reportType === 'found' && !existingItem && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#10243B]">Handover Preference</label>
                {valuableDetected && (
                  <span className="text-xs font-medium text-[#1769AA] flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Valuable item: Security handover recommended
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'safe_return', label: 'Arrange Safe Return', desc: 'Coordinate pickup in public campus zone' },
                  { id: 'security_desk', label: 'University Security', desc: 'Deposit at Security Desk custody' },
                  { id: 'anonymous', label: 'Anonymous Report', desc: 'Hide your name publicly' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHandoverPreference(opt.id as HandoverPreference)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      handoverPreference === opt.id
                        ? 'border-[#1769AA] bg-blue-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-[#10243B]">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>List my identity as Anonymous Campus Finder publicly (admins & security can still verify XP)</span>
              </label>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] disabled:opacity-60"
            >
              {submitting
                ? 'Submitting & Running AI Match...'
                : existingItem
                  ? 'Save Changes'
                  : reportType === 'lost'
                    ? 'Submit Lost Report'
                    : 'Submit Found Report'}
            </button>
          </div>
        </div>

        {/* Right: Image Upload & Gemini Vision Extractor */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#10243B]">Item Photograph</h2>

            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-[#1769AA] transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <span className="block text-xs font-semibold text-[#10243B]">Upload JPEG, PNG, or WebP</span>
              <span className="block text-xs text-slate-500 mt-0.5">Max file size 5 MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            {errors.image && <p className="text-xs text-red-600">{errors.image}</p>}

            {imageURL && (
              <div className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img src={imageURL} alt="Uploaded item preview" className="w-full h-full object-cover" />
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeWithGemini}
              disabled={aiLoading}
              className="w-full py-2.5 px-4 text-xs font-semibold text-[#10243B] bg-[#F6F8FB] border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#1769AA]" />
              <span>{aiLoading ? 'Analyzing Image...' : 'Extract Details with Gemini AI'}</span>
            </button>

            {!aiStatus.geminiConfigured && (
              <p className="text-xs text-slate-500 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Gemini API key not active in server secrets; matching uses deterministic lexical & spatial scoring until configured.
                </span>
              </p>
            )}

            {aiMessage && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#10243B] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1769AA] shrink-0 mt-0.5" />
                <span>{aiMessage}</span>
              </div>
            )}
          </div>
        </aside>
      </form>
    </AppShell>
  );
};
