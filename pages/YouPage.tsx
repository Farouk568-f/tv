import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';
import { HistoryItem, FavoriteItem, DownloadItem, Movie } from '../types';
import Layout from '../components/Layout';
import { fetchFromTMDB } from '../services/apiService';

const ProfileHeader: React.FC<{ profile: any; onSearch: () => void; onSettings: () => void }> = ({ profile, onSearch, onSettings }) => {
    const { t } = useTranslation();
    return (
        <header className="flex items-start justify-between focusable p-4 rounded-lg">
            <div className="flex items-center gap-4">
                <img src={profile.avatar} alt="Profile Avatar" className="w-20 h-20 rounded-full border-2 border-zinc-700" />
                <div>
                    <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                    <p className="text-base text-gray-400">@{profile.name.toLowerCase().replace(/\s/g, '')} • <span className="text-blue-400 cursor-pointer hover:underline">{t('viewChannel')}</span></p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={onSearch} aria-label={t('search')} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-700 transition-colors btn-press focusable">
                    <i className="fa-solid fa-magnifying-glass text-xl text-white"></i>
                </button>
                <button onClick={onSettings} aria-label={t('settings')} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-700 transition-colors btn-press focusable">
                    <i className="fa-solid fa-cog text-xl text-white"></i>
                </button>
            </div>
        </header>
    );
};


const SectionHeader: React.FC<{ title: string; onClick?: () => void }> = ({ title, onClick }) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {onClick && (
                <button onClick={onClick} className="px-4 py-2 text-base font-semibold text-blue-400 hover:bg-blue-400/10 rounded-full transition-colors focusable focusable-text">
                    {t('viewAll')}
                </button>
            )}
        </div>
    );
};

const HistoryCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
    const navigate = useNavigate();
    const handleClick = () => navigate(`/details/${item.type}/${item.id}`);
    const progress = (item.currentTime / item.duration) * 100;

    return (
        <div onClick={handleClick} tabIndex={-1} className="flex-shrink-0 w-80 cursor-pointer group focusable rounded-2xl">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-800 shadow-lg">
                <img src={item.itemImage} alt={item.title} className="w-full aspect-video object-cover" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-600/50">
                    <div className="h-full bg-red-600" style={{ width: `${progress}%` }}></div>
                </div>
                 <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded">
                    {new Date(item.duration * 1000).toISOString().substr(14, 5)}
                 </span>
            </div>
            <div className="flex items-start gap-3 pt-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-white line-clamp-2 leading-tight text-base">{item.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">CineStream</p>
                </div>
                <button onClick={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-white focusable">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </div>
        </div>
    );
};

const PlaylistCard: React.FC<{ title: string; subtitle: string; icon: string; coverImage: string | null; onClick: () => void; }> = ({ title, subtitle, icon, coverImage, onClick }) => {
    const { t } = useTranslation();
    const countText = subtitle.split('•')[1]?.trim() || t('videosCountText', {count: 0});

    return (
        <div onClick={onClick} tabIndex={-1} className="flex-shrink-0 w-64 cursor-pointer group focusable rounded-2xl">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-800 shadow-lg aspect-video">
                {coverImage ? (
                    <>
                        <img src={coverImage} alt={title} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-end p-4">
                            <div className="flex flex-col items-center text-white">
                                <i className={`${icon} text-3xl`}></i>
                                <span className="text-sm font-bold mt-1.5">{countText}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                        <i className={`${icon} text-5xl text-zinc-400`}></i>
                        <p className="text-base font-semibold text-zinc-400 mt-2">{countText}</p>
                    </div>
                )}
            </div>
             <div className="pt-2">
                <h3 className="font-semibold text-white truncate text-base">{title}</h3>
                <p className="text-sm text-gray-400">{subtitle.split('•')[0]?.trim()}</p>
            </div>
        </div>
    );
};


const Carousel = ({ items, renderItem, title, onHeaderClick }: any) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    return (
        <section className="p-4 rounded-lg">
            <SectionHeader title={title} onClick={onHeaderClick} />
            <div ref={scrollContainerRef} className="overflow-x-auto no-scrollbar pt-4 -mx-4">
                <div className="flex gap-6 px-4">
                    {items.map((item: any) => renderItem(item))}
                </div>
            </div>
        </section>
    );
};


const YouPage: React.FC = () => {
    const { activeProfile, switchProfile, getScreenSpecificData } = useProfile();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (!activeProfile) {
        navigate('/', { replace: true });
        return null;
    }
    
    const history = getScreenSpecificData('history', []);
    const favorites = getScreenSpecificData('favorites', []);
    const downloads = getScreenSpecificData('downloads', []);

    const getCoverImage = (items: (FavoriteItem | DownloadItem)[]) => {
        if (items.length > 0) {
            const item = items[0];
            if ('poster' in item && item.poster) return item.poster;
        }
        return null;
    };
    
    const playlists = [
        {
            title: t('likedVideos'),
            subtitle: `Playlist • ${t('videosCountText', {count: favorites.length})}`,
            icon: "fa-solid fa-thumbs-up",
            coverImage: getCoverImage(favorites),
            onClick: () => navigate('/favorites')
        },
        {
            title: t('downloads'),
            subtitle: `Playlist • ${t('videosCountText', {count: downloads.length})}`,
            icon: "fa-solid fa-download",
            coverImage: getCoverImage(downloads),
            onClick: () => navigate('/downloads')
        },
        {
            title: t('watchLater'),
            subtitle: `Playlist • ${t('videosCountText', {count: 0})}`,
            icon: "fa-solid fa-clock",
            coverImage: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?q=80&w=2940&auto=format&fit=crop',
            onClick: () => {}
        }
    ];

    return (
        <Layout>
            <div className="bg-[#0f0f0f] text-white min-h-screen">
                <div className="p-8 space-y-8">
                    <ProfileHeader 
                        profile={activeProfile} 
                        onSearch={() => navigate('/search')}
                        onSettings={() => navigate('/settings')}
                    />

                    {history.length > 0 && (
                        <Carousel
                            key="history"
                            items={history}
                            renderItem={(item: HistoryItem) => <HistoryCard item={item} />}
                            title={t('history')}
                        />
                    )}

                    <Carousel
                        key="playlists"
                        items={playlists}
                        renderItem={(item: typeof playlists[0]) => <PlaylistCard {...item} />}
                        title={t('playlists')}
                    />
                </div>
            </div>
        </Layout>
    );
};

export default YouPage;