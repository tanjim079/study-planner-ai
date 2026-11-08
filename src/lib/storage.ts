import { StorageSchemaV1, Subject, StudyPlan, UserPreferences } from '@/types';

export const CURRENT_STORAGE_VERSION = 1;
export const STORAGE_KEY = 'studyflow_ai_data_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  dailyStudyHours: 4,
  preferredSessionMinutes: 45,
  planningPeriodDays: 7,
  theme: 'system',
  reducedMotion: false,
  highContrast: false,
};

export const INITIAL_STORAGE_STATE: StorageSchemaV1 = {
  version: CURRENT_STORAGE_VERSION,
  subjects: [],
  activePlan: null,
  historyPlans: [],
  preferences: DEFAULT_PREFERENCES,
  lastUpdated: new Date().toISOString(),
};

/**
 * Validates whether an object roughly matches the StorageSchema shape.
 */
function isValidStorageData(data: unknown): data is StorageSchemaV1 {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<StorageSchemaV1>;
  return (
    typeof d.version === 'number' &&
    Array.isArray(d.subjects) &&
    (d.activePlan === null || typeof d.activePlan === 'object') &&
    typeof d.preferences === 'object'
  );
}

/**
 * Migration pipeline for forward compatibility across schema versions.
 */
function migrateData(raw: unknown): StorageSchemaV1 {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_STORAGE_STATE, lastUpdated: new Date().toISOString() };
  }

  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === 'number' ? obj.version : 0;

  if (version === 1 && isValidStorageData(obj)) {
    return obj;
  }

  // Future migrations can be placed here: e.g., if (version === 1) -> migrate to 2
  // For unversioned or unknown legacy data:
  const subjects = Array.isArray(obj.subjects) ? (obj.subjects as Subject[]) : [];
  const activePlan = (obj.activePlan && typeof obj.activePlan === 'object' ? obj.activePlan : null) as StudyPlan | null;
  const historyPlans = Array.isArray(obj.historyPlans) ? (obj.historyPlans as StudyPlan[]) : [];
  const preferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(typeof obj.preferences === 'object' ? (obj.preferences as Partial<UserPreferences>) : {}),
  };

  return {
    version: CURRENT_STORAGE_VERSION,
    subjects,
    activePlan,
    historyPlans,
    preferences,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Safely load application data from localStorage.
 * Handles missing, corrupted, or incompatible stored data without throwing.
 */
export function loadFromStorage(): StorageSchemaV1 {
  if (typeof window === 'undefined') {
    return INITIAL_STORAGE_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_STORAGE_STATE;
    }

    const parsed = JSON.parse(raw);
    return migrateData(parsed);
  } catch (error) {
    console.warn(
      '[StudyFlow Storage] Failed to parse stored state. Corrupted JSON detected. Reverting to safe default.',
      error
    );
    return INITIAL_STORAGE_STATE;
  }
}

/**
 * Safely save data to localStorage.
 */
export function saveToStorage(state: StorageSchemaV1): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const payload: StorageSchemaV1 = {
      ...state,
      version: CURRENT_STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('[StudyFlow Storage] Failed to write state to localStorage (QuotaExceeded or disabled):', error);
    return false;
  }
}

/**
 * Export data as formatted JSON string for backup/download.
 */
export function exportStorageData(state: StorageSchemaV1): string {
  return JSON.stringify(
    {
      ...state,
      exportedAt: new Date().toISOString(),
      appName: 'StudyFlow AI',
    },
    null,
    2
  );
}

/**
 * Import and validate imported JSON data.
 */
export function importStorageData(jsonString: string): { success: boolean; data?: StorageSchemaV1; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const migrated = migrateData(parsed);
    return { success: true, data: migrated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Invalid JSON file format',
    };
  }
}

/**
 * Clear application data from localStorage.
 */
export function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[StudyFlow Storage] Failed to clear localStorage:', error);
  }
}
