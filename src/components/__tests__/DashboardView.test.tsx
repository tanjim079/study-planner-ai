import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardView } from '../dashboard/DashboardView';
import { StudyProvider } from '@/context/StudyContext';

describe('DashboardView Component', () => {
  it('renders empty state initially when no subjects exist', () => {
    const handleNavigate = vi.fn();
    render(
      <StudyProvider>
        <DashboardView onNavigate={handleNavigate} />
      </StudyProvider>
    );

    expect(screen.getByText('Plan Smarter. Study Better.')).toBeInTheDocument();
    expect(screen.getByText('No study sessions scheduled for today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Your First Subject' })).toBeInTheDocument();
  });

  it('navigates to subjects view when clicking Add Your First Subject', () => {
    const handleNavigate = vi.fn();
    render(
      <StudyProvider>
        <DashboardView onNavigate={handleNavigate} />
      </StudyProvider>
    );

    const btn = screen.getByRole('button', { name: 'Add Your First Subject' });
    fireEvent.click(btn);
    expect(handleNavigate).toHaveBeenCalledWith('subjects');
  });
});
