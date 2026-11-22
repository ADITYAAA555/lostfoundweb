import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCombinedScore,
  cosineSimilarityScore,
  evaluateItemPair,
  findCandidateMatches,
  getMatchTier,
} from './matchingEngine';
import type { ItemReport } from '../types/campusfind';

const makeItem = (overrides: Partial<ItemReport>): ItemReport => ({
  itemId: 'item_1',
  type: 'lost',
  title: 'Black Leather Wallet',
  category: 'Wallets & Cards',
  brand: 'Bellroy',
  color: 'Black',
  description: 'Black pebbled leather bifold wallet with student transit pass inside.',
  location: 'Central Library',
  latitude: 37.4275,
  longitude: -122.1697,
  eventDate: '2026-11-20T14:00:00Z',
  reportedBy: 'user_1',
  reporterDisplay: 'Maya Lin',
  isAnonymous: false,
  status: 'Lost',
  createdAt: '2026-11-20T14:30:00Z',
  ...overrides,
});

test('cosineSimilarityScore handles identical, orthogonal, and mismatched vectors', () => {
  assert.equal(cosineSimilarityScore([1, 0, 0], [1, 0, 0]), 100);
  assert.equal(cosineSimilarityScore([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarityScore([1, 2], [1]), 0);
  assert.equal(cosineSimilarityScore([], []), 0);
});

test('computeCombinedScore uses exact 0.35 / 0.30 / 0.20 / 0.15 weights', () => {
  assert.equal(
    computeCombinedScore({
      textScore: 100,
      imageScore: 100,
      attributeScore: 100,
      locationTimeScore: 100,
    }),
    100
  );
  // 80*0.35 (28) + 60*0.30 (18) + 100*0.20 (20) + 100*0.15 (15) = 81
  assert.equal(
    computeCombinedScore({
      textScore: 80,
      imageScore: 60,
      attributeScore: 100,
      locationTimeScore: 100,
    }),
    81
  );
});

test('getMatchTier maps thresholds accurately', () => {
  assert.equal(getMatchTier(85), 'Strong potential match');
  assert.equal(getMatchTier(80), 'Strong potential match');
  assert.equal(getMatchTier(79), 'Possible match');
  assert.equal(getMatchTier(60), 'Possible match');
  assert.equal(getMatchTier(59), 'Low priority');
});

test('evaluateItemPair ranks matching wallet higher than unrelated bottle', () => {
  const lostWallet = makeItem({ itemId: 'lost_w', type: 'lost' });
  const foundWallet = makeItem({
    itemId: 'found_w',
    type: 'found',
    status: 'Found',
    reportedBy: 'user_2',
    eventDate: '2026-11-20T16:00:00Z',
    textEmbedding: [0.9, 0.4, 0.1],
    imageEmbedding: [0.85, 0.5, 0.2],
  });
  lostWallet.textEmbedding = [0.9, 0.4, 0.1];
  lostWallet.imageEmbedding = [0.85, 0.5, 0.2];

  const foundBottle = makeItem({
    itemId: 'found_b',
    type: 'found',
    status: 'Found',
    title: 'Navy Hydro Flask Water Bottle',
    category: 'Bottles & Drinkware',
    brand: 'Hydro Flask',
    color: 'Blue',
    description: 'Insulated blue steel bottle left in Main Cafeteria.',
    location: 'Main Cafeteria',
    latitude: 37.432,
    longitude: -122.175,
    reportedBy: 'user_3',
    textEmbedding: [0.1, 0.2, 0.95],
    imageEmbedding: [0.1, 0.1, 0.98],
  });

  const matches = findCandidateMatches(lostWallet, [foundBottle, foundWallet], 0);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].foundItemId, 'found_w');
  assert.ok(matches[0].combinedScore >= 90);
  assert.equal(matches[0].tier, 'Strong potential match');
  assert.ok(matches[1].combinedScore < 40);
});
