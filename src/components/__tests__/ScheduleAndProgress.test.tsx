import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScheduleView } from '../schedule/ScheduleView';
import { ProgressView } from '../progress/ProgressView';
import { StudyProvider } from '@/context/StudyContext';

describe('ScheduleView Component', () => {
  it('renders empty schedule prompt when no plan is active', () => {
    render(
      <StudyProvider>
        <ScheduleView
          onNavigateToPlanner={vi.fn()}
          onNavigateToSubjects={vi.fn()}
        />
      </StudyProvider>
    );

    expect(screen.getByText('No Study Schedule Active')).toBeInTheDocument();
  });
});

describe('ProgressView Component', () => {
  it('renders empty progress state when no tasks exist', () => {
    render(
      <StudyProvider>
        <ProgressView
          onNavigateToSchedule={vi.fn()}
          onNavigateToPlanner={vi.fn()}
        />
      </StudyProvider>
    );

    expect(screen.getByText('No Study Progress Data Available')).toBeInTheDocument();
  });
});

