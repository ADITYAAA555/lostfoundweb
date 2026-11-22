export type UserRole = 'student' | 'admin' | 'security';

export type ItemType = 'lost' | 'found';

export type ItemStatus =
  | 'Lost'
  | 'Found'
  | 'Matched'
  | 'Claim Pending'
  | 'Handed to Security'
  | 'Returned'
  | 'Closed';

export type HandoverPreference = 'safe_return' | 'security_desk' | 'anonymous';

export type ClaimVerificationStatus =
  | 'Pending'
  | 'Finder Approved'
  | 'Admin Approved'
  | 'Security Verified'
  | 'Rejected'
  | 'Disputed'
  | 'Completed';

export type NotificationType =
  | 'match'
  | 'claim'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'xp'
  | 'badge'
  | 'rank'
  | 'admin';

export type MatchTier = 'Strong potential match' | 'Possible match' | 'Low priority';

export interface CampusUser {
  userId: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  role: UserRole;
  totalXP: number;
  successfulReturns: number;
  badges: string[];
  publicLeaderboardConsent: boolean;
  avatarUrl?: string;
  phone?: string;
  emailVerified?: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export interface ItemReport {
  itemId: string;
  type: ItemType;
  title: string;
  category: string;
  brand: string;
  color: string;
  description: string;
  privateFeatures?: string; // Only populated for owner, admin, or security staff
  exactLocationNote?: string; // Only populated for owner, admin, or security staff
  imageURL?: string;
  location: string;
  latitude: number;
  longitude: number;
  eventDate: string; // ISO date or datetime string when lost/found
  reportedBy: string;
  reporterDisplay: string;
  isAnonymous: boolean;
  handoverPreference?: HandoverPreference;
  status: ItemStatus;
  statusHistory?: Array<{ status: ItemStatus; timestamp: string; note?: string }>;
  textEmbedding?: number[];
  imageEmbedding?: number[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SmartMatch {
  matchId: string;
  lostItemId: string;
  foundItemId: string;
  lostOwnerId: string;
  foundReporterId: string;
  textScore: number;
  imageScore: number;
  attributeScore: number;
  locationTimeScore: number;
  combinedScore: number;
  tier: MatchTier;
  reasons: string[];
  aiMode: 'gemini-live' | 'deterministic-fallback';
  status: 'pending' | 'reviewed' | 'claimed' | 'dismissed';
  createdAt: string;
}

export interface OwnershipClaim {
  claimId: string;
  itemId: string;
  itemOwnerId: string;
  claimantId: string;
  claimantName?: string;
  claimantDepartment?: string;
  answers: string;
  privateDetailAttempt: string;
  evidenceURL?: string;
  verificationStatus: ClaimVerificationStatus;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RewardTransaction {
  rewardId: string;
  userId: string;
  activity: string;
  eventType: 'found_report' | 'successful_return' | 'five_returns_bonus' | 'admin_adjustment' | 'fraud_penalty';
  points: number;
  relatedItemId?: string;
  createdAt: string;
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  xpCost: number;
  partner: string;
  category: 'Dining' | 'Campus Store' | 'Recognition';
  stockLabel: string;
}

export interface RewardRedemption {
  redemptionId: string;
  userId: string;
  rewardTitle: string;
  xpCost: number;
  voucherCode: string;
  status: 'Active' | 'Used';
  createdAt: string;
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedPath?: string;
  createdAt: string;
}

export interface SecurityHandover {
  handoverId: string;
  referenceCode: string;
  itemId: string;
  receivingStaffId: string;
  receivingStaffName: string;
  storageLocation: string;
  handoverDate: string;
  collectionDate?: string;
  collectedByUserId?: string;
  collectedByName?: string;
  status: 'In Custody' | 'Claim Under Review' | 'Collected' | 'Archived';
}

export interface AuditLogEntry {
  logId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  createdAt: string;
}

export interface ModerationReport {
  reportId: string;
  reporterId: string;
  targetItemId?: string;
  targetUserId?: string;
  reason: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Dismissed';
  createdAt: string;
}

export interface CampusLocation {
  id: string;
  name: string;
  zone: string;
  buildingCode: string;
  latitude: number;
  longitude: number;
  mapX: number; // 0-100 percentage for SVG campus map
  mapY: number; // 0-100 percentage for SVG campus map
  hasSecurityDesk?: boolean;
  securityHours?: string;
}

export type CampusMapLayout = 'classic_quad' | 'urban_grid' | 'circular_courtyard' | 'custom_image';

export interface CampusMapConfig {
  campusName: string;
  mapSubtitle: string;
  layoutStyle: CampusMapLayout;
  customMapImageURL?: string;
  updatedAt?: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  requiredReturns: number;
  tier: 'Starter' | 'Bronze' | 'Silver' | 'Gold' | 'Legend' | 'Integrity';
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  subject: string;
  category: 'General Inquiry' | 'Security Desk' | 'Suspicious Activity' | 'Technical Bug' | 'Feedback';
  message: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
}
