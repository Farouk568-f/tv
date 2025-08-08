

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/Player';
import { Movie, Episode, Season, HistoryItem } from '../types';
import { fetchFromTMDB } from '../services/apiService';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';
import { usePlayer, PipData } from '../contexts/PlayerContext';
import { IMAGE_BASE_URL, POSTER_SIZE, BACKDROP_SIZE_MEDIUM } from '../constants';


const PlayerPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { item: initialItem, type, season: initialSeason, episode: initialEpisode, currentTime, streamUrl } = location.state || {};
    const { isFavorite, toggleFavorite, setToast, addDownload, updateHistory } = useProfile();
    const { t } = useTranslation();
    const { setPipData, setPipAnchor } = usePlayer();

    const [item, setItem] = useState<Movie | null>(initialItem);
    const [currentSeason, setCurrentSeason] = useState<number | undefined>(initialSeason);
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(initialEpisode);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        setPipData(null); // Clear any existing PiP when the main player opens

        if (!initialItem) {
            navigate('/home', { replace: true });
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            try {
                const data = streamUrl ? initialItem : await fetchFromTMDB(`/${type}/${initialItem.id}`, { append_to_response: 'recommendations,content_ratings' });
                setItem(data);
                
                if (type === 'tv') {
                    const seasonToFetch = currentSeason || (data.seasons?.find((s: Season) => s.season_number > 0 && s.episode_count > 0)?.season_number ?? 1);
                    setCurrentSeason(seasonToFetch);
                    if (data.id && seasonToFetch) {
                        const seasonData = await fetchFromTMDB(`/tv/${data.id}/season/${seasonToFetch}`);
                        setEpisodes(seasonData.episodes);
                        if (!currentEpisode) {
                           const firstEpisode = seasonData.episodes.find((ep: Episode) => ep.episode_number > 0) || seasonData.episodes[0];
                           setCurrentEpisode(firstEpisode);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch player page data:", error);
                setToast({ message: t('failedToLoadDetails'), type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();

    }, [initialItem?.id, type, navigate, setPipData, currentSeason, currentEpisode, setToast, streamUrl, t]);
    
     useEffect(() => {
        const video = document.querySelector('video');
        return () => {
            if (video && item && video.duration > 0 && video.currentTime > 0) {
                const progress = (video.currentTime / video.duration) * 100;
                if (progress > 5 && progress < 95) { // Only save meaningful progress
                    const historyItem: HistoryItem = {
                        id: item.id,
                        type: type,
                        title: initialEpisode ? `${item.name}: S${initialSeason}E${initialEpisode.episode_number}` : (item.name || item.title),
                        itemImage: item.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE_MEDIUM}${item.backdrop_path}` : '',
                        currentTime: video.currentTime,
                        duration: video.duration,
                        timestamp: Date.now(),
                        episodeId: initialEpisode?.id,
                    };
                    updateHistory(historyItem);
                }
            }
        };
    }, [item, type, initialSeason, initialEpisode, updateHistory]);

    
    const handleEpisodeSelect = (episode: Episode) => {
        setCurrentEpisode(episode);
        navigate('/player', { replace: true, state: { item, type, season: currentSeason, episode }});
    };

    const handleEnterPip = (url: string, time: number, playing: boolean, dimensions: DOMRect) => {
        const pipState: PipData = {
            item,
            type,
            season: currentSeason,
            episode: currentEpisode,
            currentTime: time,
            isPlaying: playing,
            streamUrl: url,
        };
        setPipAnchor({
            top: dimensions.top,
            left: dimensions.left,
            width: dimensions.width,
            height: dimensions.height,
        });
        setPipData(pipState);
        navigate(-1);
    };
    
    if (loading || !item) {
        return <div className="flex items-center justify-center h-screen bg-black"><div className="w-16 h-16 border-4 border-t-transparent border-[var(--primary)] rounded-full animate-spin"></div></div>;
    }
    
    const isFav = isFavorite(item.id);
    const title = currentEpisode ? `${item.name || item.title}: E${currentEpisode.episode_number} "${currentEpisode.name}"` : (item.title || item.name);
    
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: title,
                text: `Watch "${title}" on CineStream!`,
                url: window.location.href,
            }).catch(err => console.log('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(window.location.href);
            setToast({message: t('shareLinkCopied'), type: 'info'});
        }
    };

    const handleDownload = () => {
        addDownload({ title: title, poster: item.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${item.poster_path}` : '' });
    };

    return (
        <div className="bg-black w-screen h-screen">
             <VideoPlayer
                key={`${currentEpisode?.id || item.id}-${streamUrl}`}
                item={item}
                itemType={type}
                initialSeason={currentSeason}
                initialEpisode={currentEpisode}
                initialTime={currentTime}
                initialStreamUrl={streamUrl}
                isFav={isFav}
                onToggleFavorite={() => toggleFavorite(item)}
                onShare={handleShare}
                onDownload={handleDownload}
                onEnterPip={handleEnterPip}
                isPlayerActive={true}
                episodes={episodes}
                onEpisodeSelect={handleEpisodeSelect}
            />
        </div>
    );
};

export default PlayerPage;