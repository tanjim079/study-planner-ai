import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubjectsView } from '../subjects/SubjectsView';
import { StudyProvider } from '@/context/StudyContext';

describe('SubjectsView Component', () => {
  it('renders empty state when no subjects are available', () => {
    render(
      <StudyProvider>
        <SubjectsView onNavigateToPlanner={vi.fn()} />
      </StudyProvider>
    );

    expect(screen.getByText('No subjects created yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Your First Subject' })).toBeInTheDocument();
  });

  it('opens subject creation modal when clicking Add Subject button', () => {
    render(
      <StudyProvider>
        <SubjectsView onNavigateToPlanner={vi.fn()} />
      </StudyProvider>
    );

    const addButtons = screen.getAllByRole('button', { name: /Add Subject/i });
    fireEvent.click(addButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Subject')).toBeInTheDocument();
  });
});

