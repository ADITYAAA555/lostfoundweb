import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLeaderboard,
  calculateRewardAward,
  computeUnlockedBadges,
  getAvailableXP,
} from './xpEngine';
import type { CampusUser, RewardRedemption, RewardTransaction } from '../types/campusfind';

const baseUser: CampusUser = {
  userId: 'u_maya',
  name: 'Maya Lin',
  email: 'maya@campus.edu',
  studentId: 'STU-2026-104',
  department: 'Computer Science',
  role: 'student',
  totalXP: 400,
  successfulReturns: 4,
  badges: ['First Helper', 'Bronze Hero', 'Trustworthy Finder'],
  publicLeaderboardConsent: true,
  createdAt: '2026-09-01T10:00:00Z',
};

test('calculateRewardAward prevents duplicate rewards for same item and event', () => {
  const existing: RewardTransaction[] = [
    {
      rewardId: 'rew_1',
      userId: 'u_maya',
      activity: 'Verified successful return: Wallet',
      eventType: 'successful_return',
      points: 100,
      relatedItemId: 'item_99',
      createdAt: '2026-11-18T10:00:00Z',
    },
  ];

  const dup = calculateRewardAward({
    user: baseUser,
    eventType: 'successful_return',
    itemId: 'item_99',
    itemTitle: 'Wallet',
    existingRewards: existing,
  });

  assert.equal(dup.duplicateBlocked, true);
  assert.equal(dup.pointsAdded, 0);
  assert.equal(dup.newTransactions.length, 0);
});

test('calculateRewardAward grants +100 return XP and +100 milestone bonus on 5th return', () => {
  const res = calculateRewardAward({
    user: baseUser,
    eventType: 'successful_return',
    itemId: 'item_5th',
    itemTitle: 'Earbuds',
    existingRewards: [],
  });

  assert.equal(res.duplicateBlocked, false);
  assert.equal(res.pointsAdded, 200);
  assert.equal(res.newTotalXP, 600);
  assert.equal(res.newSuccessfulReturns, 5);
  assert.equal(res.newTransactions.length, 2);
});

test('computeUnlockedBadges respects fraud penalties and milestones', () => {
  assert.deepEqual(computeUnlockedBadges(1, 0), ['First Helper']);
  assert.deepEqual(computeUnlockedBadges(3, 0), ['First Helper', 'Bronze Hero', 'Trustworthy Finder']);
  assert.deepEqual(computeUnlockedBadges(3, 1), ['First Helper', 'Bronze Hero']);
  assert.ok(computeUnlockedBadges(25, 0).includes('Campus Legend'));
});

test('getAvailableXP deducts redemptions safely without negative balance', () => {
  const redemptions: RewardRedemption[] = [
    {
      redemptionId: 'red_1',
      userId: 'u_maya',
      rewardTitle: 'Free Campus Coffee',
      xpCost: 150,
      voucherCode: 'CF-COFFEE-1',
      status: 'Active',
      createdAt: '2026-11-19T12:00:00Z',
    },
  ];
  assert.equal(getAvailableXP(400, redemptions, 'u_maya'), 250);
  assert.equal(getAvailableXP(100, redemptions, 'u_maya'), 0);
});

test('buildLeaderboard hides non-consenting students by default', () => {
  const privateStudent: CampusUser = {
    ...baseUser,
    userId: 'u_priv',
    name: 'Hidden Student',
    totalXP: 900,
    publicLeaderboardConsent: false,
  };
  const board = buildLeaderboard([baseUser, privateStudent]);
  assert.equal(board.length, 1);
  assert.equal(board[0].userId, 'u_maya');
});
