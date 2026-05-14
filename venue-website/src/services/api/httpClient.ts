import axios from 'axios'

/**
 * Shared Axios instance for all API traffic.
 *
 * Defaults stay intentionally small here; auth headers, correlation IDs, and
 * backend-specific interceptors can be added in one place as the API matures.
 */
export const httpClient = axios.create({
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
})
