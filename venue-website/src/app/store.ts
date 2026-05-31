import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { agentActivityReducer } from '../features/agent/agentActivitySlice'
import { quoteReducer } from '../features/quote/quoteSlice'
import { api } from '../services/api/baseApi'

export const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  agentActivity: agentActivityReducer,
  quote: quoteReducer,
})

export type RootState = ReturnType<typeof rootReducer>

export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    preloadedState,
  })
}

export const store = setupStore()

setupListeners(store.dispatch)

export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']
