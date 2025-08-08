
import { TMDB_API_KEY, TMDB_BASE_URL, SCRAPER_API_URL, SUBTITLE_API_URL, CORS_PROXY_URL } from '../constants';
import { QualityLink } from '../types';

const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 45000, ...fetchOptions } = options; // Increased default timeout for scraper
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
      const response = await fetch(resource, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
  } catch(error: any) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
          throw new Error('The request timed out. The server took too long to respond.');
      }
      // This is a common browser error for CORS issues or network failures.
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new Error('Network Error: Could not connect to the server. This may be a CORS issue. Please ensure the backend server is running and configured for cross-origin requests.');
      }
      // Re-throw other unexpected errors.
      throw error;
  }
};


const fetchWithHeaders = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = await response.text();
        }
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData) || response.statusText}`);
    }
    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json") ? response.json() : response.text();
};


export const fetchFromTMDB = async (endpoint: string, params: Record<string, string | number | boolean> = {}) => {
  const lang = localStorage.getItem('cineStreamLanguage') || 'ar';
  const defaultParams = {
    api_key: TMDB_API_KEY,
    language: lang === 'ar' ? 'ar-SA' : 'en-US',
  };
  const urlParams = new URLSearchParams({ ...defaultParams, ...params } as Record<string, string>);
  const url = `${TMDB_BASE_URL}${endpoint}?${urlParams}`;
  return fetchWithHeaders(url);
};

export const fetchStreamUrl = async (
    title: string, // title is now a fallback
    media_type: 'movie' | 'tv',
    tmdbId: number,
    year?: string | null,
    season?: number | null,
    episode?: number | null
): Promise<QualityLink[]> => {
    let englishTitle = title;
    try {
        // Force fetching english details to get the english title for the scraper
        const englishData = await fetchFromTMDB(`/${media_type}/${tmdbId}`, { language: 'en-US' });
        // The title/name field from an en-US query should be in English.
        if (englishData.title || englishData.name) {
            englishTitle = englishData.title || englishData.name;
        }
    } catch (e) {
        console.warn("Could not fetch English title from TMDB, proceeding with provided title.", e);
    }

    const params = new URLSearchParams();
    params.append('title', englishTitle);
    params.append('type', media_type === 'tv' ? 'series' : 'movie');

    if (media_type === 'tv' && season && episode) {
        params.append('season', String(season));
        params.append('episode', String(episode));
    }

    const targetUrl = `${SCRAPER_API_URL}?${params.toString()}`;
    
    const responseData = await fetchWithHeaders(targetUrl, {
        timeout: 45000,
        headers: { 'ngrok-skip-browser-warning': 'true' }
    });

    if (typeof responseData !== 'object' || responseData === null) {
        console.error('Invalid response from scraper API:', responseData);
        throw new Error('Scraper API returned an invalid response.');
    }
    
    const typedResponse = responseData as { status: string, links?: QualityLink[], message?: string };

    if (typedResponse.status === 'success' && Array.isArray(typedResponse.links) && typedResponse.links.length > 0) {
        return typedResponse.links;
    } else {
        const errorMessage = typedResponse.message || 'Failed to get stream links. The content might not be available.';
        throw new Error(errorMessage);
    }
};

export const fetchSubtitles = async (name: string, season?: number | null, episode?: number | null, langCode: string = 'ara') => {
    let targetUrl = `${SUBTITLE_API_URL}?name=${encodeURIComponent(name)}`;
    if (season && episode) {
        targetUrl += `&s=${season}&e=${episode}`;
    }
    const proxyUrl = `${CORS_PROXY_URL}${encodeURIComponent(targetUrl)}`;
    return fetchWithHeaders(proxyUrl, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
};