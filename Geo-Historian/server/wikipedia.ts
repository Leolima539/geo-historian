const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
const WIKIPEDIA_GEOSEARCH_API = 'https://en.wikipedia.org/w/api.php';

interface GeoSearchResult {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
}

interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface WikipediaLocation {
  locationName: string;
  content: string;
  latitude: number;
  longitude: number;
  distance: number;
}

export async function findNearbyWikipediaArticles(
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000,
  limit: number = 5,
  language: 'en' | 'es' = 'en'
): Promise<GeoSearchResult[]> {
  const baseUrl = language === 'es' 
    ? 'https://es.wikipedia.org/w/api.php'
    : WIKIPEDIA_GEOSEARCH_API;
    
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${latitude}|${longitude}`,
    gsradius: String(Math.min(radiusMeters, 10000)),
    gslimit: String(limit),
    format: 'json',
    origin: '*',
  });

  try {
    const response = await fetch(`${baseUrl}?${params}`);
    if (!response.ok) {
      console.error('Wikipedia geosearch failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.query?.geosearch || [];
  } catch (error) {
    console.error('Wikipedia geosearch error:', error);
    return [];
  }
}

export async function getWikipediaSummary(
  title: string,
  language: 'en' | 'es' = 'en'
): Promise<WikipediaSummary | null> {
  const baseUrl = language === 'es'
    ? 'https://es.wikipedia.org/api/rest_v1'
    : WIKIPEDIA_API_BASE;
    
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  
  try {
    const response = await fetch(`${baseUrl}/page/summary/${encodedTitle}`, {
      headers: {
        'User-Agent': 'HistoricalExplorer/1.0 (location-based-history-app)',
      },
    });
    
    if (!response.ok) {
      console.error('Wikipedia summary failed:', response.status, title);
      return null;
    }
    
    const data = await response.json();
    return {
      title: data.title,
      extract: data.extract || '',
      description: data.description,
      coordinates: data.coordinates,
    };
  } catch (error) {
    console.error('Wikipedia summary error:', error);
    return null;
  }
}

export async function exploreLocation(
  latitude: number,
  longitude: number,
  language: 'en' | 'es' = 'en'
): Promise<WikipediaLocation | null> {
  const nearbyArticles = await findNearbyWikipediaArticles(
    latitude,
    longitude,
    1000,
    3,
    language
  );
  
  if (nearbyArticles.length === 0) {
    const expandedSearch = await findNearbyWikipediaArticles(
      latitude,
      longitude,
      5000,
      3,
      language
    );
    
    if (expandedSearch.length === 0) {
      return null;
    }
    
    nearbyArticles.push(...expandedSearch);
  }
  
  const bestMatch = nearbyArticles[0];
  const summary = await getWikipediaSummary(bestMatch.title, language);
  
  if (!summary || !summary.extract) {
    for (let i = 1; i < nearbyArticles.length; i++) {
      const altSummary = await getWikipediaSummary(nearbyArticles[i].title, language);
      if (altSummary?.extract) {
        return {
          locationName: altSummary.title,
          content: formatContent(altSummary),
          latitude: nearbyArticles[i].lat,
          longitude: nearbyArticles[i].lon,
          distance: nearbyArticles[i].dist,
        };
      }
    }
    return null;
  }
  
  return {
    locationName: summary.title,
    content: formatContent(summary),
    latitude: bestMatch.lat,
    longitude: bestMatch.lon,
    distance: bestMatch.dist,
  };
}

function formatContent(summary: WikipediaSummary): string {
  let content = summary.extract;
  
  if (summary.description && !content.toLowerCase().includes(summary.description.toLowerCase())) {
    content = `${summary.description}\n\n${content}`;
  }
  
  return content;
}

export async function exploreMultipleLocations(
  waypoints: Array<{ latitude: number; longitude: number }>,
  language: 'en' | 'es' = 'en'
): Promise<WikipediaLocation[]> {
  const results = await Promise.all(
    waypoints.map(wp => exploreLocation(wp.latitude, wp.longitude, language))
  );
  
  return results.filter((r): r is WikipediaLocation => r !== null);
}
