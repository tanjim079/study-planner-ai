import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsView } from '../settings/SettingsView';
import { Navbar } from '../layout/Navbar';
import { StudyProvider } from '@/context/StudyContext';

describe('SettingsView Component', () => {
  it('renders theme selector and data persistence options', () => {
    render(
      <StudyProvider>
        <SettingsView />
      </StudyProvider>
    );

    expect(screen.getByText('Appearance & Theme')).toBeInTheDocument();
    expect(screen.getByText('Accessibility (WCAG 2.1 AA)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Backup (JSON)' })).toBeInTheDocument();
  });
});

describe('Navbar Component', () => {
  it('renders active tab title and quick actions', () => {
    render(
      <StudyProvider>
        <Navbar
          activeTab="dashboard"
          onOpenMobileMenu={vi.fn()}
          onNavigateToPlanner={vi.fn()}
          onNavigateToSubjects={vi.fn()}
        />
      </StudyProvider>
    );

    expect(screen.getByText('Study Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Plan' })).toBeInTheDocument();
  });
});

