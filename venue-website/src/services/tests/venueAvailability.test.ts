import { describe, expect, it } from 'vitest'
import {
  getRoomAvailability,
  getRoomByName,
  listAvailableVenues,
  resolveRoomName,
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
})
