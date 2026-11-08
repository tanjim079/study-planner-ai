import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from '../layout/Sidebar';
import { MobileNav } from '../layout/MobileNav';
import { StudyProvider } from '@/context/StudyContext';

describe('Sidebar Component', () => {
  it('renders all navigation items and handles tab clicks', () => {
    const handleSelectTab = vi.fn();
    const handleToggleCollapse = vi.fn();

    render(
      <StudyProvider>
        <Sidebar
          activeTab="dashboard"
          onSelectTab={handleSelectTab}
          isCollapsed={false}
          onToggleCollapse={handleToggleCollapse}
        />
      </StudyProvider>
    );

    expect(screen.getByText('StudyFlow')).toBeInTheDocument();
    expect(screen.getByText('My Subjects')).toBeInTheDocument();
    expect(screen.getByText('AI Study Planner')).toBeInTheDocument();
    expect(screen.getByText('Study Schedule')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    const plannerBtn = screen.getByRole('button', { name: /AI Study Planner/i });
    fireEvent.click(plannerBtn);
    expect(handleSelectTab).toHaveBeenCalledWith('planner');
  });

  it('renders in collapsed mode correctly', () => {
    render(
      <StudyProvider>
        <Sidebar
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        />
      </StudyProvider>
    );

    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });
});

describe('MobileNav Component', () => {
  it('renders mobile navigation drawer when open', () => {
    const handleSelectTab = vi.fn();
    const handleClose = vi.fn();

    render(
      <StudyProvider>
        <MobileNav
          isOpen={true}
          onClose={handleClose}
          activeTab="dashboard"
          onSelectTab={handleSelectTab}
        />
      </StudyProvider>
    );

    expect(screen.getByRole('dialog', { name: 'Mobile Navigation' })).toBeInTheDocument();

    const subjectsBtn = screen.getByRole('button', { name: /My Subjects/i });
    fireEvent.click(subjectsBtn);
    expect(handleSelectTab).toHaveBeenCalledWith('subjects');
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <StudyProvider>
        <MobileNav
          isOpen={false}
          onClose={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
        />
      </StudyProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
