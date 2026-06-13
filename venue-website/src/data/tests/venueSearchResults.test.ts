import { describe, expect, it } from 'vitest'
import { getVenueSearchResults, supportedVenueLocales } from '../venueSearchResults'

describe('venueSearchResults', () => {
  it('projects locale-ready JSON data into German venue card payloads', () => {
    const [grandHall] = getVenueSearchResults('de')

    expect(supportedVenueLocales).toEqual(['en', 'de'])
    expect(grandHall.name).toBe('Der Große Saal')
    expect(grandHall.compact_amenity_labels.projector).toBe('Projektor')
    expect(grandHall.detailed_amenities[0]).toMatchObject({
      id: 'projector',
      icon: '📽️',
      label: 'Professioneller Projektor & Leinwand',
    })
  })

  it('exposes each venue suitability list as event_types', () => {
    const [grandHall] = getVenueSearchResults('en')

    expect(grandHall.event_types).toContain('wedding')
    expect(grandHall.event_types).toContain('conference')
  })
})
