import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AgentActivityState {
  lastQuery: string | null
}

const initialState: AgentActivityState = {
  lastQuery: null,
}

const agentActivitySlice = createSlice({
  name: 'agentActivity',
  initialState,
  reducers: {
    agentQueryRecorded(state, action: PayloadAction<string>) {
      state.lastQuery = action.payload
    },
    agentActivityCleared(state) {
      state.lastQuery = null
    },
  },
})

export const { agentActivityCleared, agentQueryRecorded } = agentActivitySlice.actions

export const agentActivityReducer = agentActivitySlice.reducer

export const selectLastAgentQuery = (state: { agentActivity: AgentActivityState }) =>
  state.agentActivity.lastQuery
