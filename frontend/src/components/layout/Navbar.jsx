import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Check, CheckCheck, RefreshCw, CalendarCheck, Clock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const Navbar = ({ role, title = 'Dashboard' }) => {
  const { adminAuth, doctorAuth, patientAuth, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  let user = null;
  if (role === 'admin') user = adminAuth.user;
  if (role === 'doctor') user = doctorAuth.user;
  if (role === 'patient') user = patientAuth.user;

  // Fetch notifications for the logged in user
  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifs(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Quiet fail if not logged in or backend booting
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [role]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When opening dropdown: toggle open, and if unread > 0, mark all as read
  const handleToggleNotifications = async () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);

    if (nextState && unreadCount > 0) {
      try {
        // Optimistically clear unread count and mark items read
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        await api.patch('/notifications/read-all');
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleLogout = () => {
    logout(role);
    if (role === 'admin') navigate('/login/admin');
    else if (role === 'doctor') navigate('/login/doctor');
    else if (role === 'patient') navigate('/login/patient');
    else navigate('/');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell with Unread Badge & Interactive Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            className={`p-2 rounded-xl transition-all relative ${
              isNotifOpen
                ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-white shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Popover */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {role === 'doctor' ? 'Clinical Alerts' : 'Notifications'}
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={fetchNotifications}
                    disabled={isLoadingNotifs}
                    title="Refresh"
                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNotifs ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-medium inline-flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Read all</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 text-xs transition-colors flex items-start gap-3 ${
                        !notif.is_read
                          ? 'bg-sky-50/70 hover:bg-sky-50 text-slate-900'
                          : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        !notif.is_read
                          ? 'bg-brand-100 text-brand-700 font-bold'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <CalendarCheck className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`leading-snug ${!notif.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {notif.message}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(notif.created_at)}</span>
                          {!notif.is_read && (
                            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-1.5">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                    <p className="text-xs font-semibold text-slate-600">No notifications</p>
                    <p className="text-[11px] text-slate-400">You're completely up to date.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-white border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-medium">
                  Auto-syncs live appointment alerts
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
            {user?.name ? user.name.charAt(0) : role.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {user?.name || user?.hospital_name || 'Authorized User'}
            </p>
            <p className="text-xs text-slate-400 capitalize">{role} Portal</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
