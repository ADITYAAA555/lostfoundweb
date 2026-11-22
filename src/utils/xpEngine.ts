import type {
  BadgeDefinition,
  CampusUser,
  RewardRedemption,
  RewardTransaction,
} from '../types/campusfind';

export const XP_RULES = {
  VALID_FOUND_REPORT: 10,
  VERIFIED_SUCCESSFUL_RETURN: 100,
  FIVE_RETURNS_BONUS: 100,
} as const;

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'first_helper',
    name: 'First Helper',
    description: 'Completed your first verified campus item return.',
    requiredReturns: 1,
    tier: 'Starter',
  },
  {
    id: 'bronze_hero',
    name: 'Bronze Hero',
    description: 'Successfully returned 3 lost belongings to fellow students.',
    requiredReturns: 3,
    tier: 'Bronze',
  },
  {
    id: 'silver_hero',
    name: 'Silver Hero',
    description: 'Successfully returned 10 items across campus departments.',
    requiredReturns: 10,
    tier: 'Silver',
  },
  {
    id: 'gold_hero',
    name: 'Gold Hero',
    description: 'Achieved 20 verified item recoveries with trusted standing.',
    requiredReturns: 20,
    tier: 'Gold',
  },
  {
    id: 'campus_legend',
    name: 'Campus Legend',
    description: 'Returned 25+ belongings and mentored campus community integrity.',
    requiredReturns: 25,
    tier: 'Legend',
  },
  {
    id: 'trustworthy_finder',
    name: 'Trustworthy Finder',
    description: 'Consistent verified contributions (3+ returns with zero fraud flags).',
    requiredReturns: 3,
    tier: 'Integrity',
  },
];

export function hasDuplicateReward(
  existingRewards: RewardTransaction[],
  userId: string,
  relatedItemId: string,
  eventType: RewardTransaction['eventType']
): boolean {
  return existingRewards.some(
    (r) => r.userId === userId && r.relatedItemId === relatedItemId && r.eventType === eventType
  );
}

export function computeUnlockedBadges(
  successfulReturns: number,
  fraudPenaltyCount = 0
): string[] {
  const unlocked: string[] = [];
  if (successfulReturns >= 1) unlocked.push('First Helper');
  if (successfulReturns >= 3) unlocked.push('Bronze Hero');
  if (successfulReturns >= 10) unlocked.push('Silver Hero');
  if (successfulReturns >= 20) unlocked.push('Gold Hero');
  if (successfulReturns >= 25) unlocked.push('Campus Legend');
  if (successfulReturns >= 3 && fraudPenaltyCount === 0) unlocked.push('Trustworthy Finder');
  return unlocked;
}

export interface AwardCalculationResult {
  newTransactions: RewardTransaction[];
  pointsAdded: number;
  newTotalXP: number;
  newSuccessfulReturns: number;
  newBadges: string[];
  newlyUnlockedBadges: string[];
  duplicateBlocked: boolean;
}

export function calculateRewardAward(params: {
  user: CampusUser;
  eventType: 'found_report' | 'successful_return';
  itemId: string;
  itemTitle: string;
  existingRewards: RewardTransaction[];
  nowIso?: string;
}): AwardCalculationResult {
  const { user, eventType, itemId, itemTitle, existingRewards } = params;
  const now = params.nowIso ?? new Date().toISOString();

  if (hasDuplicateReward(existingRewards, user.userId, itemId, eventType)) {
    return {
      newTransactions: [],
      pointsAdded: 0,
      newTotalXP: user.totalXP,
      newSuccessfulReturns: user.successfulReturns,
      newBadges: user.badges,
      newlyUnlockedBadges: [],
      duplicateBlocked: true,
    };
  }

  const transactions: RewardTransaction[] = [];
  let pointsAdded = 0;
  let newSuccessfulReturns = user.successfulReturns;

  if (eventType === 'found_report') {
    pointsAdded = XP_RULES.VALID_FOUND_REPORT;
    transactions.push({
      rewardId: `rew_${user.userId}_${itemId}_found`,
      userId: user.userId,
      activity: `Valid found item report: ${itemTitle}`,
      eventType: 'found_report',
      points: XP_RULES.VALID_FOUND_REPORT,
      relatedItemId: itemId,
      createdAt: now,
    });
  } else if (eventType === 'successful_return') {
    pointsAdded = XP_RULES.VERIFIED_SUCCESSFUL_RETURN;
    newSuccessfulReturns += 1;
    transactions.push({
      rewardId: `rew_${user.userId}_${itemId}_return`,
      userId: user.userId,
      activity: `Verified successful return: ${itemTitle}`,
      eventType: 'successful_return',
      points: XP_RULES.VERIFIED_SUCCESSFUL_RETURN,
      relatedItemId: itemId,
      createdAt: now,
    });

    // Five successful returns milestone bonus (+100 bonus XP)
    if (
      newSuccessfulReturns > 0 &&
      newSuccessfulReturns % 5 === 0 &&
      !hasDuplicateReward(existingRewards, user.userId, `milestone_${newSuccessfulReturns}`, 'five_returns_bonus')
    ) {
      pointsAdded += XP_RULES.FIVE_RETURNS_BONUS;
      transactions.push({
        rewardId: `rew_${user.userId}_milestone_${newSuccessfulReturns}`,
        userId: user.userId,
        activity: `${newSuccessfulReturns} Successful Returns Milestone Bonus`,
        eventType: 'five_returns_bonus',
        points: XP_RULES.FIVE_RETURNS_BONUS,
        relatedItemId: `milestone_${newSuccessfulReturns}`,
        createdAt: now,
      });
    }
  }

  const fraudCount = existingRewards.filter(
    (r) => r.userId === user.userId && r.eventType === 'fraud_penalty'
  ).length;

  const newBadges = computeUnlockedBadges(newSuccessfulReturns, fraudCount);
  const newlyUnlockedBadges = newBadges.filter((b) => !user.badges.includes(b));

  return {
    newTransactions: transactions,
    pointsAdded,
    newTotalXP: user.totalXP + pointsAdded,
    newSuccessfulReturns,
    newBadges,
    newlyUnlockedBadges,
    duplicateBlocked: false,
  };
}

export function getAvailableXP(totalXP: number, redemptions: RewardRedemption[], userId: string): number {
  const spent = redemptions
    .filter((r) => r.userId === userId)
    .reduce((acc, r) => acc + r.xpCost, 0);
  return Math.max(0, totalXP - spent);
}

export function buildLeaderboard(
  users: CampusUser[],
  options?: { department?: string; includePrivate?: boolean; limit?: number }
): Array<{
  rank: number;
  userId: string;
  displayName: string;
  department: string;
  totalXP: number;
  successfulReturns: number;
  badges: string[];
  isConsentPublic: boolean;
}> {
  const filtered = users.filter((u) => {
    if (u.role !== 'student') return false;
    if (options?.department && options.department !== 'All' && u.department !== options.department) {
      return false;
    }
    return options?.includePrivate ? true : u.publicLeaderboardConsent;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (b.totalXP !== a.totalXP) return b.totalXP - a.totalXP;
    return b.successfulReturns - a.successfulReturns;
  });

  const limited = options?.limit ? sorted.slice(0, options.limit) : sorted;

  return limited.map((u, idx) => ({
    rank: idx + 1,
    userId: u.userId,
    displayName: u.publicLeaderboardConsent ? u.name : 'Anonymous Campus Hero',
    department: u.department,
    totalXP: u.totalXP,
    successfulReturns: u.successfulReturns,
    badges: u.badges,
    isConsentPublic: u.publicLeaderboardConsent,
  }));
}
