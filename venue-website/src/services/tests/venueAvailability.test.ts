import { describe, expect, it } from 'vitest'
import {
  getRoomAvailability,
  getRoomByName,
  listAvailableVenues,
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
      location: 'Gera',
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
          location: 'Erfurt',
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
      exactMatchCount: 2,
    })
    expect(result.venues.map((venue) => venue.name)).toEqual([
      'River Conference Suite',
      'The Grand Hall',
    ])
  })

  it('returns close suggestions when no event type exactly matches the catalog', () => {
    const result = searchVenues({
      eventType: 'wedding',
      details: 'outdoor reception with catering and parking',
    })

    expect(result).toMatchObject({
      success: true,
      exactMatchCount: 0,
      suggestionCount: 3,
      message:
        "We don't have an exact venue match for every detail, but these are the closest suggestions from the current facilities.",
    })
    expect(result.venues[0]).toMatchObject({
      fit: 'suggestion',
      matchedAmenities: expect.arrayContaining(['outdoor', 'catering', 'parking']),
    })
  })
})
