import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '../common/ConfirmDialog';

describe('ConfirmDialog Component', () => {
  it('renders title, message, and buttons when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Deletion"
        message="Are you sure you want to delete this subject?"
        confirmLabel="Yes, Delete"
      />
    );

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this subject?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
  });

  it('triggers onConfirm and onClose when confirmed', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete"
        message="Message"
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
