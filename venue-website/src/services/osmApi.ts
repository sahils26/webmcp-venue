import type { OSMVenue } from '../types/venue'

/**
 * Partial Overpass API element shape used by this app.
 * The API can return many more fields; only the fields below are needed for UI display.
 */
interface OverpassElement {
  /** OpenStreetMap element id. */
  id: number

  /** Latitude on node responses. */
  lat?: number

  /** Longitude on node responses. */
  lon?: number

  /** Calculated center for area/way responses. */
  center?: {
    lat?: number
    lon?: number
  }

  /** OSM tags such as name, amenity, and tourism. */
  tags?: Record<string, string>
}

/**
 * Top-level response shape returned by the Overpass interpreter endpoint.
 */
interface OverpassResponse {
  elements?: OverpassElement[]
}

/**
 * Public Overpass API endpoint used for live venue lookup.
 */
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

/**
 * Overpass query for a small list of hotels and event venues in Jena, Germany.
 * Keep this query close to the service so future API changes remain isolated.
 */
const JENA_VENUE_QUERY = `
  [out:json][timeout:25];
  area["name"="Jena"]->.searchArea;
  (
    node["tourism"="hotel"](area.searchArea);
    node["amenity"="events_venue"](area.searchArea);
  );
  out center 5;
`

/**
 * Converts a raw Overpass element into the app's normalized OSMVenue contract.
 *
 * @param element - Raw venue element returned by Overpass.
 * @returns A display-ready venue object with stable field names.
 */
function mapOverpassElementToVenue(element: OverpassElement): OSMVenue {
  return {
    id: element.id,
    name: element.tags?.name ?? 'Unnamed venue',
    latitude: element.lat ?? element.center?.lat,
    longitude: element.lon ?? element.center?.lon,
    category: element.tags?.amenity ?? element.tags?.tourism ?? 'venue',
  }
}

/**
 * Loads nearby venue candidates from OpenStreetMap's Overpass API.
 *
 * @param signal - Optional AbortSignal used by React effects to cancel in-flight requests.
 * @returns A normalized list of venue candidates.
 * @throws Error when the Overpass request returns a non-2xx response.
 */
export async function fetchRealVenues(signal?: AbortSignal): Promise<OSMVenue[]> {
  const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(JENA_VENUE_QUERY)}`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`OpenStreetMap venue lookup failed with ${response.status}.`)
  }

  const data = (await response.json()) as OverpassResponse

  return (data.elements ?? []).map(mapOverpassElementToVenue)
}
