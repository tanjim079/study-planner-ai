import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubjectCard } from '../subjects/SubjectCard';
import { Subject } from '@/types';

describe('SubjectCard Component', () => {
  const mockSubject: Subject = {
    id: 'sub-1',
    name: 'Organic Chemistry',
    description: 'Reaction mechanisms and synthesis',
    difficulty: 'hard',
    deadline: '2026-11-20',
    priority: 'high',
    color: '#2563EB',
    topics: [
      { id: 'top-1', name: 'Alkanes & Alkenes', estimatedMinutes: 45 },
      { id: 'top-2', name: 'Aromaticity', estimatedMinutes: 60 },
    ],
    createdAt: '2026-11-08T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
  };

  it('renders subject name, description, and difficulty badge', () => {
    render(
      <SubjectCard
        subject={mockSubject}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Organic Chemistry')).toBeInTheDocument();
    expect(screen.getByText('Reaction mechanisms and synthesis')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('renders topics list with durations', () => {
    render(
      <SubjectCard
        subject={mockSubject}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/Alkanes & Alkenes/)).toBeInTheDocument();
    expect(screen.getByText(/Aromaticity/)).toBeInTheDocument();
  });

  it('triggers onEdit callback when edit button clicked', () => {
    const handleEdit = vi.fn();
    render(
      <SubjectCard
        subject={mockSubject}
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByLabelText('Edit subject Organic Chemistry');
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockSubject);
  });

  it('triggers onDelete callback when delete button clicked', () => {
    const handleDelete = vi.fn();
    render(
      <SubjectCard
        subject={mockSubject}
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />
    );

    const deleteBtn = screen.getByLabelText('Delete subject Organic Chemistry');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('sub-1');
  });
});

