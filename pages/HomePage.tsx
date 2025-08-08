



import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFromTMDB } from '../services/apiService';
import { Movie, HistoryItem, Actor, Short } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from '../contexts/LanguageContext';
import Layout from '../components/Layout';
import { IMAGE_BASE_URL, POSTER_SIZE, BACKDROP_SIZE, BACKDROP_SIZE_MEDIUM } from '../constants';

const MovieCard: React.FC<{ movie: Movie }> = ({ movie }) => {
  const navigate = useNavigate();
  const type = movie.media_type || (movie.title ? 'movie' : 'tv');
  
  const handleClick = () => {
    navigate(`/details/${type}/${movie.id}`);
  };

  if (!movie.poster_path) return null;

  return (
    <div
      onClick={handleClick}
      className="flex-shrink-0 w-48 md:w-52 cursor-pointer focusable transition-all duration-300 rounded-xl"
      tabIndex={-1}
    >
      <div className="relative overflow-hidden bg-[var(--surface)] rounded-xl">
        <img
          src={`${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`}
          srcSet={`${IMAGE_BASE_URL}w342${movie.poster_path} 342w, ${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path} 500w`}
          sizes="(max-width: 767px) 144px, 208px"
          alt={movie.title || movie.name}
          className="object-cover w-full h-64 md:h-72"
          loading="lazy"
        />
      </div>
      <div className="pt-3">
        <h3 className="text-base font-bold text-white truncate">{movie.title || movie.name}</h3>
        <p className="text-sm text-[var(--text-dark)]">{movie.release_date?.substring(0,4) || movie.first_air_date?.substring(0,4)}</p>
      </div>
    </div>
  );
};

const ActorCard: React.FC<{ actor: Actor }> = ({ actor }) => {
  const navigate = useNavigate();
  if (!actor.profile_path) return null;
  return (
    <div
      onClick={() => navigate(`/actor/${actor.id}`)}
      className="flex-shrink-0 w-32 md:w-36 text-center cursor-pointer group focusable rounded-full"
      tabIndex={-1}
    >
      <img
        src={`${IMAGE_BASE_URL}w185${actor.profile_path}`}
        alt={actor.name}
        className="w-full h-32 md:h-36 object-cover rounded-full shadow-lg border-2 border-[var(--surface)]"
        loading="lazy"
      />
      <h3 className="mt-2 text-sm font-semibold text-white truncate">{actor.name}</h3>
    </div>
  );
};

const ActorCarousel: React.FC<{ title: string; actors: Actor[] }> = ({ title, actors }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  if (actors.length === 0) return null;
  return (
    <div className="my-8 p-4 rounded-lg transition-colors duration-300">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div ref={scrollContainerRef} className="overflow-x-auto no-scrollbar">
        <div className="flex flex-nowrap gap-x-8 pb-2">
          {actors.map((actor) => <ActorCard key={`actor-${actor.id}`} actor={actor} />)}
        </div>
      </div>
    </div>
  );
};


const HistoryCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/details/${item.type}/${item.id}`);
  };

  const progress = (item.currentTime / item.duration) * 100;

  return (
    <div onClick={handleClick} tabIndex={-1} className="relative flex-shrink-0 w-72 overflow-hidden rounded-xl cursor-pointer bg-[var(--surface)] transition-transform duration-300 shadow-lg focusable">
      <img src={item.itemImage} alt={item.title} className="object-cover w-full h-40" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-base font-bold text-white truncate">{item.title}</h3>
        <div className="w-full h-1.5 mt-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
};

const Carousel: React.FC<{ title: string; movies: Movie[]; category?: string }> = ({ title, movies, category }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!movies || movies.length === 0) return null;
    return (
        <div className="my-8 p-4 rounded-lg transition-colors duration-300">
            <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {category && <button onClick={() => navigate(`/all/${category}`)} className="text-base font-medium text-[var(--primary)] transition-colors flex items-center gap-1 focusable focusable-text">{t('viewAll')} <i className="text-xs fa-solid fa-chevron-right"></i></button>}
            </div>
            <div ref={scrollContainerRef} className="overflow-x-auto no-scrollbar">
                <div className="flex flex-nowrap gap-x-6 pb-4">
                    {movies.map((movie) => <MovieCard key={`${category || 'carousel'}-${movie.id}`} movie={movie} />)}
                </div>
            </div>
        </div>
    );
};

const HistoryCarousel: React.FC<{ history: HistoryItem[] }> = ({ history }) => {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (history.length === 0) return null;
    return (
        <div className="my-8 p-4 rounded-lg transition-colors duration-300">
            <h2 className="mb-4 text-2xl font-bold text-white">{t('continueWatching')}</h2>
            <div ref={scrollContainerRef} className="overflow-x-auto no-scrollbar">
                 <div className="flex flex-nowrap gap-x-6 pb-4">
                    {history.map((item) => <HistoryCard key={item.id} item={item} />)}
                </div>
            </div>
        </div>
    );
}

const PosterSlider: React.FC<{ items: Movie[] }> = ({ items }) => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const itemsToShow = items.filter(item => item.backdrop_path && item.poster_path).slice(0, 10);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % itemsToShow.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [itemsToShow.length]);


  if (itemsToShow.length === 0) {
    return (
      <div className="relative w-full h-[60vh] md:h-[70vh] max-h-[800px] mb-8 overflow-hidden bg-[var(--surface)] skeleton">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent"></div>
      </div>
    );
  }
  
  const activeItem = itemsToShow[activeIndex];
  const type = activeItem.media_type || (activeItem.title ? 'movie' : 'tv');

  const handleDetailsClick = (item: Movie) => {
    const itemType = item.media_type || (item.title ? 'movie' : 'tv');
    navigate(`/details/${itemType}/${item.id}`);
  };

  return (
    <div className="relative w-full h-[70vh] max-h-[700px] mb-8 overflow-hidden bg-[var(--background)] transition-all duration-500 rounded-b-2xl">
      {itemsToShow.map((item, index) => (
        <img
          key={item.id}
          src={`${IMAGE_BASE_URL}${BACKDROP_SIZE}${item.backdrop_path}`}
          className={`absolute inset-0 object-cover w-full h-full transition-opacity duration-1000 ease-in-out ken-burns ${index === activeIndex ? 'opacity-100' : 'opacity-0'}`}
          alt="background"
        />
      ))}
      
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/70 to-transparent"></div>
      <div className={`absolute inset-0 ${language === 'ar' ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-[var(--background)] via-transparent to-transparent opacity-80`}></div>

      <div className="relative z-10 flex items-end justify-between h-full p-8 md:p-12">
        <div key={activeItem.id} className="w-full md:w-2/3 animate-hero-content-in pe-8">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>
            {activeItem.title || activeItem.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-base text-gray-200 drop-shadow">
            <span>{activeItem.release_date?.substring(0, 4) || activeItem.first_air_date?.substring(0, 4)}</span>
            <span className="flex items-center gap-1.5"><i className="text-yellow-400 fa-solid fa-star"></i>{activeItem.vote_average.toFixed(1)}</span>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase border rounded-full border-white/50 bg-white/10">{t(type === 'tv' ? 'series' : 'movie')}</span>
          </div>
          <p className="hidden md:block mt-4 text-base leading-relaxed text-gray-300 line-clamp-3 max-w-2xl">
              {activeItem.overview}
          </p>
          <div className="flex items-center gap-4 mt-8">
            <button
                id="hero-play-button"
                onClick={() => navigate('/player', { state: { item: activeItem, type } })}
                className="px-8 py-3 text-lg font-bold text-black bg-white rounded-full transition-all duration-300 shadow-lg flex items-center justify-center gap-2 focusable focusable-button"
            >
                <i className="fa-solid fa-play"></i>
                <span>{t('play')}</span>
            </button>
            <button
                onClick={() => handleDetailsClick(activeItem)}
                className="px-8 py-3 text-lg font-bold text-white bg-white/10 backdrop-blur-md rounded-full transition-colors duration-300 shadow-lg flex items-center justify-center gap-2 hover:bg-white/20 focusable"
            >
                <i className="fa-solid fa-circle-info"></i>
                <span>{t('details')}</span>
            </button>
          </div>
        </div>

      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {itemsToShow.map((_, index) => (
            <div key={index} onClick={() => setActiveIndex(index)} className={`w-8 h-1.5 rounded-full transition-all duration-500 cursor-pointer ${index === activeIndex ? 'bg-white' : 'bg-white/30'}`}></div>
        ))}
      </div>
    </div>
  );
};


const SkeletonLoader: React.FC = () => (
    <div>
        <div className="relative w-full h-[70vh] max-h-[700px] mb-8 overflow-hidden skeleton"></div>
        <div className="px-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="my-8">
                    <div className="w-1/3 h-8 mb-4 skeleton rounded-md"></div>
                    <div className="flex gap-x-6">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className="flex-shrink-0 w-48">
                            <div className="w-full h-64 skeleton rounded-xl"></div>
                            <div className="w-3/4 h-5 mt-3 skeleton rounded-md"></div>
                            <div className="w-1/2 h-4 mt-2 skeleton rounded-md"></div>
                          </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);


const HomePage: React.FC = () => {
  const [data, setData] = useState<{ popular: Movie[], topRated: Movie[], series: Movie[], featured: Movie[], upcoming: Movie[], nowPlaying: Movie[], trendingWeek: Movie[], popularActors: Actor[] }>({ popular: [], topRated: [], series: [], featured: [], upcoming: [], nowPlaying: [], trendingWeek: [], popularActors: [] });
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [followedMovies, setFollowedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const { getScreenSpecificData, isKidsMode, activeProfile } = useProfile();
  const { t } = useTranslation();
  const history = getScreenSpecificData('history', []);

  const carousels = [
      { type: 'hero', data: data.featured, condition: data.featured.length > 0 },
      { type: 'history', data: history, condition: history.length > 0 && !isKidsMode, title: t('continueWatching') },
      { type: 'followed', data: followedMovies, condition: followedMovies.length > 0 && !isKidsMode, title: t('fromActorsYouFollow') },
      { type: 'recommendations', data: recommendations, condition: recommendations.length > 0, title: t('pickedForYou') },
      { type: 'trendingWeek', data: data.trendingWeek, condition: data.trendingWeek.length > 0 && !isKidsMode, title: t('trendingThisWeek'), category: 'trending_week' },
      { type: 'popular', data: data.popular, condition: true, title: t(isKidsMode ? 'popularKidsMovies' : 'popularMovies'), category: 'popular' },
      { type: 'nowPlaying', data: data.nowPlaying, condition: true, title: t('nowPlaying'), category: 'now_playing' },
      { type: 'series', data: data.series, condition: true, title: t(isKidsMode ? 'popularKidsShows' : 'popularSeries'), category: 'series' },
      { type: 'topRated', data: data.topRated, condition: true, title: t(isKidsMode ? 'topRatedKidsMovies' : 'topRated'), category: 'top_rated' },
      { type: 'upcoming', data: data.upcoming, condition: true, title: t('upcoming'), category: 'upcoming' },
      { type: 'actors', data: data.popularActors, condition: !isKidsMode, title: t('discoverActors') },
  ].filter(c => c.condition);


  useEffect(() => {
    const fetchTasteRecommendations = async () => {
        if (activeProfile?.tastePreferences && activeProfile.tastePreferences.length > 0) {
            const randomMovieId = activeProfile.tastePreferences[Math.floor(Math.random() * activeProfile.tastePreferences.length)];
            try {
                const res = await fetchFromTMDB(`/movie/${randomMovieId}/recommendations`);
                if (res.results && res.results.length > 0) {
                    setRecommendations(res.results.filter((m: Movie) => m.poster_path));
                }
            } catch (err) { console.error("Failed to fetch taste-based recommendations", err); }
        }
    };
    
    const fetchFollowedActorsContent = async () => {
        const followedActorIds = activeProfile?.followedActors || [];
        if (followedActorIds.length > 0) {
            try {
                const promises = followedActorIds.slice(0, 3).map(id => fetchFromTMDB(`/person/${id}/combined_credits`));
                const results = await Promise.all(promises);
                const movies = results
                    .flatMap(res => res.cast || [])
                    .filter((m: Movie) => m.poster_path && (m.media_type === 'movie' || m.media_type === 'tv'))
                    .sort(() => 0.5 - Math.random()) // Shuffle
                    .slice(0, 15);
                
                const uniqueMovies = Array.from(new Map(movies.map(m => [m.id, m])).values());
                setFollowedMovies(uniqueMovies);
            } catch (err) { console.error("Failed to fetch followed actors content", err); }
        }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTasteRecommendations(), fetchFollowedActorsContent()]);

        let popularMoviesPromise, topRatedMoviesPromise, seriesPromise, featuredPromise, upcomingPromise, nowPlayingPromise, trendingWeekPromise, popularActorsPromise;

        if (isKidsMode) {
          const kidsParams = { 'certification_country': 'US', 'certification.lte': 'PG', sort_by: 'popularity.desc' };
          popularMoviesPromise = fetchFromTMDB('/discover/movie', { ...kidsParams, with_genres: '16,10751' });
          topRatedMoviesPromise = fetchFromTMDB('/discover/movie', { ...kidsParams, with_genres: '16,10751', sort_by: 'vote_average.desc', 'vote_count.gte': 50 });
          seriesPromise = fetchFromTMDB('/discover/tv', { ...kidsParams, with_genres: '10762,16' });
          featuredPromise = popularMoviesPromise;
          upcomingPromise = fetchFromTMDB('/discover/movie', { ...kidsParams, with_genres: '16,10751', sort_by: 'primary_release_date.desc' });
          nowPlayingPromise = popularMoviesPromise;
          trendingWeekPromise = popularMoviesPromise;
          popularActorsPromise = Promise.resolve({ results: [] });
        } else {
          popularMoviesPromise = fetchFromTMDB('/movie/popular');
          topRatedMoviesPromise = fetchFromTMDB('/movie/top_rated');
          seriesPromise = fetchFromTMDB('/tv/popular');
          featuredPromise = fetchFromTMDB('/trending/all/day');
          upcomingPromise = fetchFromTMDB('/movie/upcoming');
          nowPlayingPromise = fetchFromTMDB('/movie/now_playing');
          trendingWeekPromise = fetchFromTMDB('/trending/movie/week');
          popularActorsPromise = fetchFromTMDB('/person/popular');
        }

        const [popularRes, topRatedRes, seriesRes, featuredRes, upcomingRes, nowPlayingRes, trendingWeekRes, popularActorsRes] = await Promise.all([
          popularMoviesPromise,
          topRatedMoviesPromise,
          seriesPromise,
          featuredPromise,
          upcomingPromise,
          nowPlayingPromise,
          trendingWeekPromise,
          popularActorsPromise,
        ]);
        
        setData({
          popular: popularRes.results || [],
          topRated: topRatedRes.results || [],
          series: seriesRes.results || [],
          featured: featuredRes.results || [],
          upcoming: upcomingRes.results || [],
          nowPlaying: nowPlayingRes.results || [],
          trendingWeek: trendingWeekRes.results || [],
          popularActors: popularActorsRes.results || [],
        });
        
      } catch (error) {
        console.error("Failed to fetch home page data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (activeProfile) {
        fetchData();
    }
  }, [isKidsMode, activeProfile]);
  
  return (
    <Layout>
      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
           {carousels.map((carousel) => {
             switch(carousel.type) {
                case 'hero':
                    return <PosterSlider key={carousel.type} items={carousel.data as Movie[]} />
                case 'history':
                    return <HistoryCarousel key={carousel.type} history={carousel.data as HistoryItem[]} />
                case 'actors':
                    return <ActorCarousel key={carousel.type} title={carousel.title!} actors={carousel.data as Actor[]} />
                default:
                    return <Carousel 
                                key={carousel.type} 
                                title={carousel.title!}
                                movies={carousel.data as Movie[]}
                                category={carousel.category}
                            />
             }
           })}
        </>
      )}
    </Layout>
  );
};

export default HomePage;