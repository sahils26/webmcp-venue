import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { AppProvider } from '../app/AppProvider'
import { setupStore, type AppStore, type RootState } from '../app/store'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>
  store?: AppStore
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = setupStore(preloadedState),
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppProvider store={store}>{children}</AppProvider>
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}
