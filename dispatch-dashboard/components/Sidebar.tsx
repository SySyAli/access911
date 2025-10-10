'use client';

import React from 'react';

type ActiveTab = 'dashboard' | 'map' | 'history' | 'analytics';

interface SidebarProps {
  cityName: string;
  activeCount: number;
  theme: 'light' | 'dark';
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onThemeToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ cityName, activeCount, theme, activeTab, onTabChange, onThemeToggle }) => {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-20 z-30 flex flex-col items-center py-10" style={{
      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(30px)',
      borderRight: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: theme === 'dark' ? '4px 0 24px rgba(0, 0, 0, 0.3)' : '4px 0 24px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Navigation Items */}
      <nav 
        className="flex-1 flex flex-col items-center gap-6"
        style={{ marginTop: '2rem' }}
      >
        {/* Dashboard */}
        <button 
          onClick={() => onTabChange('dashboard')}
          className="relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group"
          style={{
            background: activeTab === 'dashboard' 
              ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
            border: activeTab === 'dashboard'
              ? (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)'),
            boxShadow: activeTab === 'dashboard' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'dashboard') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'dashboard') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg className="w-6 h-6" style={{ 
            color: activeTab === 'dashboard' 
              ? (theme === 'dark' ? '#000000' : '#ffffff')
              : '#888888'
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold animate-pulse">
              {activeCount}
            </span>
          )}
          <div 
            className="absolute left-full ml-4 px-4 py-2 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            Dashboard
          </div>
        </button>

        {/* Map */}
        <button 
          onClick={() => onTabChange('map')}
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group"
          style={{
            background: activeTab === 'map' 
              ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
            backdropFilter: 'blur(20px)',
            border: activeTab === 'map'
              ? (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)'),
            boxShadow: activeTab === 'map' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'map') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'map') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg className="w-6 h-6" style={{ 
            color: activeTab === 'map' 
              ? (theme === 'dark' ? '#000000' : '#ffffff')
              : '#888888'
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <div 
            className="absolute left-full ml-4 px-4 py-2 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            Map View
          </div>
        </button>

        {/* History */}
        <button 
          onClick={() => onTabChange('history')}
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group"
          style={{
            background: activeTab === 'history' 
              ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
            backdropFilter: 'blur(20px)',
            border: activeTab === 'history'
              ? (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)'),
            boxShadow: activeTab === 'history' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'history') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'history') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg className="w-6 h-6" style={{ 
            color: activeTab === 'history' 
              ? (theme === 'dark' ? '#000000' : '#ffffff')
              : '#888888'
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div 
            className="absolute left-full ml-4 px-4 py-2 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            History
          </div>
        </button>

        {/* Analytics */}
        <button 
          onClick={() => onTabChange('analytics')}
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 group"
          style={{
            background: activeTab === 'analytics' 
              ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
            backdropFilter: 'blur(20px)',
            border: activeTab === 'analytics'
              ? (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(0, 0, 0, 0.9)')
              : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)'),
            boxShadow: activeTab === 'analytics' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'analytics') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'analytics') {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg className="w-6 h-6" style={{ 
            color: activeTab === 'analytics' 
              ? (theme === 'dark' ? '#000000' : '#ffffff')
              : '#888888'
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div 
            className="absolute left-full ml-4 px-4 py-2 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            Simulation
          </div>
        </button>
      </nav>

      {/* Theme Toggle Icon Only */}
      <div className="mt-auto mb-6">
        <button 
          onClick={onThemeToggle}
          className="relative flex items-center justify-center transition-all duration-200 group"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px',
            cursor: 'pointer'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.9)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {theme === 'dark' ? (
            <svg className="w-7 h-7 transition-opacity" style={{ color: '#ffffff', opacity: 0.7 }} fill="currentColor" viewBox="0 0 20 20"
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-7 h-7 transition-opacity" style={{ color: '#000000', opacity: 0.7 }} fill="currentColor" viewBox="0 0 20 20"
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
          <div 
            className="absolute left-full ml-4 px-4 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              color: '#ffffff'
            }}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;