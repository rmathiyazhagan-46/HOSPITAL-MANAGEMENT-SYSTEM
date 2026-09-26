import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatWidget from '../chatbot/ChatWidget';

const DashboardShell = ({ role, title, children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role={role} title={title} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Chatbot Assistant available strictly for Patient Portal */}
      {role === 'patient' && <ChatWidget />}
    </div>
  );
};

export default DashboardShell;
