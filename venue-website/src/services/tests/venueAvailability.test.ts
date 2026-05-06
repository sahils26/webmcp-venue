import { describe, expect, it } from 'vitest'
import {
  getRoomAvailability,
  getRoomByName,
  resolveRoomName,
} from '../venueAvailability'

describe('venue availability service', () => {
  it('resolves room names case-insensitively', () => {
    expect(resolveRoomName('grand hall')).toBe('Grand Hall')
  })

  it('returns room details for known rooms', () => {
    expect(getRoomByName('Meeting Room A')).toEqual({
      capacity: 20,
      pricePerDay: 300,
      hasProjector: true,
    })
  })

  it('marks a known booked date as unavailable', () => {
    expect(getRoomAvailability('Grand Hall', '2026-05-15')).toMatchObject({
      success: true,
      roomName: 'Grand Hall',
      date: '2026-05-15',
      available: false,
    })
  })

  it('marks an open date as available', () => {
    expect(getRoomAvailability('Grand Hall', '2026-05-17')).toMatchObject({
      success: true,
      roomName: 'Grand Hall',
      date: '2026-05-17',
      available: true,
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
      roomName: 'Grand Hall',
      date: '',
      available: false,
      message: 'Please provide a valid date for the quote request.',
    })
  })
})
