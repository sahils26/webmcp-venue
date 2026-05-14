import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { QuoteDraft } from '../../types/venue'

const quoteDraftFields = ['roomName', 'date', 'email'] as const

export type QuoteDraftField = (typeof quoteDraftFields)[number]

export interface QuoteState {
  draft: QuoteDraft
  status: string | null
}

const initialDraft: QuoteDraft = {
  roomName: '',
  date: '',
  email: '',
}

const initialState: QuoteState = {
  draft: initialDraft,
  status: null,
}

export function isQuoteDraftField(name: string): name is QuoteDraftField {
  return quoteDraftFields.includes(name as QuoteDraftField)
}

const quoteSlice = createSlice({
  name: 'quote',
  initialState,
  reducers: {
    quoteDraftFieldChanged(
      state,
      action: PayloadAction<{ name: QuoteDraftField; value: string }>,
    ) {
      state.draft[action.payload.name] = action.payload.value
    },
    quoteDraftPrepared(state, action: PayloadAction<QuoteDraft>) {
      state.draft = action.payload
    },
    quoteDraftCleared(state) {
      state.draft = initialDraft
      state.status = null
    },
    quoteStatusSet(state, action: PayloadAction<string | null>) {
      state.status = action.payload
    },
  },
})

export const {
  quoteDraftCleared,
  quoteDraftFieldChanged,
  quoteDraftPrepared,
  quoteStatusSet,
} = quoteSlice.actions

export const quoteReducer = quoteSlice.reducer

export const selectQuoteDraft = (state: { quote: QuoteState }) => state.quote.draft
export const selectQuoteStatus = (state: { quote: QuoteState }) => state.quote.status
