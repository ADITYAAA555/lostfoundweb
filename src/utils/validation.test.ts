import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionStatus,
  sanitizeItemForViewer,
  validateImageFile,
  validateItemReportInput,
} from './validation';
import type { CampusUser, ItemReport } from '../types/campusfind';

const item: ItemReport = {
  itemId: 'item_1',
  type: 'found',
  title: 'Black Leather Wallet',
  category: 'Wallets & Cards',
  brand: 'Bellroy',
  color: 'Black',
  description: 'Found near 2nd floor study carrels.',
  privateFeatures: 'Contains student transit pass ending 4421 and $20 bill.',
  exactLocationNote: 'Under desk #14 near east window.',
  location: 'Central Library',
  latitude: 37.42,
  longitude: -122.17,
  eventDate: '2026-11-20T12:00:00Z',
  reportedBy: 'u_finder',
  reporterDisplay: 'Alex Rivera',
  isAnonymous: true,
  status: 'Found',
  createdAt: '2026-11-20T12:15:00Z',
};

const otherStudent: CampusUser = {
  userId: 'u_other',
  name: 'Sam',
  email: 'sam@campus.edu',
  studentId: 'STU-99',
  department: 'Design',
  role: 'student',
  totalXP: 0,
  successfulReturns: 0,
  badges: [],
  publicLeaderboardConsent: true,
  createdAt: '2026-10-01T00:00:00Z',
};

const adminUser: CampusUser = { ...otherStudent, userId: 'u_admin', role: 'admin' };

test('sanitizeItemForViewer strips privateFeatures and hides anonymous identity from other students', () => {
  const pubView = sanitizeItemForViewer(item, otherStudent);
  assert.equal(pubView.privateFeatures, undefined);
  assert.equal(pubView.exactLocationNote, undefined);
  assert.equal(pubView.reporterDisplay, 'Anonymous Campus Finder');

  const adminView = sanitizeItemForViewer(item, adminUser);
  assert.equal(adminView.privateFeatures, item.privateFeatures);
  assert.equal(adminView.reporterDisplay, 'Alex Rivera');
});

test('validateItemReportInput rejects empty required fields', () => {
  const res = validateItemReportInput({
    title: 'A',
    category: '',
    color: '',
    description: 'short',
    location: '',
    eventDate: '',
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.title);
  assert.ok(res.errors.description);
});

test('validateImageFile enforces allowed MIME types and 5MB cap', () => {
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 1024 }).valid, true);
  assert.equal(validateImageFile({ type: 'application/pdf', size: 1024 }).valid, false);
  assert.equal(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 }).valid, false);
});

test('canTransitionStatus blocks invalid reversals after Closed', () => {
  assert.equal(canTransitionStatus('Found', 'Handed to Security'), true);
  assert.equal(canTransitionStatus('Returned', 'Closed'), true);
  assert.equal(canTransitionStatus('Closed', 'Lost'), false);
});
