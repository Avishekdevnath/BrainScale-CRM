import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Chat',
  description: 'Real-time team messaging and collaboration',
};

interface TeamChatLayoutProps {
  children: ReactNode;
}

/**
 * Layout component for Team Chat feature
 * Provides the overall structure for the team chat page
 */
export default function TeamChatLayout({ children }: TeamChatLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {children}
    </div>
  );
}
