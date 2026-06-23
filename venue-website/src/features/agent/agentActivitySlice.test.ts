import { describe, expect, it } from 'vitest'
import {
  agentActivityCleared,
  agentActivityReducer,
  agentQueryRecorded,
  selectLastAgentQuery,
} from './agentActivitySlice'

describe('agentActivitySlice', () => {
  it('records, selects, and clears the latest agent activity', () => {
    const recorded = agentActivityReducer(undefined, agentQueryRecorded('Checking venues'))

    expect(selectLastAgentQuery({ agentActivity: recorded })).toBe('Checking venues')
    expect(agentActivityReducer(recorded, agentActivityCleared())).toEqual({ lastQuery: null })
  })
})
