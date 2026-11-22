import React, { useMemo, useRef, useState } from 'react';
import {
  Crosshair,
  Edit3,
  Image as ImageIcon,
  MapPin,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AppShell } from '../components/AppShell';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { useApp } from '../context/AppContext';
import type { CampusLocation, CampusMapLayout, ItemReport } from '../types/campusfind';
import { validateImageFile } from '../utils/validation';

const LAYOUT_OPTIONS: Array<{ id: CampusMapLayout; label: string }> = [
  { id: 'classic_quad', label: 'Classic Campus Quad' },
  { id: 'urban_grid', label: 'Urban Grid Blocks' },
  { id: 'circular_courtyard', label: 'Circular Courtyard' },
  { id: 'custom_image', label: 'Custom Map Image' },
];

export const CampusMapPage: React.FC = () => {
  const {
    locations,
    mapConfig,
    items,
    currentUser,
    updateMapConfig,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useApp();

  const [selectedLocName, setSelectedLocName] = useState<string>('All');
  const [onlySecurityDesks, setOnlySecurityDesks] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemReport | null>(null);

  const canEditMap = currentUser?.role === 'admin';
  const [editMode, setEditMode] = useState(false);
  const [pickTarget, setPickTarget] = useState<'new' | 'edit' | null>(null);
  const [editorTab, setEditorTab] = useState<'map' | 'add' | 'edit'>('map');
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);

  // Map config draft state
  const [campusNameDraft, setCampusNameDraft] = useState(mapConfig.campusName);
  const [mapSubtitleDraft, setMapSubtitleDraft] = useState(mapConfig.mapSubtitle);
  const [layoutDraft, setLayoutDraft] = useState<CampusMapLayout>(mapConfig.layoutStyle);
  const [customImageDraft, setCustomImageDraft] = useState(mapConfig.customMapImageURL || '');
  const [mapFormError, setMapFormError] = useState<string | null>(null);

  // Selected location for editing
  const [editingLocId, setEditingLocId] = useState<string>(locations[0]?.id || '');
  const [editForm, setEditForm] = useState<Partial<CampusLocation>>(() => locations[0] || {});

  // Add new location form
  const [newLoc, setNewLoc] = useState<Omit<CampusLocation, 'id'>>({
    name: '',
    zone: 'Academic Core',
    buildingCode: '',
    latitude: 37.4275,
    longitude: -122.1697,
    mapX: 50,
    mapY: 50,
    hasSecurityDesk: false,
    securityHours: '',
  });

  const syncDraftsFromConfig = () => {
    setCampusNameDraft(mapConfig.campusName);
    setMapSubtitleDraft(mapConfig.mapSubtitle);
    setLayoutDraft(mapConfig.layoutStyle);
    setCustomImageDraft(mapConfig.customMapImageURL || '');
    const first = locations[0];
    if (first) {
      setEditingLocId(first.id);
      setEditForm({ ...first });
    }
  };

  const selectLocationForEdit = (loc: CampusLocation) => {
    setEditingLocId(loc.id);
    setEditForm({ ...loc });
    setEditorTab('edit');
  };

  const visibleLocations = useMemo(
    () => (onlySecurityDesks ? locations.filter((l) => l.hasSecurityDesk) : locations),
    [locations, onlySecurityDesks]
  );

  const nearbyReports = useMemo(() => {
    return items.filter((item) => {
      if (selectedLocName !== 'All' && item.location !== selectedLocName) return false;
      if (onlySecurityDesks) {
        const loc = locations.find((l) => l.name === item.location);
        if (!loc?.hasSecurityDesk) return false;
      }
      return true;
    });
  }, [items, selectedLocName, onlySecurityDesks, locations]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || !pickTarget || !mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)) * 10) / 10;
    const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)) * 10) / 10;

    if (pickTarget === 'new') {
      setNewLoc((prev) => ({ ...prev, mapX: x, mapY: y }));
      setEditorTab('add');
    } else if (pickTarget === 'edit') {
      setEditForm((prev) => ({ ...prev, mapX: x, mapY: y }));
      setEditorTab('edit');
    }
    setPickTarget(null);
  };

  const handleSaveMapConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapFormError(null);
    if (campusNameDraft.trim().length < 2) {
      setMapFormError('Map title must be at least 2 characters.');
      return;
    }
    if (layoutDraft === 'custom_image' && !customImageDraft.trim()) {
      setMapFormError('Provide an image URL or upload a campus map image for Custom Map Image layout.');
      return;
    }
    await updateMapConfig({
      campusName: campusNameDraft.trim(),
      mapSubtitle: mapSubtitleDraft.trim(),
      layoutStyle: layoutDraft,
      customMapImageURL: customImageDraft.trim(),
    });
  };

  const handleCustomMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile({ type: file.type, size: file.size });
    if (!check.valid) {
      setMapFormError(check.error || 'Unsupported image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImageDraft(reader.result);
        setLayoutDraft('custom_image');
        setMapFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapFormError(null);
    if (newLoc.name.trim().length < 2 || !newLoc.buildingCode.trim()) {
      setMapFormError('Enter both a location name and building code.');
      return;
    }
    const created = await addLocation(newLoc);
    setNewLoc({
      name: '',
      zone: 'Academic Core',
      buildingCode: '',
      latitude: 37.4275,
      longitude: -122.1697,
      mapX: 50,
      mapY: 50,
      hasSecurityDesk: false,
      securityHours: '',
    });
    selectLocationForEdit(created);
  };

  const handleUpdateLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapFormError(null);
    if (!editingLocId || !editForm.name?.trim() || !editForm.buildingCode?.trim()) {
      setMapFormError('Location name and building code are required.');
      return;
    }
    await updateLocation(editingLocId, editForm);
  };

  const handleDeleteSelectedLocation = async () => {
    if (!editingLocId) return;
    await deleteLocation(editingLocId);
    const remaining = locations.filter((l) => l.id !== editingLocId);
    if (remaining[0]) {
      setEditingLocId(remaining[0].id);
      setEditForm({ ...remaining[0] });
    }
  };

  const activeLayout = editMode ? layoutDraft : mapConfig.layoutStyle;
  const activeCustomImg = editMode ? customImageDraft : mapConfig.customMapImageURL;
  const activeMapTitle = editMode ? campusNameDraft || mapConfig.campusName : mapConfig.campusName;
  const activeMapSubtitle = editMode ? mapSubtitleDraft || mapConfig.mapSubtitle : mapConfig.mapSubtitle;

  const renderMapBackdrop = () => {
    if (activeLayout === 'custom_image' && activeCustomImg) {
      return (
        <img
          src={activeCustomImg}
          alt={activeMapTitle}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }

    if (activeLayout === 'urban_grid') {
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <rect width="100" height="100" fill="#EDF2F7" />
          <path d="M 0 25 H 100 M 0 50 H 100 M 0 75 H 100" stroke="#CBD5E1" strokeWidth="2.4" />
          <path d="M 22 0 V 100 M 50 0 V 100 M 78 0 V 100" stroke="#CBD5E1" strokeWidth="2.4" />
          <rect x="26" y="29" width="20" height="17" rx="2" fill="#DCE8F5" stroke="#B6CBE3" strokeWidth="0.6" />
          <rect x="54" y="54" width="20" height="17" rx="2" fill="#E1EFE7" stroke="#BCE0CC" strokeWidth="0.6" />
        </svg>
      );
    }

    if (activeLayout === 'circular_courtyard') {
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <rect width="100" height="100" fill="#F1F5F9" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#CBD8E6" strokeWidth="2.2" />
          <circle cx="50" cy="50" r="19" fill="#E3F0EA" stroke="#C5DFD0" strokeWidth="1" />
          <path d="M 10 50 H 90 M 50 10 V 90" stroke="#D2DEE9" strokeWidth="1.4" />
        </svg>
      );
    }

    // Default classic_quad
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <pattern id="campus-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#DCE5EF" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#campus-grid)" />
        <path d="M 10 50 Q 50 42 90 52" fill="none" stroke="#CBD8E6" strokeWidth="2.5" />
        <path d="M 50 12 L 50 90" fill="none" stroke="#CBD8E6" strokeWidth="2.5" />
        <ellipse cx="48" cy="48" rx="18" ry="11" fill="#E3F0EA" stroke="#C5DFD0" strokeWidth="0.6" />
      </svg>
    );
  };

  const content = (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="map-loc-filter" className="text-xs font-semibold text-[#10243B]">
            Building / Zone:
          </label>
          <select
            id="map-loc-filter"
            value={selectedLocName}
            onChange={(e) => setSelectedLocName(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="All">All Campus Zones</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name} ({loc.buildingCode})
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlySecurityDesks}
              onChange={(e) => setOnlySecurityDesks(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Security Desks Only</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#16A36A]" />
            <span>Approximate building zones only; exact locker spots stay private.</span>
          </p>
          {canEditMap && (
            <button
              type="button"
              onClick={() => {
                if (!editMode) syncDraftsFromConfig();
                setEditMode((v) => !v);
                setPickTarget(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                editMode
                  ? 'bg-[#10243B] text-white'
                  : 'bg-[#1769AA] text-white hover:bg-[#12558B]'
              }`}
            >
              {editMode ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{editMode ? 'Close Map Editor' : 'Edit Map & Locations'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Spatial Campus Map */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-bold text-[#10243B]">{activeMapTitle}</h2>
              <p className="text-xs text-slate-500">{activeMapSubtitle}</p>
            </div>
            {pickTarget ? (
              <span className="text-xs font-semibold text-[#1769AA] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                Click anywhere on the map to set pin coordinates
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                {editMode ? 'Click a pin to edit it' : 'Click any building pin to filter reports'}
              </span>
            )}
          </div>

          <div
            ref={mapCanvasRef}
            onClick={handleCanvasClick}
            className={`relative aspect-[16/10] w-full rounded-xl border border-slate-200 bg-[#EEF3F8] overflow-hidden ${
              pickTarget ? 'cursor-crosshair ring-2 ring-[#1769AA]' : ''
            }`}
          >
            {renderMapBackdrop()}

            {/* Building Pins */}
            {visibleLocations.map((loc) => {
              const count = items.filter((i) => i.location === loc.name).length;
              const isSelected = editMode
                ? editingLocId === loc.id
                : selectedLocName === loc.name;
              const displayX =
                editMode && editingLocId === loc.id && typeof editForm.mapX === 'number'
                  ? editForm.mapX
                  : loc.mapX;
              const displayY =
                editMode && editingLocId === loc.id && typeof editForm.mapY === 'number'
                  ? editForm.mapY
                  : loc.mapY;

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (editMode) {
                      selectLocationForEdit(loc);
                    } else {
                      setSelectedLocName(isSelected ? 'All' : loc.name);
                    }
                  }}
                  style={{ left: `${displayX}%`, top: `${displayY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg border text-left transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#1769AA] ${
                    isSelected
                      ? 'bg-[#10243B] text-white border-[#10243B] shadow-md z-20'
                      : loc.hasSecurityDesk
                        ? 'bg-white text-[#10243B] border-[#16A36A] shadow-sm z-10'
                        : 'bg-white text-[#10243B] border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {loc.hasSecurityDesk ? (
                      <Shield className="w-3.5 h-3.5 shrink-0 text-[#16A36A]" />
                    ) : (
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-300' : 'text-[#1769AA]'}`} />
                    )}
                    <span className="text-xs font-bold">{loc.buildingCode}</span>
                    <span className="text-xs font-mono-num opacity-80">({count})</span>
                  </div>
                  <p className={`text-[10px] truncate max-w-[110px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {loc.name}
                  </p>
                </button>
              );
            })}

            {/* Preview pin for new location while picking/adding */}
            {editMode && editorTab === 'add' && (
              <div
                style={{ left: `${newLoc.mapX}%`, top: `${newLoc.mapY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-lg border-2 border-dashed border-[#1769AA] bg-blue-50/90 text-[#10243B] text-[10px] font-bold pointer-events-none z-30"
              >
                New Pin ({newLoc.mapX}%, {newLoc.mapY}%)
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {locations
              .filter((l) => l.hasSecurityDesk)
              .map((desk) => (
                <div key={desk.id} className="p-3 rounded-lg bg-[#F6F8FB] border border-slate-200">
                  <p className="font-bold text-[#10243B] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#16A36A]" />
                    <span>{desk.name}</span>
                  </p>
                  <p className="text-slate-500 mt-0.5">Hours: {desk.securityHours || '24/7'}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Right Panel: Map & Location Editor (when editMode) OR Nearby Reports List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          {editMode && canEditMap ? (
            <div className="space-y-4">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {[
                  { id: 'map', label: 'Map Layout' },
                  { id: 'edit', label: 'Edit Pin' },
                  { id: 'add', label: 'Add Location' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setEditorTab(t.id as 'map' | 'edit' | 'add');
                      setPickTarget(null);
                      setMapFormError(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      editorTab === t.id ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {mapFormError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {mapFormError}
                </div>
              )}

              {editorTab === 'map' && (
                <form onSubmit={handleSaveMapConfig} className="space-y-3">
                  <div>
                    <label htmlFor="map-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus Map Title
                    </label>
                    <input
                      id="map-title-input"
                      type="text"
                      value={campusNameDraft}
                      onChange={(e) => setCampusNameDraft(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="map-sub-input" className="block text-xs font-semibold text-slate-700 mb-1">
                      Map Subtitle
                    </label>
                    <input
                      id="map-sub-input"
                      type="text"
                      value={mapSubtitleDraft}
                      onChange={(e) => setMapSubtitleDraft(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="map-layout-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Map Layout Preset
                    </label>
                    <select
                      id="map-layout-select"
                      value={layoutDraft}
                      onChange={(e) => setLayoutDraft(e.target.value as CampusMapLayout)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {LAYOUT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {layoutDraft === 'custom_image' && (
                    <div className="space-y-2 p-3 rounded-lg bg-[#F6F8FB] border border-slate-200">
                      <label htmlFor="map-img-url" className="block text-xs font-semibold text-slate-700">
                        Custom Map Image URL
                      </label>
                      <input
                        id="map-img-url"
                        type="url"
                        value={customImageDraft}
                        onChange={(e) => setCustomImageDraft(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1769AA] cursor-pointer">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Or upload campus floorplan/map image</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCustomMapUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] inline-flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Map Settings</span>
                  </button>
                </form>
              )}

              {editorTab === 'edit' && (
                <form onSubmit={handleUpdateLocationSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="edit-loc-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Building Pin
                    </label>
                    <select
                      id="edit-loc-select"
                      value={editingLocId}
                      onChange={(e) => {
                        const found = locations.find((l) => l.id === e.target.value);
                        if (found) selectLocationForEdit(found);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.buildingCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Building Name</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Building Code</label>
                      <input
                        type="text"
                        value={editForm.buildingCode || ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, buildingCode: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Campus Zone</label>
                    <input
                      type="text"
                      value={editForm.zone || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, zone: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Map X (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={editForm.mapX ?? 50}
                        onChange={(e) => setEditForm((p) => ({ ...p, mapX: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Map Y (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={editForm.mapY ?? 50}
                        onChange={(e) => setEditForm((p) => ({ ...p, mapY: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickTarget(pickTarget === 'edit' ? null : 'edit')}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1 ${
                        pickTarget === 'edit'
                          ? 'bg-[#10243B] text-white border-[#10243B]'
                          : 'bg-blue-50 text-[#1769AA] border-blue-200'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Pick Pin</span>
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.hasSecurityDesk)}
                      onChange={(e) => setEditForm((p) => ({ ...p, hasSecurityDesk: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span>Has Security Custody Desk</span>
                  </label>

                  {editForm.hasSecurityDesk && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Security Desk Hours</label>
                      <input
                        type="text"
                        value={editForm.securityHours || ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, securityHours: e.target.value }))}
                        placeholder="08:00 - 20:00 or 24/7"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] inline-flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Pin</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedLocation}
                      className="py-2 px-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </form>
              )}

              {editorTab === 'add' && (
                <form onSubmit={handleAddLocationSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="new-loc-name" className="block text-xs font-medium text-slate-700 mb-1">
                        Location Name *
                      </label>
                      <input
                        id="new-loc-name"
                        type="text"
                        value={newLoc.name}
                        onChange={(e) => setNewLoc((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Innovation Hub"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-loc-code" className="block text-xs font-medium text-slate-700 mb-1">
                        Building Code *
                      </label>
                      <input
                        id="new-loc-code"
                        type="text"
                        value={newLoc.buildingCode}
                        onChange={(e) => setNewLoc((p) => ({ ...p, buildingCode: e.target.value }))}
                        placeholder="INV-01"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="new-loc-zone" className="block text-xs font-medium text-slate-700 mb-1">
                      Campus Zone
                    </label>
                    <input
                      id="new-loc-zone"
                      type="text"
                      value={newLoc.zone}
                      onChange={(e) => setNewLoc((p) => ({ ...p, zone: e.target.value }))}
                      placeholder="East Quad"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Map X (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={newLoc.mapX}
                        onChange={(e) => setNewLoc((p) => ({ ...p, mapX: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Map Y (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={newLoc.mapY}
                        onChange={(e) => setNewLoc((p) => ({ ...p, mapY: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickTarget(pickTarget === 'new' ? null : 'new')}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1 ${
                        pickTarget === 'new'
                          ? 'bg-[#10243B] text-white border-[#10243B]'
                          : 'bg-blue-50 text-[#1769AA] border-blue-200'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Click Map</span>
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(newLoc.hasSecurityDesk)}
                      onChange={(e) => setNewLoc((p) => ({ ...p, hasSecurityDesk: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span>Has Security Custody Desk</span>
                  </label>

                  {newLoc.hasSecurityDesk && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Security Desk Hours</label>
                      <input
                        type="text"
                        value={newLoc.securityHours || ''}
                        onChange={(e) => setNewLoc((p) => ({ ...p, securityHours: e.target.value }))}
                        placeholder="08:00 - 20:00"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#16A36A] rounded-lg hover:bg-[#128757] inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Location Pin</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#10243B]">
                  {selectedLocName === 'All' ? 'All Campus Zone Reports' : `Reports near ${selectedLocName}`}
                </h2>
                <span className="text-xs font-mono-num text-slate-500">{nearbyReports.length} items</span>
              </div>

              {nearbyReports.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No active lost or found reports in this building zone.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[430px]">
                  {nearbyReports.map((item) => (
                    <div key={item.itemId} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          {item.type.toUpperCase()} · {item.status} · {item.location}
                        </p>
                        <p className="text-sm font-semibold text-[#10243B] truncate">{item.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#1769AA] hover:bg-blue-50 rounded-lg shrink-0"
                      >
                        Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );

  if (currentUser) {
    return (
      <AppShell
        title="Campus Map & Security Desks"
        subtitle="Explore approximate item locations, security desks, and editable campus zones"
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
          <h1 className="text-2xl font-bold text-[#10243B]">Campus Map & Security Desks</h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect approximate campus building reports and security custody locations.
          </p>
        </div>
        {content}
      </main>
    </div>
  );
};
