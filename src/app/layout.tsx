import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StudyProvider } from '@/context/StudyContext';
import { LiveAnnouncer } from '@/components/common/LiveAnnouncer';

export const metadata: Metadata = {
  title: 'StudyFlow AI — Intelligent Study Planner',
  description:
    'Plan Smarter. Study Better. Personalized AI-powered study schedules for university students, optimizing for examination deadlines and subject difficulties.',
  keywords: [
    'study planner',
    'AI study planner',
    'exam schedule',
    'university productivity',
    'spaced repetition',
    'academic scheduling',
  ],
  authors: [{ name: 'StudyFlow AI Team' }],
  openGraph: {
    title: 'StudyFlow AI — Intelligent Study Planner',
    description: 'Plan Smarter. Study Better. Personalized AI-powered daily study schedules.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563EB',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        <StudyProvider>
          <LiveAnnouncer />
          {children}
        </StudyProvider>
      </body>
    </html>
  );
}
