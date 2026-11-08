import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadFromStorage,
  saveToStorage,
  exportStorageData,
  importStorageData,
  clearStorage,
  STORAGE_KEY,
  INITIAL_STORAGE_STATE,
} from '../storage';
import { StorageSchemaV1 } from '@/types';

describe('Storage Persistence & Versioning', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default initial state when storage is empty', () => {
    const data = loadFromStorage();
    expect(data.version).toBe(1);
    expect(data.subjects).toEqual([]);
    expect(data.activePlan).toBeNull();
  });

  it('saves and reloads state accurately', () => {
    const mockState: StorageSchemaV1 = {
      version: 1,
      subjects: [
        {
          id: 'sub-test',
          name: 'Physics',
          difficulty: 'hard',
          deadline: '2026-11-20',
          priority: 'high',
          topics: [{ id: 'top-1', name: 'Optics', estimatedMinutes: 45 }],
          createdAt: '2026-11-08T00:00:00.000Z',
          updatedAt: '2026-11-08T00:00:00.000Z',
        },
      ],
      activePlan: null,
      historyPlans: [],
      preferences: {
        dailyStudyHours: 5,
        preferredSessionMinutes: 45,
        planningPeriodDays: 7,
        theme: 'light',
        reducedMotion: false,
        highContrast: false,
      },
      lastUpdated: '2026-11-08T00:00:00.000Z',
    };

    saveToStorage(mockState);
    const loaded = loadFromStorage();
    expect(loaded.subjects.length).toBe(1);
    expect(loaded.subjects[0].name).toBe('Physics');
    expect(loaded.preferences.dailyStudyHours).toBe(5);
  });

  it('recovers gracefully from corrupted JSON in localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'invalid-json-string{malformed]');
    const data = loadFromStorage();
    expect(data).toBeDefined();
    expect(data.subjects).toEqual([]);
    expect(data.version).toBe(1);
  });

  it('exports and imports backup JSON correctly', () => {
    const sampleState: StorageSchemaV1 = {
      ...INITIAL_STORAGE_STATE,
      subjects: [
        {
          id: 'sub-sample',
          name: 'Computer Networks',
          difficulty: 'medium',
          deadline: '2026-11-25',
          priority: 'medium',
          topics: [{ id: 't1', name: 'TCP/IP', estimatedMinutes: 50 }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const exportedJson = exportStorageData(sampleState);
    expect(typeof exportedJson).toBe('string');

    const importRes = importStorageData(exportedJson);
    expect(importRes.success).toBe(true);
    expect(importRes.data?.subjects[0].name).toBe('Computer Networks');
  });

  it('handles invalid imported JSON gracefully', () => {
    const res = importStorageData('not a json');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('clears storage properly', () => {
    saveToStorage(INITIAL_STORAGE_STATE);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearStorage();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
