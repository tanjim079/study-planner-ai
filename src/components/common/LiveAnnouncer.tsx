'use client';

import React from 'react';
import { useStudy } from '@/context/StudyContext';

export function LiveAnnouncer() {
  const { announcement } = useStudy();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
