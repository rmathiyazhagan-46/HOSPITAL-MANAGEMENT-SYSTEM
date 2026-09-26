import React, { useState } from 'react';
import { MessageSquare, Bot, Sparkles, X } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { useAuth } from '../../context/AuthContext';

const ChatWidget = () => {
  const { user, activeRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Chatbot Assistant is strictly patient-facing per specification
  if (activeRole === 'admin' || activeRole === 'doctor' || (user && user.role && user.role !== 'patient')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <ChatWindow onClose={() => setIsOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-brand-600 via-brand-700 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white pl-4 pr-5 py-3.5 rounded-full shadow-2xl hover:shadow-brand-500/30 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
          aria-label="Open HealthBot AI Assistant"
        >
          {/* Subtle pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-brand-400/30 animate-ping pointer-events-none" />

          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-brand-700 animate-pulse" />
          </div>

          <div className="text-left">
            <p className="text-xs font-bold leading-none flex items-center gap-1.5">
              <span>HealthBot Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 group-hover:rotate-12 transition-transform" />
            </p>
            <p className="text-[10px] text-brand-100 font-medium leading-tight mt-0.5">
              Online Triage &amp; Booking
            </p>
          </div>
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
