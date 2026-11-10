import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannerView } from '../planner/PlannerView';
import { StudyProvider } from '@/context/StudyContext';
import { saveToStorage, clearStorage } from '@/lib/storage';
import { StudyPlan, Subject } from '@/types';

const sampleSubject: Subject = {
  id: 'sub-phys',
  name: 'Physics I',
  difficulty: 'hard',
  deadline: '2026-11-20',
  topics: [{ id: 'top-1', name: 'Newton Laws', estimatedMinutes: 60 }],
  priority: 'high',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAiPlan: StudyPlan = {
  id: 'plan-ai-1',
  planTitle: 'Physics Sprint AI Plan',
  summary: 'AI-tailored study plan focusing on mechanics.',
  generatedAt: new Date().toISOString(),
  planningPeriodDays: 7,
  startDate: '2026-11-09',
  dailyHoursLimit: 2,
  preferredSessionMinutes: 45,
  isAiGenerated: true,
  modelUsed: 'gemini-3.8-flash',
  days: [
    {
      date: '2026-11-09',
      tasks: [
        {
          id: 'task-1',
          subjectId: 'sub-phys',
          subjectName: 'Physics I',
          topic: 'Newton Laws',
          durationMinutes: 45,
          priority: 'high',
          reason: 'Core foundational mechanics',
          completed: false,
          completedAt: null,
        },
      ],
    },
  ],
  warnings: [],
};

const mockBasicPlan: StudyPlan = {
  ...mockAiPlan,
  id: 'plan-basic-1',
  planTitle: 'Physics Structured Plan (Basic Plan)',
  isAiGenerated: false,
  modelUsed: 'Deterministic Fallback Planner (No External AI)',
};

describe('PlannerView Component', () => {
  beforeEach(() => {
    clearStorage();
  });

  it('shows empty prompt when no subjects exist', () => {
    const handleNavigate = vi.fn();
    render(
      <StudyProvider>
        <PlannerView
          onNavigateToSchedule={vi.fn()}
          onNavigateToSubjects={handleNavigate}
        />
      </StudyProvider>
    );

    expect(screen.getByText('No Subjects Available for Planning')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Add Subjects First' });
    fireEvent.click(btn);
    expect(handleNavigate).toHaveBeenCalled();
  });

  it('renders "AI Plan" badge when active plan is AI generated', () => {
    saveToStorage({
      subjects: [sampleSubject],
      activePlan: mockAiPlan,
    });

    render(
      <StudyProvider>
        <PlannerView
          onNavigateToSchedule={vi.fn()}
          onNavigateToSubjects={vi.fn()}
        />
      </StudyProvider>
    );

    const badge = screen.getByTestId('planner-plan-badge');
    expect(badge).toHaveTextContent('AI Plan');
    expect(screen.getByText('Physics Sprint AI Plan')).toBeInTheDocument();
  });

  it('renders "Basic Plan" badge when active plan is deterministic fallback', () => {
    saveToStorage({
      subjects: [sampleSubject],
      activePlan: mockBasicPlan,
    });

    render(
      <StudyProvider>
        <PlannerView
          onNavigateToSchedule={vi.fn()}
          onNavigateToSubjects={vi.fn()}
        />
      </StudyProvider>
    );

    const badge = screen.getByTestId('planner-plan-badge');
    expect(badge).toHaveTextContent('Basic Plan');
    expect(screen.getByText('Physics Structured Plan (Basic Plan)')).toBeInTheDocument();
  });

  it('displays distinct UX feedback when Gemini is temporarily unavailable', async () => {
    saveToStorage({
      subjects: [sampleSubject],
    });

    // Mock API responding with temporarily unavailable fallback
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        plan: {
          ...mockBasicPlan,
          warnings: ['Gemini is temporarily unavailable. A Basic Plan has been generated so you can continue studying.'],
        },
        isAiGenerated: false,
        fallbackTriggered: true,
      }),
    });

    render(
      <StudyProvider>
        <PlannerView
          onNavigateToSchedule={vi.fn()}
          onNavigateToSubjects={vi.fn()}
        />
      </StudyProvider>
    );

    const generateBtn = screen.getByRole('button', { name: /generate ai plan/i });
    fireEvent.click(generateBtn);

    expect(
      await screen.findByText('Gemini is temporarily unavailable. A Basic Plan has been generated so you can continue studying.')
    ).toBeInTheDocument();
  });

  it('displays distinct UX feedback when Gemini quota is exhausted', async () => {
    saveToStorage({
      subjects: [sampleSubject],
    });

    // Mock API responding with quota exhausted fallback
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        plan: {
          ...mockBasicPlan,
          warnings: ['Gemini API quota exhausted. A Basic Plan has been generated so you can continue studying.'],
        },
        isAiGenerated: false,
        fallbackTriggered: true,
      }),
    });

    render(
      <StudyProvider>
        <PlannerView
          onNavigateToSchedule={vi.fn()}
          onNavigateToSubjects={vi.fn()}
        />
      </StudyProvider>
    );

    const generateBtn = screen.getByRole('button', { name: /generate ai plan/i });
    fireEvent.click(generateBtn);

    expect(
      await screen.findByText('Gemini quota exhausted. A Basic Plan has been generated so you can continue studying.')
    ).toBeInTheDocument();
  });
});
