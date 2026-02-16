import { useState } from 'react';
import { StudentSidebar } from './dashboard/sidebar';
import { StudentTopNav } from './dashboard/top-nav';
import { StudentVendorsSimple } from './student-vendors-simple';

export function VendorListingPage() {
  const [activeSection, setActiveSection] = useState('vendors');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentTopNav onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 lg:px-8">
            <StudentVendorsSimple />
          </div>
        </main>
      </div>
    </div>
  );
}
