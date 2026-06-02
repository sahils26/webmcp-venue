import { describe, expect, it } from 'vitest'
import {
  getRoomAvailability,
  getRoomByName,
  listAvailableVenues,
  recommendVenuesByEventType,
  resolveRoomName,
  searchVenues,
} from '../venueAvailability'

describe('venue availability service', () => {
  it('resolves room names case-insensitively', () => {
    expect(resolveRoomName('grand hall')).toBe('The Grand Hall')
  })

  it('returns room details from the JSON venue catalog', () => {
    expect(getRoomByName('river-conference-suite')).toEqual({
      id: 'river-conference-suite',
      name: 'River Conference Suite',
      capacity: 120,
      location: 'Jena',
      pricePerDay: 1100,
      currencyCode: 'EUR',
      formattedPricePerDay: '€1,100',
      hasProjector: true,
      availableDates: ['2026-07-03', '2026-07-10', '2026-07-24'],
    })
  })

  it('marks a date outside the JSON availability list as unavailable', () => {
    expect(getRoomAvailability('Grand Hall', '2026-05-15')).toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-05-15',
      available: false,
      message: 'The Grand Hall is not available on 2026-05-15.',
    })
  })

  it('marks a JSON-listed available date as available', () => {
    expect(getRoomAvailability('Grand Hall', '2026-06-15')).toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-06-15',
      available: true,
    })
  })

  it('checks availability against an optional event type when one is supplied', () => {
    expect(getRoomAvailability('Garden Pavilion', '2026-07-08', 'birthday')).toMatchObject({
      success: true,
      roomName: 'Garden Pavilion',
      date: '2026-07-08',
      available: true,
      matchedEventType: 'celebration',
      eventTypeLabel: 'Celebration & Party',
      eventTypeSuitable: true,
      message: 'Garden Pavilion is available on 2026-07-08 and is suitable for Celebration & Party.',
    })

    expect(getRoomAvailability('Grand Hall', '2026-06-15', 'birthday')).toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-06-15',
      available: false,
      matchedEventType: 'celebration',
      eventTypeSuitable: false,
      message:
        'The Grand Hall is available on 2026-06-15, but it is not tagged for Celebration & Party.',
    })
  })

  it('lists all venue options when no date is provided', () => {
    const result = listAvailableVenues()

    expect(result).toMatchObject({
      success: true,
      date: '',
      message: 'Here are the available venues and their next available dates.',
    })
    expect(result.venues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'The Grand Hall',
          location: 'Jena',
          capacity: 150,
          formattedPricePerDay: '€1,200',
          nextAvailableDate: '2026-06-15',
        }),
      ]),
    )
  })

  it('filters available venue options by date', () => {
    expect(listAvailableVenues('2026-06-15')).toMatchObject({
      success: true,
      date: '2026-06-15',
      venues: [
        {
          name: 'The Grand Hall',
          nextAvailableDate: '2026-06-15',
        },
      ],
      message: '1 venue is available on 2026-06-15.',
    })
  })

  it('returns a helpful error for unknown rooms', () => {
    expect(getRoomAvailability('Boardroom', '2026-05-17')).toMatchObject({
      success: false,
      roomName: 'Boardroom',
      available: false,
      message: "Room 'Boardroom' does not exist.",
    })
  })

  it('returns a helpful error for invalid dates', () => {
    expect(getRoomAvailability('Grand Hall', '2026-02-31')).toMatchObject({
      success: false,
      roomName: 'The Grand Hall',
      date: '',
      available: false,
      message: 'Please provide a valid date for the quote request.',
    })
  })

  it('searches venues by a capacity range parsed from free text', () => {
    const result = searchVenues({
      query: 'Can you give me details of the venue which can accomodate around 100 to 150 people?',
    })

    expect(result).toMatchObject({
      success: true,
      exactMatchCount: 2,
    })
    expect(result.venues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fit: 'exact',
          name: 'River Conference Suite',
          capacity: 120,
        }),
        expect.objectContaining({
          fit: 'exact',
          name: 'The Grand Hall',
          capacity: 150,
        }),
      ]),
    )
  })

  it('searches venues that can accommodate a single guest count', () => {
    const result = searchVenues({ guestCount: 100 })

    expect(result).toMatchObject({
      success: true,
      matchedEventType: '',
      exactMatchCount: 2,
    })
    expect(result.venues.map((venue) => venue.name)).toEqual([
      'River Conference Suite',
      'The Grand Hall',
    ])
  })

  it('searches by non-event requirements when no event type is supplied', () => {
    const result = searchVenues({
      guestCount: 100,
      requiredAmenities: ['projector'],
    })

    expect(result).toMatchObject({
      success: true,
      matchedEventType: '',
      exactMatchCount: 2,
      venues: expect.arrayContaining([
        expect.objectContaining({ fit: 'exact', name: 'The Grand Hall' }),
        expect.objectContaining({ fit: 'exact', name: 'River Conference Suite' }),
      ]),
    })
  })

  it('normalizes birthday-style event requests before searching venues', () => {
    const eventTypeResult = searchVenues({ eventType: 'birthday' })

    expect(eventTypeResult).toMatchObject({
      success: true,
      matchedEventType: 'celebration',
      eventTypeLabel: 'Celebration & Party',
      exactMatchCount: 2,
    })
    expect(eventTypeResult.venues.map((venue) => venue.name).sort()).toEqual([
      'Atelier Courtyard',
      'Garden Pavilion',
    ])

    const freeTextResult = searchVenues({ query: 'birthday party for 60 people' })

    expect(freeTextResult).toMatchObject({
      success: true,
      matchedEventType: 'celebration',
      exactMatchCount: 2,
    })
    expect(freeTextResult.venues.map((venue) => venue.name).sort()).toEqual([
      'Atelier Courtyard',
      'Garden Pavilion',
    ])
  })

  it('returns exact matches when event type and planning details match the catalog', () => {
    const result = searchVenues({
      eventType: 'wedding',
      details: 'outdoor reception with catering and parking',
    })

    expect(result).toMatchObject({
      success: true,
      matchedEventType: 'wedding',
      exactMatchCount: 1,
      suggestionCount: 0,
      message: '1 venue matches your request.',
    })
    expect(result.venues[0]).toMatchObject({
      fit: 'exact',
      name: 'Garden Pavilion',
      matchedAmenities: expect.arrayContaining(['outdoor', 'catering', 'parking']),
    })
  })

  it('recommends only venues tagged for the requested event type', () => {
    const result = recommendVenuesByEventType('wedding')

    expect(result).toMatchObject({
      success: true,
      matchedEventType: 'wedding',
    })
    expect(result.venues.map((venue) => venue.name).sort()).toEqual([
      'Garden Pavilion',
      'The Grand Hall',
    ])
    expect(result.venues.every((venue) => venue.eventTypes.includes('wedding'))).toBe(true)
  })

  it('resolves event type synonyms before recommending venues', () => {
    const result = recommendVenuesByEventType('gala')

    expect(result.matchedEventType).toBe('networking')
    expect(result.venues.map((venue) => venue.name)).toContain('The Grand Hall')

    const birthdayResult = recommendVenuesByEventType('birthday')

    expect(birthdayResult.matchedEventType).toBe('celebration')
    expect(birthdayResult.venues.map((venue) => venue.name).sort()).toEqual([
      'Atelier Courtyard',
      'Garden Pavilion',
    ])
  })

  it('returns supported event types when the event type is unrecognised', () => {
    const result = recommendVenuesByEventType('underwater rave')

    expect(result.success).toBe(false)
    expect(result.matchedEventType).toBe('')
    expect(result.venues).toHaveLength(5)
    expect(result.supportedEventTypes.map((eventType) => eventType.id)).toContain('wedding')
  })
})
