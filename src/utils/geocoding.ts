// Simple geocoding utility for common Indian locations
// In production, you would use Google Maps API or similar service

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

// Common locations in Delhi/NCR for demo purposes
const COMMON_LOCATIONS: Record<string, Location> = {
  // Airports
  airport: {
    name: "Indira Gandhi International Airport",
    lat: 28.5562,
    lng: 77.1,
  },
  "igi airport": {
    name: "Indira Gandhi International Airport",
    lat: 28.5562,
    lng: 77.1,
  },
  "delhi airport": {
    name: "Indira Gandhi International Airport",
    lat: 28.5562,
    lng: 77.1,
  },

  // Railway Stations
  "new delhi railway station": {
    name: "New Delhi Railway Station",
    lat: 28.6434,
    lng: 77.2197,
  },
  "old delhi railway station": {
    name: "Old Delhi Railway Station",
    lat: 28.6624,
    lng: 77.2288,
  },
  "railway station": {
    name: "New Delhi Railway Station",
    lat: 28.6434,
    lng: 77.2197,
  },

  // Metro Stations
  "rajiv chowk": {
    name: "Rajiv Chowk Metro Station",
    lat: 28.6328,
    lng: 77.2197,
  },
  "connaught place": { name: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  cp: { name: "Connaught Place", lat: 28.6315, lng: 77.2167 },

  // Popular Areas
  "india gate": { name: "India Gate", lat: 28.6129, lng: 77.2295 },
  "red fort": { name: "Red Fort", lat: 28.6562, lng: 77.241 },
  "karol bagh": { name: "Karol Bagh", lat: 28.6507, lng: 77.1909 },
  saket: { name: "Saket", lat: 28.5245, lng: 77.2066 },
  gurgaon: { name: "Gurgaon", lat: 28.4595, lng: 77.0266 },
  noida: { name: "Noida", lat: 28.5355, lng: 77.391 },
  dwarka: { name: "Dwarka", lat: 28.5921, lng: 77.046 },
  rohini: { name: "Rohini", lat: 28.7041, lng: 77.1025 },
  janakpuri: { name: "Janakpuri", lat: 28.6219, lng: 77.0814 },
  "lajpat nagar": { name: "Lajpat Nagar", lat: 28.5653, lng: 77.243 },
  "chandni chowk": { name: "Chandni Chowk", lat: 28.6506, lng: 77.2306 },
  paharganj: { name: "Paharganj", lat: 28.6433, lng: 77.2089 },

  // Malls
  "select city walk": {
    name: "Select City Walk Mall",
    lat: 28.5245,
    lng: 77.2066,
  },
  "dlf mall": { name: "DLF Mall of India", lat: 28.7041, lng: 77.1025 },
  "mall of india": { name: "DLF Mall of India", lat: 28.7041, lng: 77.1025 },

  // Corporate Areas
  "cyber city": { name: "Cyber City, Gurgaon", lat: 28.4946, lng: 77.0869 },
  "sector 18 noida": { name: "Sector 18, Noida", lat: 28.5689, lng: 77.3247 },
};

export function getLocationFromText(text: string): Location | null {
  const normalizedText = text.toLowerCase().trim();

  // Try exact match first
  if (COMMON_LOCATIONS[normalizedText]) {
    return COMMON_LOCATIONS[normalizedText];
  }

  // Try partial matches
  for (const [key, location] of Object.entries(COMMON_LOCATIONS)) {
    if (normalizedText.includes(key) || key.includes(normalizedText)) {
      return location;
    }
  }

  return null;
}

// Default location (Central Delhi) for when we can't find the destination
export const DEFAULT_CURRENT_LOCATION: Location = {
  name: "Current Location",
  lat: 28.6139,
  lng: 77.209,
};

export function isLocationQuery(text: string): boolean {
  const locationKeywords = [
    "go to",
    "going to",
    "travel to",
    "ride to",
    "trip to",
    "want to go",
    "need to go",
    "have to go",
    "airport",
    "station",
    "mall",
    "office",
    "home",
    "book a ride",
    "find a ride",
    "any rides",
    "available rides",
    "rides available",
    "what rides",
  ];

  const normalizedText = text.toLowerCase();
  return locationKeywords.some((keyword) => normalizedText.includes(keyword));
}

export function extractDestination(text: string): string | null {
  const normalizedText = text.toLowerCase();

  // Common patterns to extract destination
  const patterns = [
    /(?:go to|going to|travel to|ride to|trip to)\s+(.+?)(?:\s|$|\?|!)/,
    /(?:want to go|need to go|have to go)\s+(?:to\s+)?(.+?)(?:\s|$|\?|!)/,
    /(?:book a ride|find a ride)\s+(?:to\s+)?(.+?)(?:\s|$|\?|!)/,
    /(?:any rides)\s+(?:to\s+)?(.+?)(?:\s|$|\?|!)/,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, check if the text contains known locations
  for (const location of Object.keys(COMMON_LOCATIONS)) {
    if (normalizedText.includes(location)) {
      return location;
    }
  }

  return null;
}
