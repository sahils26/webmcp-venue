import { type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { store as defaultStore, type AppStore } from './store'

interface AppProviderProps {
  children: ReactNode
  store?: AppStore
}

/**
 * Central application provider.
 *
 * Keeping this wrapper separate from main.tsx makes tests and future providers
 * easy to compose without changing feature components.
 */
export function AppProvider({ children, store = defaultStore }: AppProviderProps) {
  return <Provider store={store}>{children}</Provider>
}
