import type {
  AppNotification,
  AuditLogEntry,
  CampusLocation,
  CampusMapConfig,
  CampusUser,
  ItemReport,
  ModerationReport,
  OwnershipClaim,
  RewardRedemption,
  RewardTransaction,
  SecurityHandover,
  SmartMatch,
  SupportTicket,
} from '../types/campusfind';
import {
  CAMPUS_LOCATIONS,
  DEFAULT_MAP_CONFIG,
  ITEM_CATEGORIES,
} from './campusLocations';

export interface WorkspaceStoreState {
  users: CampusUser[];
  localCredentials: Record<string, string>; // email (lowercase) -> password
  items: ItemReport[];
  matches: SmartMatch[];
  claims: OwnershipClaim[];
  rewards: RewardTransaction[];
  redemptions: RewardRedemption[];
  notifications: AppNotification[];
  handovers: SecurityHandover[];
  auditLogs: AuditLogEntry[];
  moderationReports: ModerationReport[];
  supportTickets: SupportTicket[];
  categories: string[];
  locations: CampusLocation[];
  mapConfig: CampusMapConfig;
}

export function createInitialWorkspaceState(): WorkspaceStoreState {
  return {
    users: [],
    localCredentials: {},
    items: [],
    matches: [],
    claims: [],
    rewards: [],
    redemptions: [],
    notifications: [],
    handovers: [],
    auditLogs: [],
    moderationReports: [],
    supportTickets: [],
    categories: [...ITEM_CATEGORIES],
    locations: structuredClone(CAMPUS_LOCATIONS),
    mapConfig: structuredClone(DEFAULT_MAP_CONFIG),
  };
}
