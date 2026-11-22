import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../firebase';
import {
  CAMPUS_LOCATIONS,
  DEFAULT_MAP_CONFIG,
  REWARD_CATALOG,
} from '../data/campusLocations';
import {
  createInitialWorkspaceState,
  type WorkspaceStoreState,
} from '../data/demoSeed';
import type {
  AppNotification,
  AuditLogEntry,
  CampusLocation,
  CampusMapConfig,
  CampusUser,
  ClaimVerificationStatus,
  HandoverPreference,
  ItemReport,
  ItemStatus,
  ItemType,
  ModerationReport,
  OwnershipClaim,
  RewardCatalogItem,
  RewardRedemption,
  RewardTransaction,
  SecurityHandover,
  SmartMatch,
  SupportTicket,
  UserRole,
} from '../types/campusfind';
import { sanitizeItemForViewer } from '../utils/validation';
import { calculateRewardAward } from '../utils/xpEngine';

const WORKSPACE_STORAGE_KEY = 'campusfind_workspace_state_v2';
const ACTIVE_USER_STORAGE_KEY = 'campusfind_active_uid_v2';

export interface AIStatusInfo {
  geminiConfigured: boolean;
  visionModel: string;
  embeddingModel: string;
  mode: 'gemini-live' | 'deterministic-fallback';
}

interface NewItemInput {
  type: ItemType;
  title: string;
  category: string;
  brand: string;
  color: string;
  description: string;
  privateFeatures: string;
  exactLocationNote?: string;
  imageURL?: string;
  location: string;
  eventDate: string;
  isAnonymous?: boolean;
  handoverPreference?: HandoverPreference;
}

interface AppContextValue {
  mode: 'local' | 'live';
  authReady: boolean;
  aiStatus: AIStatusInfo;
  currentUser: CampusUser | null;
  users: CampusUser[];
  items: ItemReport[];
  rawItemsForPrivileged: ItemReport[];
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
  rewardCatalog: RewardCatalogItem[];
  unreadNotificationCount: number;
  statusBanner: { type: 'success' | 'error' | 'info'; message: string } | null;
  clearStatusBanner: () => void;

  // Auth
  loginWithEmail: (
    email: string,
    password: string
  ) => { ok: boolean; error?: string; role?: UserRole };
  registerAccount: (input: {
    name: string;
    email: string;
    studentId: string;
    department: string;
    role: UserRole;
    password: string;
  }) => { ok: boolean; error?: string };
  resetLocalPassword: (email: string, newPassword: string) => { ok: boolean; error?: string };
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Items & Matching
  submitItemReport: (input: NewItemInput) => Promise<{ item: ItemReport; newMatches: SmartMatch[] }>;
  updateItemReport: (itemId: string, patch: Partial<ItemReport>) => Promise<void>;
  closeItemReport: (itemId: string) => Promise<void>;
  runMatchingForItem: (itemId: string) => Promise<SmartMatch[]>;

  // Claims
  submitClaim: (input: {
    itemId: string;
    answers: string;
    privateDetailAttempt: string;
    evidenceURL?: string;
  }) => Promise<OwnershipClaim>;
  reviewClaim: (
    claimId: string,
    decision: 'Finder Approved' | 'Admin Approved' | 'Security Verified' | 'Completed' | 'Rejected' | 'Disputed',
    reviewNote?: string
  ) => Promise<void>;

  // Security
  registerSecurityHandover: (input: {
    itemId: string;
    storageLocation: string;
  }) => Promise<SecurityHandover>;
  confirmSecurityCollection: (handoverId: string, collectedByUserId?: string) => Promise<void>;

  // Rewards & Profile
  redeemReward: (catalogItem: RewardCatalogItem) => Promise<RewardRedemption | null>;
  updateProfile: (patch: {
    name?: string;
    department?: string;
    studentId?: string;
    phone?: string;
    publicLeaderboardConsent?: boolean;
  }) => Promise<void>;

  // Notifications
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Admin, Map & Support
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  updateMapConfig: (patch: Partial<CampusMapConfig>) => Promise<void>;
  addLocation: (loc: Omit<CampusLocation, 'id'>) => Promise<CampusLocation>;
  updateLocation: (id: string, patch: Partial<CampusLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => void;
  submitModerationReport: (input: {
    targetItemId?: string;
    targetUserId?: string;
    reason: string;
  }) => Promise<void>;
  updateModerationStatus: (reportId: string, status: ModerationReport['status']) => void;
  submitSupportTicket: (input: {
    subject: string;
    category: SupportTicket['category'];
    message: string;
  }) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function loadWorkspaceState(): WorkspaceStoreState {
  try {
    // Purge legacy seeded demo cache so old default items/users never reappear
    localStorage.removeItem('campusfind_demo_state_v1');
    localStorage.removeItem('campusfind_demo_active_uid_v1');
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceStoreState>;
      const base = createInitialWorkspaceState();
      if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.users)) {
        return {
          ...base,
          ...parsed,
          localCredentials: parsed.localCredentials || {},
          locations: Array.isArray(parsed.locations) ? parsed.locations : base.locations,
          mapConfig: parsed.mapConfig ? { ...base.mapConfig, ...parsed.mapConfig } : base.mapConfig,
        };
      }
    }
  } catch {
    // Fallback to clean empty state
  }
  return createInitialWorkspaceState();
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceStoreState>(() => loadWorkspaceState());
  const [activeLocalUid, setActiveLocalUid] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [liveUserProfile, setLiveUserProfile] = useState<CampusUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Live Firestore collections (isolated from local workspace state)
  const [liveUsers, setLiveUsers] = useState<CampusUser[]>([]);
  const [liveItems, setLiveItems] = useState<ItemReport[]>([]);
  const [liveMatches, setLiveMatches] = useState<SmartMatch[]>([]);
  const [liveClaims, setLiveClaims] = useState<OwnershipClaim[]>([]);
  const [liveRewards, setLiveRewards] = useState<RewardTransaction[]>([]);
  const [liveRedemptions, setLiveRedemptions] = useState<RewardRedemption[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<AppNotification[]>([]);
  const [liveHandovers, setLiveHandovers] = useState<SecurityHandover[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLogEntry[]>([]);
  const [liveModeration, setLiveModeration] = useState<ModerationReport[]>([]);
  const [liveLocations, setLiveLocations] = useState<CampusLocation[] | null>(null);
  const [liveMapConfig, setLiveMapConfig] = useState<CampusMapConfig | null>(null);

  const [aiStatus, setAiStatus] = useState<AIStatusInfo>({
    geminiConfigured: false,
    visionModel: 'gemini-4-hydrogen',
    embeddingModel: 'gemini-embedding-2',
    mode: 'deterministic-fallback',
  });

  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const clearStatusBanner = useCallback(() => setStatusBanner(null), []);

  // Persist local workspace state cleanly in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceState));
    } catch {
      // Ignore storage quota errors
    }
  }, [workspaceState]);

  useEffect(() => {
    try {
      if (activeLocalUid) {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeLocalUid);
      } else {
        localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, [activeLocalUid]);

  // Check Gemini backend status on boot
  useEffect(() => {
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.geminiConfigured === 'boolean') {
          setAiStatus(data);
        }
      })
      .catch(() => {
        // Keep deterministic fallback status
      });
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setActiveLocalUid(null);
        void testFirestoreConnection();
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as CampusUser;
            const privSnap = await getDoc(doc(db, 'users', fbUser.uid, 'private', 'profile'));
            const priv = privSnap.exists() ? privSnap.data() : {};
            setLiveUserProfile({
              ...data,
              email: priv.email || fbUser.email || '',
              studentId: priv.studentId || 'PENDING-ID',
              phone: priv.phone,
              emailVerified: fbUser.emailVerified,
              isDemo: false,
            });
          } else {
            const isBootAdmin = fbUser.email === BOOTSTRAPPED_ADMIN_EMAIL && fbUser.emailVerified;
            const initialRole: UserRole = isBootAdmin ? 'admin' : 'student';
            const nowIso = new Date().toISOString();
            const newPub = {
              userId: fbUser.uid,
              name: fbUser.displayName || 'Campus Member',
              department: 'Computer Science',
              role: initialRole,
              totalXP: 0,
              successfulReturns: 0,
              badges: [] as string[],
              publicLeaderboardConsent: true,
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newPub);
            await setDoc(doc(db, 'users', fbUser.uid, 'private', 'profile'), {
              userId: fbUser.uid,
              email: fbUser.email || '',
              studentId: `STU-${fbUser.uid.slice(0, 6).toUpperCase()}`,
              updatedAt: serverTimestamp(),
            });
            setLiveUserProfile({
              userId: fbUser.uid,
              name: newPub.name,
              email: fbUser.email || '',
              studentId: `STU-${fbUser.uid.slice(0, 6).toUpperCase()}`,
              department: newPub.department,
              role: initialRole,
              totalXP: 0,
              successfulReturns: 0,
              badges: [],
              publicLeaderboardConsent: true,
              emailVerified: fbUser.emailVerified,
              isDemo: false,
              createdAt: nowIso,
            });
          }
        } catch (err) {
          console.error('Firebase profile sync note:', err);
        }
      } else {
        setLiveUserProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const mode: 'local' | 'live' = firebaseUser && liveUserProfile ? 'live' : 'local';

  // Attach Live Firestore Listeners ONLY when authenticated in Live Mode
  useEffect(() => {
    if (mode !== 'live' || !firebaseUser || !liveUserProfile) return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'campus_locations'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => d.data() as CampusLocation);
            setLiveLocations(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'campus_locations')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'campus_config', 'map'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setLiveMapConfig({
              campusName: data.campusName || DEFAULT_MAP_CONFIG.campusName,
              mapSubtitle: data.mapSubtitle || DEFAULT_MAP_CONFIG.mapSubtitle,
              layoutStyle: data.layoutStyle || DEFAULT_MAP_CONFIG.layoutStyle,
              customMapImageURL: data.customMapImageURL || '',
              updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? undefined,
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'campus_config/map')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'items'),
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
              isDemo: false,
            } as ItemReport;
          });
          setLiveItems(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'items')
      )
    );

    const isPriv = liveUserProfile.role === 'admin' || liveUserProfile.role === 'security';

    unsubs.push(
      onSnapshot(
        isPriv
          ? collection(db, 'users')
          : query(collection(db, 'users'), where('publicLeaderboardConsent', '==', true)),
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              email: '',
              studentId: '',
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? new Date().toISOString(),
              isDemo: false,
            } as CampusUser;
          });
          setLiveUsers(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      )
    );

    unsubs.push(
      onSnapshot(
        isPriv
          ? collection(db, 'notifications')
          : query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid)),
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? new Date().toISOString(),
            } as AppNotification;
          });
          setLiveNotifications(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    unsubs.push(
      onSnapshot(
        isPriv
          ? collection(db, 'claims')
          : query(collection(db, 'claims'), where('claimantId', '==', firebaseUser.uid)),
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? new Date().toISOString(),
            } as OwnershipClaim;
          });
          setLiveClaims(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'claims')
      )
    );

    unsubs.push(
      onSnapshot(
        isPriv
          ? collection(db, 'matches')
          : query(collection(db, 'matches'), where('lostOwnerId', '==', firebaseUser.uid)),
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? new Date().toISOString(),
            } as SmartMatch;
          });
          setLiveMatches(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'matches')
      )
    );

    unsubs.push(
      onSnapshot(
        isPriv
          ? collection(db, 'rewards')
          : query(collection(db, 'rewards'), where('userId', '==', firebaseUser.uid)),
        (snap) => {
          setLiveRewards(
            snap.docs.map((d) => ({
              ...d.data(),
              createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
            })) as RewardTransaction[]
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'rewards')
      )
    );

    unsubs.push(
      onSnapshot(
        isPriv
          ? collection(db, 'redemptions')
          : query(collection(db, 'redemptions'), where('userId', '==', firebaseUser.uid)),
        (snap) => {
          setLiveRedemptions(
            snap.docs.map((d) => ({
              ...d.data(),
              createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
            })) as RewardRedemption[]
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'redemptions')
      )
    );

    if (isPriv) {
      unsubs.push(
        onSnapshot(
          collection(db, 'handovers'),
          (snap) => {
            setLiveHandovers(
              snap.docs.map((d) => ({
                ...d.data(),
                handoverDate:
                  d.data().handoverDate?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
              })) as SecurityHandover[]
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'handovers')
        )
      );
    }

    if (liveUserProfile.role === 'admin') {
      unsubs.push(
        onSnapshot(
          collection(db, 'audit_logs'),
          (snap) => {
            setLiveAuditLogs(
              snap.docs.map((d) => ({
                ...d.data(),
                createdAt:
                  d.data().createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
              })) as AuditLogEntry[]
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'moderation_reports'),
          (snap) => {
            setLiveModeration(
              snap.docs.map((d) => ({
                ...d.data(),
                createdAt:
                  d.data().createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
              })) as ModerationReport[]
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'moderation_reports')
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [mode, firebaseUser, liveUserProfile]);

  const currentUser = useMemo<CampusUser | null>(() => {
    if (mode === 'live') return liveUserProfile;
    if (!activeLocalUid) return null;
    return workspaceState.users.find((u) => u.userId === activeLocalUid) ?? null;
  }, [mode, liveUserProfile, activeLocalUid, workspaceState.users]);

  const activeUsers = mode === 'live' ? liveUsers : workspaceState.users;
  const rawItems = mode === 'live' ? liveItems : workspaceState.items;
  const sanitizedItems = useMemo(
    () => rawItems.map((it) => sanitizeItemForViewer(it, currentUser)),
    [rawItems, currentUser]
  );

  const activeMatches = mode === 'live' ? liveMatches : workspaceState.matches;
  const activeClaims = mode === 'live' ? liveClaims : workspaceState.claims;
  const activeRewards = mode === 'live' ? liveRewards : workspaceState.rewards;
  const activeRedemptions = mode === 'live' ? liveRedemptions : workspaceState.redemptions;
  const activeNotifications = mode === 'live' ? liveNotifications : workspaceState.notifications;
  const activeHandovers = mode === 'live' ? liveHandovers : workspaceState.handovers;
  const activeAuditLogs = mode === 'live' ? liveAuditLogs : workspaceState.auditLogs;
  const activeModeration = mode === 'live' ? liveModeration : workspaceState.moderationReports;
  const activeLocations = mode === 'live' && liveLocations ? liveLocations : workspaceState.locations;
  const activeMapConfig = mode === 'live' && liveMapConfig ? liveMapConfig : workspaceState.mapConfig;

  const unreadNotificationCount = useMemo(() => {
    if (!currentUser) return 0;
    return activeNotifications.filter((n) => n.userId === currentUser.userId && !n.isRead).length;
  }, [activeNotifications, currentUser]);

  // --- Auth Actions ---
  const loginWithEmail = useCallback(
    (email: string, password: string): { ok: boolean; error?: string; role?: UserRole } => {
      const clean = email.trim().toLowerCase();
      const found = workspaceState.users.find((u) => u.email.toLowerCase() === clean);
      if (!found) {
        return {
          ok: false,
          error: 'No account found for that email. Please create an account first or sign in with Google.',
        };
      }
      const savedPassword = workspaceState.localCredentials[clean];
      if (!savedPassword || savedPassword !== password) {
        return { ok: false, error: 'Incorrect email or password.' };
      }
      setActiveLocalUid(found.userId);
      setStatusBanner({ type: 'success', message: `Signed in as ${found.name}.` });
      return { ok: true, role: found.role };
    },
    [workspaceState.users, workspaceState.localCredentials]
  );

  const registerAccount = useCallback(
    (input: {
      name: string;
      email: string;
      studentId: string;
      department: string;
      role: UserRole;
      password: string;
    }) => {
      const cleanEmail = input.email.trim().toLowerCase();
      if (workspaceState.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const newUser: CampusUser = {
        userId: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        email: cleanEmail,
        studentId: input.studentId.trim(),
        department: input.department,
        role: input.role,
        totalXP: 0,
        successfulReturns: 0,
        badges: [],
        publicLeaderboardConsent: input.role === 'student',
        isDemo: false,
        createdAt: new Date().toISOString(),
      };
      setWorkspaceState((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
        localCredentials: {
          ...prev.localCredentials,
          [cleanEmail]: input.password,
        },
        notifications: [
          {
            notificationId: `notif_${Date.now()}`,
            userId: newUser.userId,
            message: 'Welcome to CampusFind! Report lost or found items anytime.',
            type: 'admin',
            isRead: false,
            relatedPath: input.role === 'admin' ? '/admin' : input.role === 'security' ? '/security' : '/dashboard',
            createdAt: new Date().toISOString(),
          },
          ...prev.notifications,
        ],
      }));
      setActiveLocalUid(newUser.userId);
      setStatusBanner({ type: 'success', message: `Account created for ${newUser.name}.` });
      return { ok: true };
    },
    [workspaceState.users]
  );

  const resetLocalPassword = useCallback(
    (email: string, newPassword: string) => {
      const clean = email.trim().toLowerCase();
      const exists = workspaceState.users.some((u) => u.email.toLowerCase() === clean);
      if (!exists) {
        return { ok: false, error: 'No local account found for that email address.' };
      }
      setWorkspaceState((prev) => ({
        ...prev,
        localCredentials: {
          ...prev.localCredentials,
          [clean]: newPassword,
        },
      }));
      return { ok: true };
    },
    [workspaceState.users]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusBanner({ type: 'success', message: 'Connected to Live Firebase Authentication.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in cancelled or failed.';
      setStatusBanner({ type: 'error', message: msg });
    }
  }, []);

  const logout = useCallback(async () => {
    setActiveLocalUid(null);
    if (firebaseUser) {
      await signOut(auth);
    }
    setStatusBanner({ type: 'info', message: 'Signed out cleanly.' });
  }, [firebaseUser]);

  // --- Matching API Caller ---
  const computeMatchesViaServer = useCallback(
    async (sourceItem: ItemReport, candidatePool: ItemReport[]): Promise<SmartMatch[]> => {
      try {
        const res = await fetch('/api/ai/match-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceItem, candidates: candidatePool }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.matches)) {
          return data.matches as SmartMatch[];
        }
      } catch {
        // Fallback handled gracefully
      }
      return [];
    },
    []
  );

  // --- Submit Item Report ---
  const submitItemReport = useCallback(
    async (input: NewItemInput) => {
      if (!currentUser) throw new Error('Authentication required to submit a report.');

      const locMeta =
        activeLocations.find((l) => l.name === input.location) ??
        activeLocations[0] ??
        CAMPUS_LOCATIONS[0];
      const nowIso = new Date().toISOString();
      const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const initialStatus: ItemStatus =
        input.type === 'found' && input.handoverPreference === 'security_desk'
          ? 'Handed to Security'
          : input.type === 'lost'
            ? 'Lost'
            : 'Found';

      const newItem: ItemReport = {
        itemId,
        type: input.type,
        title: input.title.trim(),
        category: input.category,
        brand: input.brand.trim() || 'Unbranded',
        color: input.color.trim(),
        description: input.description.trim(),
        privateFeatures: input.privateFeatures.trim(),
        exactLocationNote: input.exactLocationNote?.trim() || '',
        imageURL: input.imageURL || '',
        location: input.location,
        latitude: locMeta.latitude,
        longitude: locMeta.longitude,
        eventDate: input.eventDate,
        reportedBy: currentUser.userId,
        reporterDisplay: input.isAnonymous ? 'Anonymous Campus Finder' : currentUser.name,
        isAnonymous: Boolean(input.isAnonymous),
        handoverPreference: input.handoverPreference,
        status: initialStatus,
        statusHistory: [{ status: initialStatus, timestamp: nowIso, note: 'Report submitted' }],
        isDemo: false,
        createdAt: nowIso,
      };

      const candidatePool = rawItems;
      const computedMatches = await computeMatchesViaServer(newItem, candidatePool);

      if (mode === 'live' && firebaseUser) {
        const publicPayload = {
          itemId: newItem.itemId,
          type: newItem.type,
          title: newItem.title,
          category: newItem.category,
          brand: newItem.brand,
          color: newItem.color,
          description: newItem.description,
          imageURL: newItem.imageURL || '',
          location: newItem.location,
          latitude: newItem.latitude,
          longitude: newItem.longitude,
          eventDate: newItem.eventDate,
          reportedBy: firebaseUser.uid,
          reporterDisplay: newItem.reporterDisplay,
          isAnonymous: newItem.isAnonymous,
          handoverPreference: newItem.handoverPreference || 'safe_return',
          status: initialStatus === 'Handed to Security' ? 'Found' : initialStatus,
          createdAt: serverTimestamp(),
        };

        try {
          await setDoc(doc(db, 'items', itemId), publicPayload);
          await setDoc(doc(db, 'items', itemId, 'private', 'details'), {
            itemId,
            reportedBy: firebaseUser.uid,
            privateFeatures: newItem.privateFeatures || 'None specified',
            exactLocationNote: newItem.exactLocationNote || '',
            createdAt: serverTimestamp(),
          });
          for (const m of computedMatches.slice(0, 5)) {
            await setDoc(doc(db, 'matches', m.matchId), {
              ...m,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `items/${itemId}`);
        }
      } else {
        setWorkspaceState((prev) => {
          const updatedUsers = [...prev.users];
          const newRewards = [...prev.rewards];
          const newNotifications = [...prev.notifications];
          const newHandovers = [...prev.handovers];

          if (newItem.type === 'found') {
            const idx = updatedUsers.findIndex((u) => u.userId === currentUser.userId);
            if (idx >= 0) {
              const award = calculateRewardAward({
                user: updatedUsers[idx],
                eventType: 'found_report',
                itemId,
                itemTitle: newItem.title,
                existingRewards: newRewards,
                nowIso,
              });
              if (!award.duplicateBlocked && award.pointsAdded > 0) {
                updatedUsers[idx] = {
                  ...updatedUsers[idx],
                  totalXP: award.newTotalXP,
                };
                newRewards.unshift(...award.newTransactions);
                newNotifications.unshift({
                  notificationId: `notif_xp_${Date.now()}`,
                  userId: currentUser.userId,
                  message: `Earned +${award.pointsAdded} XP for submitting found item report: ${newItem.title}.`,
                  type: 'xp',
                  isRead: false,
                  relatedPath: '/rewards',
                  createdAt: nowIso,
                });
              }
            }

            if (input.handoverPreference === 'security_desk') {
              const refCode = `SEC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
              const staffMember = prev.users.find((u) => u.role === 'security');
              newHandovers.unshift({
                handoverId: `ho_${Date.now()}`,
                referenceCode: refCode,
                itemId,
                receivingStaffId: staffMember?.userId || 'security_desk',
                receivingStaffName: staffMember?.name || 'Campus Security Desk',
                storageLocation: `${input.location} · Pending Intake Shelf`,
                handoverDate: nowIso,
                status: 'In Custody',
              });
            }
          }

          if (computedMatches.length > 0) {
            const top = computedMatches[0];
            newNotifications.unshift({
              notificationId: `notif_match_${Date.now()}`,
              userId: currentUser.userId,
              message: `AI Matching found ${computedMatches.length} potential match${computedMatches.length > 1 ? 'es' : ''} (top score ${top.combinedScore}%) for "${newItem.title}".`,
              type: 'match',
              isRead: false,
              relatedPath: '/matches',
              createdAt: nowIso,
            });
          }

          return {
            ...prev,
            users: updatedUsers,
            items: [newItem, ...prev.items],
            matches: [
              ...computedMatches.filter(
                (cm) => !prev.matches.some((em) => em.matchId === cm.matchId)
              ),
              ...prev.matches,
            ],
            rewards: newRewards,
            notifications: newNotifications,
            handovers: newHandovers,
            auditLogs: [
              {
                logId: `log_${Date.now()}`,
                actorId: currentUser.userId,
                actorName: currentUser.name,
                action: `Submitted ${newItem.type} report`,
                targetType: 'Item',
                targetId: itemId,
                details: newItem.title,
                createdAt: nowIso,
              },
              ...prev.auditLogs,
            ],
          };
        });
      }

      setStatusBanner({
        type: 'success',
        message: `Report submitted! AI Matching scanned active opposite reports and found ${computedMatches.length} candidate match${computedMatches.length === 1 ? '' : 'es'}.`,
      });

      return { item: newItem, newMatches: computedMatches };
    },
    [currentUser, mode, rawItems, computeMatchesViaServer, firebaseUser, activeLocations]
  );

  const updateItemReport = useCallback(
    async (itemId: string, patch: Partial<ItemReport>) => {
      if (mode === 'live') {
        try {
          await updateDoc(doc(db, 'items', itemId), {
            ...patch,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `items/${itemId}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.itemId === itemId ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it
          ),
        }));
      }
      setStatusBanner({ type: 'success', message: 'Item report updated.' });
    },
    [mode]
  );

  const closeItemReport = useCallback(
    async (itemId: string) => {
      await updateItemReport(itemId, { status: 'Closed' });
    },
    [updateItemReport]
  );

  const runMatchingForItem = useCallback(
    async (itemId: string) => {
      const source = rawItems.find((i) => i.itemId === itemId);
      if (!source) return [];
      const results = await computeMatchesViaServer(source, rawItems);
      if (mode === 'local') {
        setWorkspaceState((prev) => ({
          ...prev,
          matches: [
            ...results,
            ...prev.matches.filter((m) => !results.some((r) => r.matchId === m.matchId)),
          ],
        }));
      }
      setStatusBanner({
        type: 'info',
        message: `AI Matching refreshed: ${results.length} candidate match${results.length === 1 ? '' : 'es'} scored.`,
      });
      return results;
    },
    [rawItems, computeMatchesViaServer, mode]
  );

  // --- Claims ---
  const submitClaim = useCallback(
    async (input: {
      itemId: string;
      answers: string;
      privateDetailAttempt: string;
      evidenceURL?: string;
    }) => {
      if (!currentUser) throw new Error('Sign in required to submit an ownership claim.');
      const targetItem = rawItems.find((i) => i.itemId === input.itemId);
      if (!targetItem) throw new Error('Item not found.');

      const nowIso = new Date().toISOString();
      const claimId = `claim_${Date.now()}`;
      const newClaim: OwnershipClaim = {
        claimId,
        itemId: targetItem.itemId,
        itemOwnerId: targetItem.reportedBy,
        claimantId: currentUser.userId,
        claimantName: currentUser.name,
        claimantDepartment: currentUser.department,
        answers: input.answers.trim(),
        privateDetailAttempt: input.privateDetailAttempt.trim(),
        evidenceURL: input.evidenceURL || '',
        verificationStatus: 'Pending',
        createdAt: nowIso,
      };

      if (mode === 'live' && firebaseUser) {
        try {
          await setDoc(doc(db, 'claims', claimId), {
            claimId,
            itemId: newClaim.itemId,
            itemOwnerId: newClaim.itemOwnerId,
            claimantId: firebaseUser.uid,
            answers: newClaim.answers,
            privateDetailAttempt: newClaim.privateDetailAttempt,
            evidenceURL: newClaim.evidenceURL,
            verificationStatus: 'Pending',
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `claims/${claimId}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          claims: [newClaim, ...prev.claims],
          items: prev.items.map((it) =>
            it.itemId === targetItem.itemId && it.status !== 'Returned'
              ? { ...it, status: 'Claim Pending', updatedAt: nowIso }
              : it
          ),
          notifications: [
            {
              notificationId: `notif_claim_${Date.now()}`,
              userId: targetItem.reportedBy,
              message: `New ownership claim submitted on "${targetItem.title}". Review verification details before approval.`,
              type: 'claim',
              isRead: false,
              relatedPath: '/claims',
              createdAt: nowIso,
            },
            ...prev.notifications,
          ],
        }));
      }

      setStatusBanner({
        type: 'success',
        message: 'Ownership claim submitted for verification. Private details are never shown publicly.',
      });
      return newClaim;
    },
    [currentUser, rawItems, mode, firebaseUser]
  );

  const reviewClaim = useCallback(
    async (
      claimId: string,
      decision: 'Finder Approved' | 'Admin Approved' | 'Security Verified' | 'Completed' | 'Rejected' | 'Disputed',
      reviewNote?: string
    ) => {
      if (!currentUser) return;
      const nowIso = new Date().toISOString();

      if (mode === 'live') {
        try {
          await updateDoc(doc(db, 'claims', claimId), {
            verificationStatus: decision as ClaimVerificationStatus,
            reviewedBy: currentUser.userId,
            reviewNote: reviewNote || '',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
        }
        setStatusBanner({ type: 'success', message: `Claim status updated to ${decision}.` });
        return;
      }

      setWorkspaceState((prev) => {
        const claim = prev.claims.find((c) => c.claimId === claimId);
        if (!claim) return prev;
        const item = prev.items.find((i) => i.itemId === claim.itemId);
        const updatedClaims = prev.claims.map((c) =>
          c.claimId === claimId
            ? {
                ...c,
                verificationStatus: decision,
                reviewedBy: currentUser.userId,
                reviewNote: reviewNote || c.reviewNote,
                updatedAt: nowIso,
              }
            : c
        );

        let updatedItems = [...prev.items];
        let updatedUsers = [...prev.users];
        const newRewards = [...prev.rewards];
        const newNotifications = [...prev.notifications];
        let updatedHandovers = [...prev.handovers];

        if (decision === 'Completed' && item) {
          updatedItems = updatedItems.map((it) =>
            it.itemId === item.itemId ? { ...it, status: 'Returned', updatedAt: nowIso } : it
          );
          updatedHandovers = updatedHandovers.map((ho) =>
            ho.itemId === item.itemId
              ? { ...ho, status: 'Collected', collectionDate: nowIso, collectedByUserId: claim.claimantId }
              : ho
          );

          // Award Good Samaritan XP to the finder (if found report)
          const finderId = item.type === 'found' ? item.reportedBy : currentUser.userId;
          const finderIdx = updatedUsers.findIndex((u) => u.userId === finderId);
          if (finderIdx >= 0 && updatedUsers[finderIdx].role === 'student') {
            const award = calculateRewardAward({
              user: updatedUsers[finderIdx],
              eventType: 'successful_return',
              itemId: item.itemId,
              itemTitle: item.title,
              existingRewards: newRewards,
              nowIso,
            });
            if (!award.duplicateBlocked) {
              updatedUsers[finderIdx] = {
                ...updatedUsers[finderIdx],
                totalXP: award.newTotalXP,
                successfulReturns: award.newSuccessfulReturns,
                badges: award.newBadges,
              };
              newRewards.unshift(...award.newTransactions);
              newNotifications.unshift({
                notificationId: `notif_ret_finder_${Date.now()}`,
                userId: finderId,
                message: `Verified return complete for "${item.title}"! You earned +${award.pointsAdded} XP${award.newlyUnlockedBadges.length ? ` and unlocked ${award.newlyUnlockedBadges.join(', ')}` : ''}.`,
                type: 'xp',
                isRead: false,
                relatedPath: '/rewards',
                createdAt: nowIso,
              });
            }
          }

          newNotifications.unshift({
            notificationId: `notif_ret_claimant_${Date.now() + 1}`,
            userId: claim.claimantId,
            message: `Your ownership claim for "${item.title}" was completed and marked Returned.`,
            type: 'returned',
            isRead: false,
            relatedPath: '/claims',
            createdAt: nowIso,
          });
        } else if (item) {
          newNotifications.unshift({
            notificationId: `notif_rev_${Date.now()}`,
            userId: claim.claimantId,
            message: `Claim status for "${item.title}" updated to ${decision}.`,
            type: decision === 'Rejected' ? 'rejected' : 'approved',
            isRead: false,
            relatedPath: '/claims',
            createdAt: nowIso,
          });
        }

        return {
          ...prev,
          claims: updatedClaims,
          items: updatedItems,
          users: updatedUsers,
          rewards: newRewards,
          notifications: newNotifications,
          handovers: updatedHandovers,
          auditLogs: [
            {
              logId: `log_${Date.now()}`,
              actorId: currentUser.userId,
              actorName: currentUser.name,
              action: `Claim ${decision}`,
              targetType: 'Claim',
              targetId: claimId,
              details: reviewNote || item?.title,
              createdAt: nowIso,
            },
            ...prev.auditLogs,
          ],
        };
      });

      setStatusBanner({ type: 'success', message: `Claim marked as ${decision}.` });
    },
    [currentUser, mode]
  );

  // --- Security Staff ---
  const registerSecurityHandover = useCallback(
    async (input: { itemId: string; storageLocation: string }) => {
      if (!currentUser) throw new Error('Security authentication required.');
      const nowIso = new Date().toISOString();
      const handoverId = `ho_${Date.now()}`;
      const referenceCode = `SEC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newHandover: SecurityHandover = {
        handoverId,
        referenceCode,
        itemId: input.itemId,
        receivingStaffId: currentUser.userId,
        receivingStaffName: currentUser.name,
        storageLocation: input.storageLocation.trim(),
        handoverDate: nowIso,
        status: 'In Custody',
      };

      if (mode === 'live') {
        try {
          await setDoc(doc(db, 'handovers', handoverId), {
            ...newHandover,
            handoverDate: serverTimestamp(),
          });
          await updateDoc(doc(db, 'items', input.itemId), {
            status: 'Handed to Security',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `handovers/${handoverId}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          handovers: [newHandover, ...prev.handovers],
          items: prev.items.map((it) =>
            it.itemId === input.itemId ? { ...it, status: 'Handed to Security', updatedAt: nowIso } : it
          ),
          auditLogs: [
            {
              logId: `log_${Date.now()}`,
              actorId: currentUser.userId,
              actorName: currentUser.name,
              action: `Registered security handover ${referenceCode}`,
              targetType: 'Handover',
              targetId: handoverId,
              details: input.storageLocation,
              createdAt: nowIso,
            },
            ...prev.auditLogs,
          ],
        }));
      }

      setStatusBanner({
        type: 'success',
        message: `Handover logged with Reference ID ${referenceCode}.`,
      });
      return newHandover;
    },
    [currentUser, mode]
  );

  const confirmSecurityCollection = useCallback(
    async (handoverId: string, collectedByUserId?: string) => {
      if (!currentUser) return;
      const nowIso = new Date().toISOString();

      if (mode === 'live') {
        try {
          await updateDoc(doc(db, 'handovers', handoverId), {
            status: 'Collected',
            collectionDate: serverTimestamp(),
            collectedByUserId: collectedByUserId || 'verified_student',
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `handovers/${handoverId}`);
        }
        setStatusBanner({ type: 'success', message: 'Item collection confirmed.' });
        return;
      }

      setWorkspaceState((prev) => {
        const ho = prev.handovers.find((h) => h.handoverId === handoverId);
        if (!ho) return prev;
        const item = prev.items.find((i) => i.itemId === ho.itemId);
        let updatedUsers = [...prev.users];
        const newRewards = [...prev.rewards];
        const newNotifications = [...prev.notifications];

        if (item && item.type === 'found') {
          const finderIdx = updatedUsers.findIndex((u) => u.userId === item.reportedBy);
          if (finderIdx >= 0 && updatedUsers[finderIdx].role === 'student') {
            const award = calculateRewardAward({
              user: updatedUsers[finderIdx],
              eventType: 'successful_return',
              itemId: item.itemId,
              itemTitle: item.title,
              existingRewards: newRewards,
              nowIso,
            });
            if (!award.duplicateBlocked) {
              updatedUsers[finderIdx] = {
                ...updatedUsers[finderIdx],
                totalXP: award.newTotalXP,
                successfulReturns: award.newSuccessfulReturns,
                badges: award.newBadges,
              };
              newRewards.unshift(...award.newTransactions);
              newNotifications.unshift({
                notificationId: `notif_col_${Date.now()}`,
                userId: item.reportedBy,
                message: `Security confirmed collection of "${item.title}"! +${award.pointsAdded} XP credited.`,
                type: 'xp',
                isRead: false,
                relatedPath: '/rewards',
                createdAt: nowIso,
              });
            }
          }
        }

        return {
          ...prev,
          handovers: prev.handovers.map((h) =>
            h.handoverId === handoverId
              ? {
                  ...h,
                  status: 'Collected',
                  collectionDate: nowIso,
                  collectedByUserId: collectedByUserId || 'verified_owner',
                }
              : h
          ),
          items: prev.items.map((it) =>
            it.itemId === ho.itemId ? { ...it, status: 'Returned', updatedAt: nowIso } : it
          ),
          users: updatedUsers,
          rewards: newRewards,
          notifications: newNotifications,
          auditLogs: [
            {
              logId: `log_${Date.now()}`,
              actorId: currentUser.userId,
              actorName: currentUser.name,
              action: `Confirmed item collection (${ho.referenceCode})`,
              targetType: 'Handover',
              targetId: handoverId,
              createdAt: nowIso,
            },
            ...prev.auditLogs,
          ],
        };
      });

      setStatusBanner({
        type: 'success',
        message: 'Collection confirmed, item marked Returned, and finder XP credited.',
      });
    },
    [currentUser, mode]
  );

  // --- Rewards & Profile ---
  const redeemReward = useCallback(
    async (catalogItem: RewardCatalogItem) => {
      if (!currentUser) return null;
      const spent = activeRedemptions
        .filter((r) => r.userId === currentUser.userId)
        .reduce((acc, r) => acc + r.xpCost, 0);
      const available = Math.max(0, currentUser.totalXP - spent);

      if (available < catalogItem.xpCost) {
        setStatusBanner({
          type: 'error',
          message: `Insufficient available XP (${available} XP) for ${catalogItem.title} (${catalogItem.xpCost} XP).`,
        });
        return null;
      }

      const nowIso = new Date().toISOString();
      const redemptionId = `red_${Date.now()}`;
      const voucherCode = `CF-${catalogItem.id.slice(-4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const redemption: RewardRedemption = {
        redemptionId,
        userId: currentUser.userId,
        rewardTitle: catalogItem.title,
        xpCost: catalogItem.xpCost,
        voucherCode,
        status: 'Active',
        createdAt: nowIso,
      };

      if (mode === 'live' && firebaseUser) {
        try {
          await setDoc(doc(db, 'redemptions', redemptionId), {
            ...redemption,
            userId: firebaseUser.uid,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `redemptions/${redemptionId}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          redemptions: [redemption, ...prev.redemptions],
          notifications: [
            {
              notificationId: `notif_red_${Date.now()}`,
              userId: currentUser.userId,
              message: `Redeemed "${catalogItem.title}". Voucher code: ${voucherCode}.`,
              type: 'xp',
              isRead: false,
              relatedPath: '/rewards',
              createdAt: nowIso,
            },
            ...prev.notifications,
          ],
        }));
      }

      setStatusBanner({
        type: 'success',
        message: `Voucher ${voucherCode} issued for ${catalogItem.title}!`,
      });
      return redemption;
    },
    [currentUser, activeRedemptions, mode, firebaseUser]
  );

  const updateProfile = useCallback(
    async (patch: {
      name?: string;
      department?: string;
      studentId?: string;
      phone?: string;
      publicLeaderboardConsent?: boolean;
    }) => {
      if (!currentUser) return;
      if (mode === 'live' && firebaseUser) {
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            name: patch.name ?? currentUser.name,
            department: patch.department ?? currentUser.department,
            publicLeaderboardConsent:
              patch.publicLeaderboardConsent ?? currentUser.publicLeaderboardConsent,
          });
          setLiveUserProfile((prev) => (prev ? { ...prev, ...patch } : prev));
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.userId === currentUser.userId ? { ...u, ...patch } : u)),
        }));
      }
      setStatusBanner({ type: 'success', message: 'Profile and privacy settings saved.' });
    },
    [currentUser, mode, firebaseUser]
  );

  // --- Notifications ---
  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      if (mode === 'live') {
        try {
          await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n
          ),
        }));
      }
    },
    [mode]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser) return;
    if (mode === 'live') {
      const unread = activeNotifications.filter((n) => n.userId === currentUser.userId && !n.isRead);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.notificationId), { isRead: true });
      }
    } else {
      setWorkspaceState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.userId === currentUser.userId ? { ...n, isRead: true } : n
        ),
      }));
    }
  }, [currentUser, mode, activeNotifications]);

  // --- Admin, Campus Map & Support ---
  const addCategory = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setWorkspaceState((prev) => ({
      ...prev,
      categories: prev.categories.includes(clean) ? prev.categories : [...prev.categories, clean],
    }));
    setStatusBanner({ type: 'success', message: `Category "${clean}" added.` });
  }, []);

  const removeCategory = useCallback((name: string) => {
    setWorkspaceState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== name),
    }));
  }, []);

  const updateMapConfig = useCallback(
    async (patch: Partial<CampusMapConfig>) => {
      if (currentUser?.role !== 'admin') {
        setStatusBanner({ type: 'error', message: 'Only administrators can edit the campus map.' });
        return;
      }
      const next: CampusMapConfig = {
        ...activeMapConfig,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      setWorkspaceState((prev) => ({
        ...prev,
        mapConfig: next,
      }));
      if (mode === 'live') {
        const customUrl = next.customMapImageURL || '';
        if (customUrl.length > 1500) {
          setStatusBanner({
            type: 'info',
            message:
              'Map appearance updated locally. For Live Firebase sync across devices, please use an image URL under 1500 characters.',
          });
          return;
        }
        try {
          await setDoc(doc(db, 'campus_config', 'map'), {
            configId: 'map',
            campusName: next.campusName,
            mapSubtitle: next.mapSubtitle,
            layoutStyle: next.layoutStyle,
            customMapImageURL: customUrl,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'campus_config/map');
        }
      }
      setStatusBanner({ type: 'success', message: 'Campus map layout and details updated.' });
    },
    [activeMapConfig, mode, currentUser]
  );

  const addLocation = useCallback(
    async (locInput: Omit<CampusLocation, 'id'>) => {
      if (currentUser?.role !== 'admin') {
        setStatusBanner({ type: 'error', message: 'Only administrators can add campus locations.' });
        throw new Error('Only administrators can add campus locations.');
      }
      const id = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newLoc: CampusLocation = {
        ...locInput,
        id,
        name: locInput.name.trim(),
        zone: locInput.zone.trim() || 'Campus Zone',
        buildingCode: locInput.buildingCode.trim().toUpperCase() || 'BLD-01',
        mapX: Math.min(100, Math.max(0, Number(locInput.mapX))),
        mapY: Math.min(100, Math.max(0, Number(locInput.mapY))),
        hasSecurityDesk: Boolean(locInput.hasSecurityDesk),
        securityHours: locInput.securityHours?.trim() || '',
      };

      const baseLocations =
        mode === 'live' && liveLocations === null ? workspaceState.locations : activeLocations;
      const merged = [...baseLocations, newLoc];
      setWorkspaceState((prev) => ({
        ...prev,
        locations: merged,
      }));

      if (mode === 'live') {
        try {
          if (liveLocations === null) {
            for (const existing of baseLocations) {
              await setDoc(doc(db, 'campus_locations', existing.id), {
                id: existing.id,
                name: existing.name,
                zone: existing.zone,
                buildingCode: existing.buildingCode,
                latitude: existing.latitude,
                longitude: existing.longitude,
                mapX: existing.mapX,
                mapY: existing.mapY,
                hasSecurityDesk: Boolean(existing.hasSecurityDesk),
                securityHours: existing.securityHours || '',
                updatedAt: serverTimestamp(),
              });
            }
          }
          await setDoc(doc(db, 'campus_locations', newLoc.id), {
            id: newLoc.id,
            name: newLoc.name,
            zone: newLoc.zone,
            buildingCode: newLoc.buildingCode,
            latitude: newLoc.latitude,
            longitude: newLoc.longitude,
            mapX: newLoc.mapX,
            mapY: newLoc.mapY,
            hasSecurityDesk: Boolean(newLoc.hasSecurityDesk),
            securityHours: newLoc.securityHours || '',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `campus_locations/${newLoc.id}`);
        }
      }

      setStatusBanner({ type: 'success', message: `Added campus location "${newLoc.name}".` });
      return newLoc;
    },
    [mode, liveLocations, workspaceState.locations, activeLocations, currentUser]
  );

  const updateLocation = useCallback(
    async (id: string, patch: Partial<CampusLocation>) => {
      if (currentUser?.role !== 'admin') {
        setStatusBanner({ type: 'error', message: 'Only administrators can edit campus locations.' });
        return;
      }
      const target = activeLocations.find((l) => l.id === id);
      if (!target) return;
      const updated: CampusLocation = {
        ...target,
        ...patch,
        name: (patch.name ?? target.name).trim(),
        zone: (patch.zone ?? target.zone).trim(),
        buildingCode: (patch.buildingCode ?? target.buildingCode).trim().toUpperCase(),
        mapX: Math.min(100, Math.max(0, Number(patch.mapX ?? target.mapX))),
        mapY: Math.min(100, Math.max(0, Number(patch.mapY ?? target.mapY))),
        hasSecurityDesk: patch.hasSecurityDesk ?? Boolean(target.hasSecurityDesk),
        securityHours: (patch.securityHours ?? target.securityHours ?? '').trim(),
      };

      setWorkspaceState((prev) => ({
        ...prev,
        locations: prev.locations.map((l) => (l.id === id ? updated : l)),
      }));

      if (mode === 'live') {
        try {
          await setDoc(doc(db, 'campus_locations', id), {
            id: updated.id,
            name: updated.name,
            zone: updated.zone,
            buildingCode: updated.buildingCode,
            latitude: updated.latitude,
            longitude: updated.longitude,
            mapX: updated.mapX,
            mapY: updated.mapY,
            hasSecurityDesk: Boolean(updated.hasSecurityDesk),
            securityHours: updated.securityHours || '',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `campus_locations/${id}`);
        }
      }

      setStatusBanner({ type: 'success', message: `Updated location "${updated.name}".` });
    },
    [activeLocations, mode, currentUser]
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      if (currentUser?.role !== 'admin') {
        setStatusBanner({ type: 'error', message: 'Only administrators can delete campus locations.' });
        return;
      }
      if (activeLocations.length <= 1) {
        setStatusBanner({ type: 'error', message: 'At least one campus location must remain configured.' });
        return;
      }
      const target = activeLocations.find((l) => l.id === id);
      setWorkspaceState((prev) => ({
        ...prev,
        locations: prev.locations.filter((l) => l.id !== id),
      }));
      if (mode === 'live') {
        try {
          await deleteDoc(doc(db, 'campus_locations', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `campus_locations/${id}`);
        }
      }
      setStatusBanner({ type: 'info', message: `Removed location "${target?.name || id}".` });
    },
    [activeLocations, mode, currentUser]
  );

  const updateUserRole = useCallback((userId: string, role: UserRole) => {
    setWorkspaceState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.userId === userId ? { ...u, role } : u)),
    }));
    setStatusBanner({ type: 'success', message: `User role updated to ${role}.` });
  }, []);

  const submitModerationReport = useCallback(
    async (input: { targetItemId?: string; targetUserId?: string; reason: string }) => {
      if (!currentUser) return;
      const nowIso = new Date().toISOString();
      const reportId = `mod_${Date.now()}`;
      const newRep: ModerationReport = {
        reportId,
        reporterId: currentUser.userId,
        targetItemId: input.targetItemId,
        targetUserId: input.targetUserId,
        reason: input.reason.trim(),
        status: 'Open',
        createdAt: nowIso,
      };
      if (mode === 'live' && firebaseUser) {
        try {
          await setDoc(doc(db, 'moderation_reports', reportId), {
            ...newRep,
            reporterId: firebaseUser.uid,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `moderation_reports/${reportId}`);
        }
      } else {
        setWorkspaceState((prev) => ({
          ...prev,
          moderationReports: [newRep, ...prev.moderationReports],
        }));
      }
      setStatusBanner({
        type: 'success',
        message: 'Report submitted to campus administrators for review.',
      });
    },
    [currentUser, mode, firebaseUser]
  );

  const updateModerationStatus = useCallback((reportId: string, status: ModerationReport['status']) => {
    setWorkspaceState((prev) => ({
      ...prev,
      moderationReports: prev.moderationReports.map((r) =>
        r.reportId === reportId ? { ...r, status } : r
      ),
    }));
    setStatusBanner({ type: 'success', message: `Moderation case marked ${status}.` });
  }, []);

  const submitSupportTicket = useCallback(
    (input: { subject: string; category: SupportTicket['category']; message: string }) => {
      const ticket: SupportTicket = {
        ticketId: `sup_${Date.now()}`,
        userId: currentUser?.userId || 'guest',
        subject: input.subject.trim(),
        category: input.category,
        message: input.message.trim(),
        status: 'Open',
        createdAt: new Date().toISOString(),
      };
      setWorkspaceState((prev) => ({
        ...prev,
        supportTickets: [ticket, ...prev.supportTickets],
      }));
      setStatusBanner({
        type: 'success',
        message: 'Your inquiry has been logged with CampusFind Support.',
      });
    },
    [currentUser]
  );

  const value: AppContextValue = {
    mode,
    authReady,
    aiStatus,
    currentUser,
    users: activeUsers,
    items: sanitizedItems,
    rawItemsForPrivileged: rawItems,
    matches: activeMatches,
    claims: activeClaims,
    rewards: activeRewards,
    redemptions: activeRedemptions,
    notifications: activeNotifications,
    handovers: activeHandovers,
    auditLogs: activeAuditLogs,
    moderationReports: activeModeration,
    supportTickets: workspaceState.supportTickets,
    categories: workspaceState.categories,
    locations: activeLocations,
    mapConfig: activeMapConfig,
    rewardCatalog: REWARD_CATALOG,
    unreadNotificationCount,
    statusBanner,
    clearStatusBanner,
    loginWithEmail,
    registerAccount,
    resetLocalPassword,
    loginWithGoogle,
    logout,
    submitItemReport,
    updateItemReport,
    closeItemReport,
    runMatchingForItem,
    submitClaim,
    reviewClaim,
    registerSecurityHandover,
    confirmSecurityCollection,
    redeemReward,
    updateProfile,
    markNotificationRead,
    markAllNotificationsRead,
    addCategory,
    removeCategory,
    updateMapConfig,
    addLocation,
    updateLocation,
    deleteLocation,
    updateUserRole,
    submitModerationReport,
    updateModerationStatus,
    submitSupportTicket,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
