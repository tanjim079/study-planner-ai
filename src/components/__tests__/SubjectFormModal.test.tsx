import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubjectFormModal } from '../subjects/SubjectFormModal';

describe('SubjectFormModal Component', () => {
  it('renders modal with empty fields in create mode', () => {
    render(
      <SubjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Subject')).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject Name/)).toHaveValue('');
  });

  it('validates required fields and shows error on empty submission', async () => {
    const handleSubmit = vi.fn();
    render(
      <SubjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Create Subject' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Subject name cannot be empty')).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('allows adding and removing study topics', () => {
    render(
      <SubjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const addTopicBtn = screen.getByRole('button', { name: 'Add Topic' });
    fireEvent.click(addTopicBtn);

    const topicInputs = screen.getAllByPlaceholderText(/Topic #/);
    expect(topicInputs.length).toBe(2);
  });

  it('submits valid data correctly', async () => {
    const handleSubmit = vi.fn();
    render(
      <SubjectFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Subject Name/), {
      target: { value: 'Machine Learning' },
    });

    const topicInput = screen.getByPlaceholderText(/Topic #1 name/);
    fireEvent.change(topicInput, {
      target: { value: 'Gradient Descent' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Create Subject' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = handleSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe('Machine Learning');
    expect(submittedData.topics[0].name).toBe('Gradient Descent');
  });
});
