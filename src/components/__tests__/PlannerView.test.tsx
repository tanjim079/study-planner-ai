import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlannerView } from '../planner/PlannerView';
import { StudyProvider } from '@/context/StudyContext';

describe('PlannerView Component', () => {
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
});

