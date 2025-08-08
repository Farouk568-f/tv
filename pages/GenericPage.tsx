import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { fetchFromTMDB } from '../services/apiService';
import { Movie, FavoriteItem } from '../types';
import { IMAGE_BASE_URL, POSTER_SIZE } from '../constants';


const ItemCard: React.FC<{ item: Movie | FavoriteItem, onDelete?: (item: Movie | FavoriteItem) => void }> = ({ item, onDelete }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const id = item.id;
    const title = item.title || item.name;
    const posterUrl = 'poster_path' in item && item.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${item.poster_path}` : ('poster' in item ? item.poster : undefined);
    const posterPath = 'poster_path' in item && item.poster_path ? item.poster_path : null;
    const type = 'media_type' in item && item.media_type ? item.media_type : ('type' in item ? item.type : (item.title ? 'movie' : 'tv'));
    const year = ('release_date' in item && item.release_date && item.release_date.length > 0)
        ? item.release_date.substring(0, 4)
        : (('first_air_date' in item && item.first_air_date && item.first_air_date.length > 0) ? item.first_air_date.substring(0, 4) : '');

    if (!posterUrl) return null;

    return (
        <div 
            className="w-full cursor-pointer focusable transition-all duration-300 rounded-2xl" 
            tabIndex={-1}
            onClick={() => navigate(`/details/${type}/${id}`)}
        >
            <div className="relative overflow-hidden bg-[var(--surface)] rounded-xl">
                 <img
                    src={posterUrl}
                    srcSet={posterPath ? `${IMAGE_BASE_URL}w342${posterPath} 342w, ${IMAGE_BASE_URL}${POSTER_SIZE}${posterPath} 500w` : undefined}
                    sizes="(max-width: 639px) 46vw, (max-width: 767px) 30vw, (max-width: 1023px) 22vw, (max-width: 1279px) 18vw, 15vw"
                    alt={title}
                    className="object-cover w-full aspect-[2/3]"
                    loading="lazy"
                />
                 {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                        className="absolute z-10 flex items-center justify-center w-8 h-8 text-white transition-opacity bg-red-600 rounded-full top-2 end-2 opacity-80 hover:opacity-100"
                        aria-label={t('delete', {item: title || ''})}
                    >
                        <i className="text-sm fa-solid fa-trash-can"></i>
                    </button>
                 )}
            </div>
             <div className="pt-3">
                <h3 className="text-base font-bold text-white truncate">{title}</h3>
                <div className="flex items-center justify-between mt-1 text-xs text-[var(--text-dark)]">
                    <span>{year}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase border rounded-full border-white/20 bg-white/10">{t(type === 'tv' ? 'series' : 'movie')}</span>
                </div>
             </div>
        </div>
    );
};

const SkeletonCard: React.FC = () => (
    <div className="w-full animate-pulse">
        <div className="aspect-[2/3] w-full rounded-xl bg-[var(--surface)]"></div>
        <div className="w-3/4 h-5 mt-3 bg-[var(--surface)] rounded-md"></div>
        <div className="w-1/2 h-4 mt-2 bg-[var(--surface)] rounded-md"></div>
    </div>
);


const GenericPage: React.FC<{
    pageType: 'favorites' | 'downloads' | 'search' | 'all',
    title: string
}> = ({ pageType, title }) => {
    const { getScreenSpecificData, toggleFavorite, addLastSearch, clearLastSearches, activeProfile } = useProfile();
    const { t } = useTranslation();
    const [content, setContent] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { category } = useParams<{category: string}>();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const performSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setContent([]);
            return;
        }
        setLoading(true);
        try {
            const searchRes = await fetchFromTMDB('/search/multi', { query });
            const combined = searchRes.results
                .filter((item: Movie) => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv'))
                .sort((a: Movie, b: Movie) => (b.popularity ?? 0) - (a.popularity ?? 0));
            setContent(combined);
            if(combined[0]) addLastSearch(combined[0]);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    }, [addLastSearch]);

    const loadContent = useCallback(async () => {
        if (pageType === 'search') return;
        setLoading(true);
        try {
            let fetchedContent = [];
            switch (pageType) {
                case 'favorites':
                    fetchedContent = getScreenSpecificData('favorites', []).reverse();
                    break;
                case 'downloads':
                    fetchedContent = getScreenSpecificData('downloads', []);
                    break;
                case 'all':
                    if (category) {
                        let endpoint = '';
                        switch(category) {
                            case 'series':
                                endpoint = '/tv/popular'; break;
                            case 'trending_week':
                                endpoint = '/trending/movie/week'; break;
                            default:
                                endpoint = `/movie/${category}`;
                        }
                        const allRes = await fetchFromTMDB(endpoint);
                        fetchedContent = allRes.results;
                    }
                    break;
            }
            setContent(fetchedContent);
        } catch (error) {
            console.error(`Failed to load content for ${pageType}`, error);
        } finally {
            setLoading(false);
        }
    }, [pageType, category, getScreenSpecificData]);

    useEffect(() => {
        if(activeProfile) {
          loadContent();
        }
    }, [loadContent, activeProfile]);
    
    const debouncedSearch = useCallback(debounce((query: string) => performSearch(query), 500), [performSearch]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchTerm(query);
        if (query.length === 0) {
            setContent([]);
        } else {
            debouncedSearch(query);
        }
    };

    const handleFavoriteDelete = (item: Movie | FavoriteItem) => {
        toggleFavorite(item);
        setContent(prev => prev.filter(c => c.id !== item.id));
    };


    if (pageType === 'search') {
        return (
             <Layout>
                <div className="p-8">
                    <h1 className="mb-6 text-4xl font-bold">{title}</h1>
                     <div className="mb-8">
                        <div className="relative">
                            <i className="absolute text-gray-400 -translate-y-1/2 fa-solid fa-search top-1/2 start-6 text-xl pointer-events-none"></i>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full ps-16 pe-12 py-4 text-white bg-[var(--surface)] border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-gray-500 text-lg focusable focusable-input"
                            />
                        </div>
                    </div>
                     {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8">
                            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                     ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8">
                            {content.map((item) => (
                                <ItemCard key={item.id} item={item} />
                            ))}
                        </div>
                     )}
                     {content.length === 0 && !loading && searchTerm.length > 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <i className="text-7xl text-gray-500 fa-solid fa-magnifying-glass"></i>
                            <h3 className="mt-8 text-2xl font-bold">{t('noResultsFor', {query: searchTerm})}</h3>
                            <p className="mt-2 text-gray-400">{t('tryDifferentKeyword')}</p>
                        </div>
                    )}
                </div>
            </Layout>
        )
    }
    
    const renderContent = () => {
        if (loading) {
            return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8">
                        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                   </div>;
        }
        if (content.length === 0) {
            const message = t('noItemsFound', { title: title });
            return <p className="mt-8 text-center text-gray-400">{message}</p>;
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8">
                {content.map((item) => {
                    if(pageType === 'downloads') {
                         return (
                            <div key={item.title} className="flex flex-col items-center focusable transition-all duration-300 rounded-2xl">
                                <img src={item.poster} alt={item.title} className="w-full rounded-lg" />
                                <p className="mt-2 text-base text-center">{item.title}</p>
                            </div>
                         );
                    }
                    return <ItemCard 
                                key={item.id} 
                                item={item} 
                                onDelete={pageType === 'favorites' ? handleFavoriteDelete : undefined} 
                           />
                })}
            </div>
        )
    };
    
    return (
        <Layout>
            <div className="p-8">
                <h1 className="mb-6 text-4xl font-bold">{pageType === 'all' && category ? t('allCategory', {category: t(category as any) || category}) : title}</h1>
                {renderContent()}
            </div>
        </Layout>
    );
};

function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}


export default GenericPage;