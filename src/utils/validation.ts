import type { CampusUser, ItemReport, ItemStatus } from '../types/campusfind';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateItemReportInput(input: {
  title: string;
  category: string;
  color: string;
  description: string;
  location: string;
  eventDate: string;
  privateFeatures?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 2) {
    errors.title = 'Enter a descriptive item name (at least 2 characters).';
  } else if (input.title.trim().length > 140) {
    errors.title = 'Item name cannot exceed 140 characters.';
  }

  if (!input.category || input.category.trim().length < 2) {
    errors.category = 'Select an item category.';
  }

  if (!input.color || input.color.trim().length < 1) {
    errors.color = 'Specify the primary color.';
  }

  if (!input.description || input.description.trim().length < 8) {
    errors.description = 'Provide at least 8 characters describing the item.';
  } else if (input.description.trim().length > 1500) {
    errors.description = 'Description cannot exceed 1500 characters.';
  }

  if (!input.location || input.location.trim().length < 2) {
    errors.location = 'Select a campus location.';
  }

  if (!input.eventDate) {
    errors.eventDate = 'Provide the date and time.';
  }

  if (input.privateFeatures && input.privateFeatures.length > 1000) {
    errors.privateFeatures = 'Private features cannot exceed 1000 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateClaimInput(input: {
  answers: string;
  privateDetailAttempt: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.answers || input.answers.trim().length < 10) {
    errors.answers = 'Explain where and when you lost the item (at least 10 characters).';
  }
  if (!input.privateDetailAttempt || input.privateDetailAttempt.trim().length < 4) {
    errors.privateDetailAttempt = 'Provide at least one private identifying detail (e.g., wallpaper, contents, engraving).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateImageFile(file: { type: string; size: number }): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, or WebP images are supported.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, error: 'Image size must be 5 MB or smaller.' };
  }
  return { valid: true };
}

const VALID_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  Lost: ['Matched', 'Claim Pending', 'Returned', 'Closed'],
  Found: ['Matched', 'Claim Pending', 'Handed to Security', 'Returned', 'Closed'],
  Matched: ['Claim Pending', 'Handed to Security', 'Returned', 'Closed'],
  'Claim Pending': ['Handed to Security', 'Returned', 'Found', 'Lost', 'Closed'],
  'Handed to Security': ['Claim Pending', 'Returned', 'Closed'],
  Returned: ['Closed'],
  Closed: [],
};

export function canTransitionStatus(from: ItemStatus, to: ItemStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Strips private identifying features and exact location notes before exposing an item
 * to anyone who is not the reporter, an admin, or security staff.
 */
export function sanitizeItemForViewer(item: ItemReport, viewer: CampusUser | null): ItemReport {
  const isPrivileged =
    viewer !== null &&
    (viewer.role === 'admin' || viewer.role === 'security' || viewer.userId === item.reportedBy);

  const sanitizedDisplay =
    item.isAnonymous && viewer?.role !== 'admin' && viewer?.role !== 'security' && viewer?.userId !== item.reportedBy
      ? 'Anonymous Campus Finder'
      : item.reporterDisplay;

  if (isPrivileged) {
    return { ...item, reporterDisplay: sanitizedDisplay };
  }

  const { privateFeatures: _pf, exactLocationNote: _el, ...publicFields } = item;
  return {
    ...publicFields,
    reporterDisplay: sanitizedDisplay,
  };
}

export function isValuableCategory(category: string, title = ''): boolean {
  const text = `${category} ${title}`.toLowerCase();
  return (
    text.includes('phone') ||
    text.includes('electronic') ||
    text.includes('laptop') ||
    text.includes('tablet') ||
    text.includes('earbud') ||
    text.includes('watch') ||
    text.includes('wallet') ||
    text.includes('id card') ||
    text.includes('jewelry') ||
    text.includes('key')
  );
}
