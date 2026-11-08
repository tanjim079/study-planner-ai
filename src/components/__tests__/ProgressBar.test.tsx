import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../common/ProgressBar';

describe('ProgressBar Component', () => {
  it('renders with correct percentage and accessibility attributes', () => {
    render(<ProgressBar value={75} label="Calculus Progress" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Calculus Progress')).toBeInTheDocument();
  });

  it('clamps values below 0 to 0', () => {
    render(<ProgressBar value={-20} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps values above 100 to 100', () => {
    render(<ProgressBar value={150} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('hides percentage text when showPercentage is false', () => {
    render(<ProgressBar value={50} showPercentage={false} label="Hidden %" />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.getByText('Hidden %')).toBeInTheDocument();
  });
});
