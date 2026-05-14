import { api } from '../../services/api/baseApi'
import type { OSMVenue } from '../../types/venue'

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  center?: {
    lat?: number
    lon?: number
  }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

export const JENA_VENUE_QUERY = `
  [out:json][timeout:25];
  area["name"="Jena"]->.searchArea;
  (
    node["tourism"="hotel"](area.searchArea);
    node["amenity"="events_venue"](area.searchArea);
  );
  out center 5;
`

export function mapOverpassElementToVenue(element: OverpassElement): OSMVenue {
  return {
    id: element.id,
    name: element.tags?.name ?? 'Unnamed venue',
    latitude: element.lat ?? element.center?.lat,
    longitude: element.lon ?? element.center?.lon,
    category: element.tags?.amenity ?? element.tags?.tourism ?? 'venue',
  }
}

export const venueApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNearbyVenues: builder.query<OSMVenue[], void>({
      query: () => ({
        url: OVERPASS_ENDPOINT,
        method: 'GET',
        params: {
          data: JENA_VENUE_QUERY,
        },
      }),
      transformResponse: (response: OverpassResponse) =>
        (response.elements ?? []).map(mapOverpassElementToVenue),
      providesTags: ['NearbyVenue'],
      keepUnusedDataFor: 300,
    }),
  }),
})

export const { useGetNearbyVenuesQuery } = venueApi
