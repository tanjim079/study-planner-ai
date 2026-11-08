import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Alert } from '../common/Alert';

describe('Alert Component', () => {
  it('renders title and message with correct role', () => {
    render(
      <Alert type="error" title="Capacity Error">
        Time limit exceeded by 2 hours.
      </Alert>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Capacity Error')).toBeInTheDocument();
    expect(screen.getByText('Time limit exceeded by 2 hours.')).toBeInTheDocument();
  });

  it('renders info alert with status role', () => {
    render(
      <Alert type="info" title="Offline Mode">
        Algorithmic scheduling active.
      </Alert>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Alert type="warning" title="Warning" onClose={handleClose}>
        Exam deadline approaching.
      </Alert>
    );

    const closeBtn = screen.getByLabelText('Dismiss alert');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

