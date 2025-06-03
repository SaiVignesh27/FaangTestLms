import React from 'react';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSidebar } from '@/contexts/SidebarContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLocation } from 'wouter';

export default function Header() {
  const { toggleTheme, theme } = useTheme();
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [location] = useLocation();
  
  // Get page title based on current location
  const getPageTitle = () => {
    if (location.startsWith('/admin')) {
      if (location === '/admin/dashboard') return 'Admin Dashboard';
      if (location === '/admin/users') return 'User Management';
      if (location === '/admin/courses') return 'Course Management';
      if (location === '/admin/classes') return 'Class Management';
      if (location === '/admin/tests') return 'Test Management';
      if (location === '/admin/assignments') return 'Assignment Management';
      if (location === '/admin/leaderboard') return 'Leaderboard';
      if (location === '/admin/profile') return 'Profile';
      return 'Admin Portal';
    }
    
    if (location.startsWith('/student')) {
      if (location === '/student/dashboard') return 'Student Dashboard';
      if (location === '/student/courses') return 'My Courses';
      if (location === '/student/daily-tests') return 'Daily Tests';
      if (location === '/student/assignments') return 'My Assignments';
      if (location === '/student/leaderboard') return 'Leaderboard';
      if (location === '/student/profile') return 'Profile';
      return 'Student Portal';
    }
    
    return 'CodeGym LMS';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    
    return names[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="p-1.5 mr-2 rounded-md md:hidden hover:bg-[var(--hover-bg)]"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-[var(--icon-primary)]" />
          </button>
          <h1 className="text-lg font-medium text-[var(--text-primary)] hidden sm:block">
            {getPageTitle()}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-[var(--hover-bg)]"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-[var(--icon-primary)]" />
            ) : (
              <Moon className="h-5 w-5 text-[var(--icon-primary)]" />
            )}
          </button>
          
          <div className="relative">
            <button 
              className="p-1.5 rounded-md hover:bg-[var(--hover-bg)] relative"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5 text-[var(--icon-primary)]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </button>
          </div>
          
          <div className="flex items-center pl-2 border-l border-[var(--border-color)]">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-white">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:block ml-2 text-[var(--text-primary)]">
              {user?.name || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
