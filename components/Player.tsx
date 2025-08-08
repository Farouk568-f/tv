

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Hls from 'hls.js';
import { Movie, Episode, QualityLink } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';
import { fetchStreamUrl, fetchSubtitles } from '../services/apiService';
import * as Icons from './Icons';
import { IMAGE_BASE_URL, BACKDROP_SIZE_MEDIUM } from '../constants';

interface PlayerProps {
    item: Movie;
    itemType: 'movie' | 'tv';
    initialSeason: number | undefined;
    initialEpisode: Episode | null;
    initialTime?: number;
    initialStreamUrl?: string;
    isFav: boolean;
    onToggleFavorite: () => void;
    onShare: () => void;
    onDownload: () => void;
    onEnterPip: (streamUrl: string, currentTime: number, isPlaying: boolean, dimensions: DOMRect) => void;
    isPlayerActive: boolean;
    episodes?: Episode[];
    onEpisodeSelect?: (episode: Episode) => void;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh > 0) return `${hh.toString().padStart(2, '0')}:${mm}:${ss}`;
    return `${mm}:${ss}`;
};

const VideoPlayer: React.FC<PlayerProps> = ({ item, itemType, initialSeason, initialEpisode, initialTime, initialStreamUrl, isFav, onToggleFavorite, onShare, onDownload, onEnterPip, isPlayerActive, episodes, onEpisodeSelect }) => {
    const navigate = useNavigate();
    const { setToast } = useProfile();
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls.default | null>(null);
    const streamUrlRef = useRef<string | null>(initialStreamUrl || null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seekIndicatorRef = useRef<{ el: HTMLDivElement, icon: HTMLElement, timer: ReturnType<typeof setTimeout> } | null>(null);

    // Main Video State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [currentTime, setCurrentTime] = useState(initialTime || 0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    
    // Shared State
    const [showControls, setShowControls] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [modals, setModals] = useState({ settings: false, subtitles: false, episodes: false });
    const [subtitleSrc, setSubtitleSrc] = useState<string | null>(null);
    const [qualityLinks, setQualityLinks] = useState<QualityLink[]>([]);
    const [currentQualityUrl, setCurrentQualityUrl] = useState<string | null>(initialStreamUrl || null);

    const isModalOpen = Object.values(modals).some(Boolean);

    const hideControls = useCallback(() => {
        if (videoRef.current && !videoRef.current.paused && !isModalOpen) {
            setShowControls(false);
        }
    }, [isModalOpen]);

    const resetControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        setShowControls(true);
        controlsTimeoutRef.current = setTimeout(hideControls, 4000);
    }, [hideControls]);
    
    const loadSource = useCallback((url: string, timeToSeek: number = 0) => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        video.muted = false;
        
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }

        if (Hls.default.isSupported() && (url.includes('.m3u8') || url.includes('.m3u'))) {
            const hlsConfig = {
                enableWorker: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                abrEwmaDefaultEstimate: 4_000_000, 
                abrBandWidthFactor: 0.7, 
                fragLoadingMaxRetry: 6,
                fragLoadingRetryDelay: 1000,
                manifestLoadingMaxRetry: Infinity,
                manifestLoadingRetryDelay: 1000,
            };
            const hls = new Hls.default(hlsConfig);
            hlsRef.current = hls;
            hls.loadSource(url);
            hls.attachMedia(video);
            
            hls.once(Hls.default.Events.MANIFEST_PARSED, () => {
                if (timeToSeek) video.currentTime = timeToSeek;
                video.play().catch(e => console.error("Autoplay failed", e));
            });
             hls.on(Hls.default.Events.ERROR, (event, data) => { 
                if (data.fatal) { 
                    console.error('HLS fatal error:', data);
                    switch(data.type) {
                        case Hls.default.ErrorTypes.NETWORK_ERROR:
                            setToast({ message: t('failedToLoadVideo'), type: 'error' });
                            break;
                        case Hls.default.ErrorTypes.MEDIA_ERROR:
                            setToast({ message: 'Error decoding video. Please try again.', type: 'error' });
                            hls.recoverMediaError();
                            break;
                        default:
                            setToast({ message: t('failedToLoadVideo'), type: 'error' });
                            break;
                    }
                }
            });
        } else { // Direct MP4/other playback
            video.src = url;
            video.addEventListener('loadedmetadata', () => { 
                if (timeToSeek) video.currentTime = timeToSeek; 
                video.play().catch(e => console.error("Autoplay failed on MP4", e));
            }, { once: true });
            video.load(); // Load the new source
        }
        
        setCurrentQualityUrl(url);
        if (video.paused) {
             video.play().catch(e => {
                console.error("Main video play failed", e);
                setIsPlaying(false);
            });
        }
    }, [setToast, t]);

    useEffect(() => {
        const fetchAndPrepareMainContent = async () => {
            setIsBuffering(true);
            if(streamUrlRef.current){
                loadSource(streamUrlRef.current, initialTime);
                return;
            }
            try {
                const title = item.original_title || item.original_name || item.name || item.title;
                const year = itemType === 'movie' ? (item.release_date?.substring(0, 4) || null) : null;
                
                const links = await fetchStreamUrl(title, itemType, year, initialSeason, initialEpisode?.episode_number);
                
                // Sort by quality, lowest first for faster start
                const sortedLinks = links.sort((a, b) => parseInt(a.quality) - parseInt(b.quality));
                setQualityLinks(sortedLinks);
                
                if (sortedLinks.length > 0) {
                    const initialUrl = sortedLinks[0].url; // Lowest quality
                    streamUrlRef.current = initialUrl;
                    loadSource(initialUrl, initialTime);
                } else { 
                    throw new Error("No stream links found."); 
                }
            } catch (error: any) {
                setToast({ message: error.message || t('failedToLoadVideo'), type: "error" });
                setIsBuffering(false);
            }
        };

        if (item) {
            fetchAndPrepareMainContent();
        }
        
        return () => {
            if (hlsRef.current) hlsRef.current.destroy();
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [item, itemType, initialSeason, initialEpisode, initialTime, loadSource, setToast, t]);

    const togglePlay = useCallback(() => {
        const videoToControl = videoRef.current;
        if (!videoToControl) return;
        if (videoToControl.paused) videoToControl.play();
        else videoToControl.pause();
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if(target.closest('.controls-bar') || target.closest('.modal-content')) return;
        setShowControls(s => {
            if (!s) resetControlsTimeout();
            return !s;
        });
    }, [resetControlsTimeout]);

    const showSeekAnimation = (forward: boolean) => {
      if (!playerContainerRef.current) return;
      if (seekIndicatorRef.current && seekIndicatorRef.current.el) {
          clearTimeout(seekIndicatorRef.current.timer);
      } else {
          const el = document.createElement('div');
          const icon = document.createElement('i');
          el.className = `absolute top-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center text-white text-4xl z-20 pointer-events-none`;
          el.appendChild(icon);
          seekIndicatorRef.current = { el, icon, timer: -1 as any };
      }
      const { el, icon } = seekIndicatorRef.current;
      el.style.left = forward ? 'auto' : '15%';
      el.style.right = forward ? '15%' : 'auto';
      icon.className = `fa-solid ${forward ? 'fa-forward' : 'fa-backward'}`;
      
      if (!el.parentNode) {
        playerContainerRef.current.appendChild(el);
      }
      
      el.classList.remove('animate-double-tap');
      void el.offsetWidth; // Trigger reflow
      el.classList.add('animate-double-tap');

      seekIndicatorRef.current.timer = setTimeout(() => {
          el.remove();
          seekIndicatorRef.current = null;
      }, 600);
    };

    const handleSeek = useCallback((forward: boolean) => {
        const videoToControl = videoRef.current;
        if(videoToControl) {
            videoToControl.currentTime += forward ? 10 : -10;
            showSeekAnimation(forward);
        }
        resetControlsTimeout();
    }, [resetControlsTimeout]);
    
    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        const videoToControl = videoRef.current;
        if (videoToControl && duration > 0) {
            videoToControl.currentTime = newTime;
        }
        resetControlsTimeout();
    };
    
    const toggleFullscreen = useCallback(() => {
       navigate(-1);
    }, [navigate]);

    useEffect(() => {
        const video = videoRef.current; if (!video) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onDurationChange = () => setDuration(video.duration);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => {setIsPlaying(true); setIsBuffering(false);};
        const onProgress = () => { if(video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1)); };
        
        video.addEventListener('play', onPlay); video.addEventListener('pause', onPause);
        video.addEventListener('timeupdate', onTimeUpdate); video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('waiting', onWaiting); video.addEventListener('playing', onPlaying);
        video.addEventListener('progress', onProgress);

        return () => {
            video.removeEventListener('play', onPlay); video.removeEventListener('pause', onPause);
            video.removeEventListener('timeupdate', onTimeUpdate); video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('waiting', onWaiting); video.removeEventListener('playing', onPlaying);
            video.removeEventListener('progress', onProgress);
        };
    }, []);
    
    useEffect(() => {
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const openModal = (modal: 'settings' | 'subtitles' | 'episodes') => {
        setModals({ settings: false, subtitles: false, episodes: false, [modal]: true });
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };

    const handleQualityChange = (newUrl: string) => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            loadSource(newUrl, time);
        }
        setModals({ settings: false, subtitles: false, episodes: false });
    };
    
    return (
        <div ref={playerContainerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden player-container-class-for-focus" onClick={handleContainerClick} tabIndex={-1}>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              autoPlay
              crossOrigin="anonymous"
              poster={item.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE_MEDIUM}${item.backdrop_path}` : ''}
            >
                {subtitleSrc && <track kind="subtitles" src={subtitleSrc} srcLang="ar" label="العربية" default />}
            </video>
            
            {isBuffering && <div className="absolute w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin z-20 pointer-events-none"></div>}

            <div className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} pointer-events-none`}></div>

            <div className={`absolute inset-0 transition-opacity duration-300 z-20 ${showControls ? 'opacity-100' : 'opacity-0'} ${isModalOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}>
                <Controls 
                    isPlaying={isPlaying}
                    isFav={isFav}
                    currentTime={currentTime}
                    duration={duration}
                    buffered={buffered}
                    itemType={itemType}
                    togglePlay={togglePlay}
                    handleSeek={handleSeek}
                    handleProgressChange={handleProgressChange}
                    toggleFullscreen={toggleFullscreen}
                    openModal={openModal}
                    onToggleFavorite={onToggleFavorite}
                    onShare={onShare}
                    onDownload={onDownload}
                    t={t}
                />
            </div>

            {isModalOpen &&
                <div className="absolute inset-0 bg-black/60 z-30 pointer-events-auto" onClick={(e) => {e.stopPropagation(); setModals({settings: false, subtitles: false, episodes: false})}}>
                   <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl p-4 overflow-y-auto glassmorphic-panel animate-[slide-in-bottom_0.3s_ease-out_forwards] modal-content" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-1 mx-auto mb-4 bg-gray-600 rounded-full"></div>
                        {modals.settings &&
                            <div className="text-white space-y-2">
                                <div>
                                    <h4 className="mb-3 font-semibold text-lg">{t('playbackSpeed')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {[0.5, 1, 1.5, 2].map(rate => <button key={rate} onClick={() => {if(videoRef.current) videoRef.current.playbackRate = rate; setPlaybackRate(rate);}} className={`w-16 px-3 py-2 text-sm rounded-lg font-bold transition-colors ${playbackRate === rate ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-gray-300'}`}>{rate}x</button>)}
                                    </div>
                                </div>
                                 {qualityLinks.length > 0 && (
                                    <div className="pt-4 mt-4 border-t border-white/10">
                                        <h4 className="mb-3 font-semibold text-lg">{t('quality')}</h4>
                                        <div className="flex flex-col gap-2">
                                            {qualityLinks.map(link => (
                                                <button
                                                    key={link.quality + link.url}
                                                    onClick={() => handleQualityChange(link.url)}
                                                    className={`w-full px-3 py-2 text-sm rounded-lg font-bold text-start transition-colors ${currentQualityUrl === link.url ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-gray-300'}`}
                                                >
                                                    {link.quality}p
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        }
                         {modals.subtitles &&
                            <div className="text-white">
                                <h3 className="text-xl font-bold mb-4">{t('subtitles')}</h3>
                                <p className="text-gray-400">{t('subtitlesNotReady')}</p>
                            </div>
                        }
                         {modals.episodes &&
                            <div className="text-white">
                                <h3 className="text-xl font-bold mb-4">{t('episodes')}</h3>
                                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                                    {episodes?.map(episode => (
                                        <button
                                            key={episode.id}
                                            onClick={() => {
                                                if (onEpisodeSelect) onEpisodeSelect(episode);
                                                setModals({ settings: false, subtitles: false, episodes: false });
                                            }}
                                            className="flex items-center gap-4 p-2 rounded-lg cursor-pointer w-full bg-white/10 transition-colors hover:bg-white/20 text-start focusable"
                                        >
                                            <div className="relative flex-shrink-0 w-32 h-20 overflow-hidden rounded-md bg-zinc-700">
                                                <img src={episode.still_path ? `${IMAGE_BASE_URL}w300${episode.still_path}` : (item.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE_MEDIUM}${item.backdrop_path}` : '')}
                                                     alt={episode.name} className="object-cover w-full h-full" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-white truncate">{episode.episode_number}. {episode.name}</h4>
                                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{episode.overview}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        }
                   </div>
                </div>
             }
        </div>
    );
};


const Controls: React.FC<any> = ({
    isPlaying, isFav, currentTime, duration, buffered, itemType,
    togglePlay, handleSeek, handleProgressChange, toggleFullscreen, openModal, 
    onToggleFavorite, onShare, onDownload, t
}) => (
    <div className="absolute inset-0 p-4 md:p-8 flex flex-col justify-between text-white controls-bar">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
            <button onClick={toggleFullscreen} className="w-12 h-12 text-2xl pointer-events-auto focusable rounded-full"><Icons.BackIcon className="w-10 h-10" /></button>
            <div className="flex items-center gap-x-2 md:gap-x-4 text-3xl pointer-events-auto">
                {itemType === 'tv' && (
                  <button onClick={() => openModal('episodes')} className="w-12 h-12 focusable rounded-full"><Icons.PlaylistIcon className="w-9 h-9"/></button>
                )}
                <button onClick={onDownload} className="w-12 h-12 focusable rounded-full"><i className="fa-solid fa-download"></i></button>
                <button onClick={() => openModal('subtitles')} className="w-12 h-12 focusable rounded-full"><Icons.CCIcon className="w-9 h-9"/></button>
                <button onClick={() => openModal('settings')} className="w-12 h-12 focusable rounded-full"><Icons.SettingsIcon className="w-9 h-9"/></button>
                <button onClick={onToggleFavorite} className="w-12 h-12 focusable rounded-full"><Icons.SaveIcon isSaved={isFav} className="w-9 h-9"/></button>
            </div>
        </div>

        {/* Middle Controls */}
        <div className="flex items-center justify-center gap-x-16 pointer-events-auto">
            <button onClick={() => handleSeek(false)} className="text-5xl focusable rounded-full p-4"><Icons.RewindIcon className="w-12 h-12"/></button>
            <button onClick={togglePlay} className="text-7xl transform transition-transform focusable rounded-full p-4">
                {isPlaying ? <Icons.PauseIcon className="w-20 h-20"/> : <Icons.PlayIcon className="w-20 h-20"/>}
            </button>
            <button onClick={() => handleSeek(true)} className="text-5xl focusable rounded-full p-4"><Icons.ForwardIcon className="w-12 h-12"/></button>
        </div>
        
        {/* Bottom Controls */}
        <div className="pointer-events-auto">
             <div className="flex items-center gap-x-4 text-white px-1 text-base" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
                <span className="font-mono">{formatTime(currentTime)}</span>
                <div className="relative flex-grow group py-2">
                    <input
                        type="range"
                        min="0"
                        max={duration || 1}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer range-slider focusable"
                        style={{'--progress': `${(currentTime / duration) * 100}%`, '--buffered': `${(buffered / duration) * 100}%`} as React.CSSProperties}
                    />
                </div>
                <span className="font-mono">{formatTime(duration)}</span>
            </div>
        </div>
        <style>{`
            .range-slider {
                background: linear-gradient(to right, var(--primary) 0%, var(--primary) var(--progress), rgba(255,255,255,0.4) var(--progress), rgba(255,255,255,0.4) var(--buffered), rgba(255,255,255,0.2) var(--buffered));
                 transition: height 0.2s;
            }
            .range-slider:focus, .group:hover .range-slider {
                height: 0.75rem;
            }
            .range-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 1rem;
                height: 1rem;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                transition: transform 0.2s;
                transform: scale(0);
            }
             .range-slider:focus::-webkit-slider-thumb, .group:hover .range-slider::-webkit-slider-thumb {
                transform: scale(1.2);
            }
            .range-slider::-moz-range-thumb {
                width: 1rem;
                height: 1rem;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                border: none;
                transition: transform 0.2s;
                transform: scale(0);
            }
             .range-slider:focus::-moz-range-thumb, .group:hover .range-slider::-moz-range-thumb {
                transform: scale(1.2);
            }
        `}</style>
    </div>
);


export default VideoPlayer;