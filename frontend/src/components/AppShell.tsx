import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LocationPermissionPrompt } from './LocationPermissionPrompt';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user is a student
  const userRole = localStorage.getItem('user_role');
  const isStudent = userRole === 'student';

  // Verification polling removed - admin-only verification workflow

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="px-3 sm:px-6 md:px-8 lg:px-16 py-6 sm:py-8 md:py-12 lg:py-16">
            {children}
          </div>
        </main>
      </div>
      {/* Location permission prompt for students */}
      {isStudent && <LocationPermissionPrompt />}
    </div>
  );
}

