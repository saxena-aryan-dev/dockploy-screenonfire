import { NextRequest, NextResponse } from 'next/server';

// Removed edge runtime to fix Windows development build issues
// export const runtime = 'edge';

const TMDB_BASE_URL = 'https://api.themoviedb.org';
const TMDB_READ_TOKEN = process.env.TMDB_ACCESS_TOKEN ||
  process.env.TMDB_READ_TOKEN ||
  process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN ||
  "";

// Timeout wrapper for fetch with AbortController
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function retryFetch(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Shorter timeout for faster failure detection (8 seconds instead of default)
      const response = await fetchWithTimeout(url, options, 8000);

      if (response.ok) {
        return response;
      }

      // Don't retry client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      // For 429 or 5xx, wait with exponential backoff (shorter delays)
      if (attempt < maxRetries) {
        const delay = Math.min(300 * Math.pow(2, attempt), 1500);
        console.log(`[TMDB Retry] Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      const errorMessage = lastError.message.toLowerCase();

      // Retry on network errors (ECONNRESET, timeout, etc.)
      const isNetworkError = errorMessage.includes('econnreset') ||
                            errorMessage.includes('timeout') ||
                            errorMessage.includes('fetch failed') ||
                            errorMessage.includes('network');

      if (attempt < maxRetries && isNetworkError) {
        // More aggressive retry for network errors
        const delay = 500 * (attempt + 1); // 500ms, 1000ms, 1500ms
        console.log(`[TMDB Retry] Network error (${errorMessage}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (attempt >= maxRetries) {
        console.error(`[TMDB Retry] Max retries (${maxRetries}) exceeded, giving up`);
      }
    }
  }

  throw lastError;
}

// Mock/fallback data for when TMDB is unreachable
function getMockData(path: string): any {
  console.log('[TMDB Proxy] Using fallback mock data for:', path);

  // Genre list fallback
  if (path.includes('/genre/movie/list') || path.includes('/genre/tv/list')) {
    return {
      genres: [
        { id: 28, name: "Action" }, { id: 12, name: "Adventure" },
        { id: 16, name: "Animation" }, { id: 35, name: "Comedy" },
        { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
        { id: 18, name: "Drama" }, { id: 10751, name: "Family" },
        { id: 14, name: "Fantasy" }, { id: 36, name: "History" },
        { id: 27, name: "Horror" }, { id: 10402, name: "Music" },
        { id: 9648, name: "Mystery" }, { id: 10749, name: "Romance" },
        { id: 878, name: "Science Fiction" }, { id: 10770, name: "TV Movie" },
        { id: 53, name: "Thriller" }, { id: 10752, name: "War" },
        { id: 37, name: "Western" }
      ]
    };
  }

  // TV shows fallback
  if (path.includes('/tv/popular') || path.includes('/tv/top_rated') || path.includes('/search/tv')) {
    return {
      page: 1,
      results: [
        {
          id: 94997,
          name: "House of the Dragon",
          overview: "The Targaryen dynasty is at the absolute apex of its power, with more than 15 dragons under their yoke. Most empires crumble from such heights.",
          poster_path: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
          backdrop_path: "/9l1eZiJHmhr5jIlthMdJN5WYoff.jpg",
          first_air_date: "2022-08-21",
          vote_average: 8.4,
          popularity: 3847.912,
          genre_ids: [18, 10765, 10759]
        },
        {
          id: 94605,
          name: "Arcane",
          overview: "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.",
          poster_path: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
          backdrop_path: "/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg",
          first_air_date: "2021-11-06",
          vote_average: 8.7,
          popularity: 2543.321,
          genre_ids: [16, 10765, 10759]
        },
        {
          id: 1396,
          name: "Breaking Bad",
          overview: "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live, he becomes filled with a sense of fearlessness.",
          poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
          backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
          first_air_date: "2008-01-20",
          vote_average: 8.9,
          popularity: 1987.654,
          genre_ids: [18, 80]
        },
        {
          id: 1399,
          name: "Game of Thrones",
          overview: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war.",
          poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
          backdrop_path: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
          first_air_date: "2011-04-17",
          vote_average: 8.4,
          popularity: 1654.234,
          genre_ids: [18, 10765, 10759]
        }
      ],
      total_pages: 500,
      total_results: 10000
    };
  }

  // Movie list fallback (popular, top rated, etc.)
  const mockMovies = {
    page: 1,
    results: [
      {
        id: 912649,
        title: "Venom: The Last Dance",
        overview: "Eddie and Venom are on the run. Hunted by both of their worlds and with the net closing in, the duo are forced into a devastating decision that will bring the curtains down on Venom and Eddie's last dance.",
        poster_path: "/aosm8NMQ3UyoBVpSxyimorCQykC.jpg",
        backdrop_path: "/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg",
        release_date: "2024-10-22",
        vote_average: 6.8,
        popularity: 5589.912,
        genre_ids: [878, 28, 12]
      },
      {
        id: 558449,
        title: "Gladiator II",
        overview: "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.",
        poster_path: "/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
        backdrop_path: "/euYIwmwkmz95mnXvufEmbL6ovhZ.jpg",
        release_date: "2024-11-13",
        vote_average: 7.0,
        popularity: 4320.543,
        genre_ids: [28, 12, 18]
      },
      {
        id: 1184918,
        title: "The Wild Robot",
        overview: "After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island. To survive the harsh environment, Roz bonds with the island's animals and cares for an orphaned baby goose.",
        poster_path: "/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
        backdrop_path: "/4zlOPT9CrtIX05bBIkYxNZsm5zN.jpg",
        release_date: "2024-09-12",
        vote_average: 8.5,
        popularity: 3892.445,
        genre_ids: [16, 878, 10751]
      },
      {
        id: 933260,
        title: "The Substance",
        overview: "A fading celebrity decides to use a black market drug, a cell-replicating substance that temporarily creates a younger, better version of herself.",
        poster_path: "/lqoMzCcZYEFK729d6qzt349fB4o.jpg",
        backdrop_path: "/7h6TqPB3ESmjuVbxCxAeB1c9OB1.jpg",
        release_date: "2024-09-07",
        vote_average: 7.3,
        popularity: 2845.221,
        genre_ids: [27, 878, 53]
      },
      {
        id: 1034062,
        title: "Moana 2",
        overview: "After receiving an unexpected call from her wayfinding ancestors, Moana journeys alongside Maui and a new crew to the far seas of Oceania and into dangerous, long-lost waters for an adventure unlike anything she's ever faced.",
        poster_path: "/yh64qw9mgXBvlaWDi7Q9tpUBAvH.jpg",
        backdrop_path: "/tElnmtQ6yz1PjN1kePNl8yMSb59.jpg",
        release_date: "2024-11-27",
        vote_average: 7.0,
        popularity: 2734.198,
        genre_ids: [16, 12, 10751, 35]
      }
    ],
    total_pages: 500,
    total_results: 10000
  };

  return mockMovies;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Missing required path parameter' },
        { status: 400 }
      );
    }

    // Log environment check (helpful for debugging Vercel deployment)
    const hasToken = !!TMDB_READ_TOKEN && TMDB_READ_TOKEN.length > 50;
    console.log('[TMDB Proxy] Token available:', hasToken);
    console.log('[TMDB Proxy] Requesting path:', path);

    if (!hasToken) {
      console.error('[TMDB Proxy] ERROR: No valid TMDB_ACCESS_TOKEN found in environment variables!');
      const mockData = getMockData(path);
      return NextResponse.json(mockData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Fallback-Data': 'true',
          'X-Error': 'TMDB_ACCESS_TOKEN not configured in Vercel environment variables'
        }
      });
    }

    // Remove path from search params to forward remaining params
    searchParams.delete('path');
    const queryString = searchParams.toString();
    const tmdbUrl = `${TMDB_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;

    try {
      // Try direct TMDB API first
      const response = await retryFetch(tmdbUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
          'Accept': 'application/json',
          'User-Agent': 'ScreenOnFire/1.0'
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      });

      const data = await response.json();
      console.log('[TMDB Proxy] Success - Direct TMDB API');

      return NextResponse.json(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Data-Source': 'tmdb-direct'
        }
      });
    } catch (fetchError) {
      // If direct TMDB fetch fails (likely blocked in India), try CORS proxy
      console.warn('[TMDB Proxy] Direct TMDB failed, trying CORS proxy:', fetchError instanceof Error ? fetchError.message : fetchError);

      try {
        // Use cors.eu.org proxy (free, no rate limits, works in India)
        const proxyUrl = `https://cors.eu.org/${tmdbUrl}`;

        const proxyResponse = await fetchWithTimeout(proxyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
            'Accept': 'application/json',
            'User-Agent': 'ScreenOnFire/1.0',
            'Origin': 'https://screenonfire.vercel.app'
          }
        }, 15000);

        if (!proxyResponse.ok) {
          throw new Error(`Proxy returned ${proxyResponse.status}`);
        }

        const proxyData = await proxyResponse.json();
        console.log('[TMDB Proxy] Success - CORS proxy');

        return NextResponse.json(proxyData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
            'X-Data-Source': 'cors-proxy'
          }
        });
      } catch (proxyError) {
        console.error('[TMDB Proxy] CORS proxy also failed:', proxyError instanceof Error ? proxyError.message : proxyError);

        // Last resort: return mock data with clear indication
        const mockData = getMockData(path);
        console.warn('[TMDB Proxy] Falling back to mock data');

        return NextResponse.json(mockData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
            'X-Data-Source': 'mock-data',
            'X-Error': 'TMDB API unreachable - check Vercel logs'
          }
        });
      }
    }

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch from TMDB API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}