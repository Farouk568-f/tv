import React from 'react';
import Layout from '../components/Layout';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';

const SettingsRow: React.FC<{icon: string, title: string, subtitle?: string, children: React.ReactNode}> = ({icon, title, subtitle, children}) => {
    return (
        <div className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-4">
                <i className={`${icon} w-6 text-center text-xl text-[var(--primary)]`}></i>
                <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    {subtitle && <p className="text-sm text-[var(--text-dark)]">{subtitle}</p>}
                </div>
            </div>
            <div>
                {children}
            </div>
        </div>
    )
}

const SettingsPage: React.FC = () => {
  const { isDarkMode, setDarkMode, clearAllData } = useProfile();
  const { t, language, setLanguage } = useTranslation();

  const handleClearData = () => {
    if (window.confirm(t('clearAllDataConfirm'))) {
      clearAllData();
      window.location.hash = '#/';
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="mb-8 text-3xl font-bold">{t('settings')}</h1>

        <div className="space-y-8">
          {/* App Settings Section */}
          <section className="space-y-4">
             <SettingsRow icon="fa-solid fa-language" title={t('language')}>
                 <div className="flex gap-2">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${language === 'en' ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => setLanguage('ar')}
                        className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${language === 'ar' ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-gray-300'}`}
                    >
                        العربية
                    </button>
                </div>
             </SettingsRow>
             <SettingsRow icon="fa-solid fa-circle-half-stroke" title={t('appearance')}>
                <div className="flex items-center justify-between">
                  <label htmlFor="dark-mode-toggle-settings" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="dark-mode-toggle-settings"
                      checked={isDarkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>
             </SettingsRow>
          </section>
          
          {/* Data Management Section */}
          <section className='space-y-4'>
            <SettingsRow icon="fa-solid fa-database" title={t('dataManagement')}>
                <button
                    onClick={handleClearData}
                    className="px-4 py-1.5 text-sm font-bold text-red-400 bg-red-500/10 rounded-lg transition-colors"
                >
                    {t('clearAllData')}
                </button>
            </SettingsRow>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;