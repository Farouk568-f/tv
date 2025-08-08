import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useCursor } from '../contexts/CursorContext';

const SideNavbar: React.FC = () => {
    const { t } = useTranslation();
    const { activeProfile } = useProfile();
    const navigate = useNavigate();
    const navItems = [
        { to: '/home', icon: 'fa-home', text: t('home') },
        { to: '/search', icon: 'fa-solid fa-magnifying-glass', text: t('search') },
        { to: '/you', icon: 'fa-solid fa-circle-user', text: t('you') },
        { to: '/settings', icon: 'fa-solid fa-cog', text: t('settings') },
    ];

    return (
        <nav className="fixed top-0 left-0 z-50 h-screen w-24 bg-black/50 backdrop-blur-lg flex flex-col items-center justify-center gap-y-8 border-r border-white/10">
             <h1 onClick={() => navigate('/home')} className="text-3xl font-extrabold text-white cursor-pointer absolute top-6" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                CS
            </h1>

            {navItems.map((item) => (
                 <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 w-16 h-16 outline-none focusable focusable-text text-zinc-400"
                  onClick={(e) => { e.preventDefault(); navigate(item.to); }}
                >
                  <i className={`fa ${item.icon} text-2xl`}></i>
                  <span className="text-xs font-medium mt-1.5">{item.text}</span>
                </NavLink>
              )
            )}
             {activeProfile && (
                <img 
                    src={activeProfile.avatar} 
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover absolute bottom-6 border-2 border-zinc-700"
                />
            )}
        </nav>
    );
};


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);
  const { scrollContainerRef } = useCursor();

  useEffect(() => {
    if (!activeProfile) {
      navigate('/', { replace: true });
    }
  }, [activeProfile, navigate]);

  useEffect(() => {
    if (mainContentRef.current) {
      scrollContainerRef.current = mainContentRef.current;
    }
    return () => {
      if (scrollContainerRef.current === mainContentRef.current) {
        scrollContainerRef.current = null;
      }
    };
  }, [scrollContainerRef, location.pathname]);


  if (!activeProfile) {
    return null; 
  }

  const noLayout = location.pathname.startsWith('/player');
  if (noLayout) {
      return <>{children}</>
  }

  return (
    <div className="flex h-screen text-[var(--text-light)] bg-[var(--background)] transition-colors duration-300">
      <SideNavbar />
      <main ref={mainContentRef} id="main-content-area" key={location.pathname} className={`flex-1 overflow-y-auto no-scrollbar animate-page-enter ml-24`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;