import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useAuth } from '@/providers/AuthProvider';
import { Redirect } from 'wouter';

interface StudentLayoutProps {
  children: React.ReactNode;
  hideSidebarAndHeader?: boolean;
}

export default function StudentLayout({ children, hideSidebarAndHeader = false }: StudentLayoutProps) {
  const { isLoggedIn, isStudent, loading } = useAuth();
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isLoggedIn || !isStudent) {
    return <Redirect to="/login" />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
        {!hideSidebarAndHeader && !isFullScreen && <Sidebar />}
        <div className={`flex-1 flex flex-col overflow-hidden ${(isFullScreen || hideSidebarAndHeader) ? 'w-full' : ''}`}>
          {!hideSidebarAndHeader && !isFullScreen && <Header />}
          <main className="flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
