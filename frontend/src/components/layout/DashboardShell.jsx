import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatWidget from '../chatbot/ChatWidget';

const DashboardShell = ({ role, title, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-clip">
      <Sidebar
        role={role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          role={role}
          title={title}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-5 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Chatbot Assistant available strictly for Patient Portal */}
      {role === 'patient' && <ChatWidget />}
    </div>
  );
};

export default DashboardShell;
