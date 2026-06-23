/** Extracts FastAPI or transport error text from an RTK Query rejection. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback
  }

  const apiError = error as { data?: unknown; message?: unknown }
  if (typeof apiError.data === 'object' && apiError.data !== null) {
    const detail = (apiError.data as { detail?: unknown }).detail
    if (typeof detail === 'string') {
      return detail
    }
  }

  return typeof apiError.message === 'string' ? apiError.message : fallback
}
