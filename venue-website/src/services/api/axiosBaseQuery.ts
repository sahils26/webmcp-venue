import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { httpClient } from './httpClient'

export interface ApiError {
  status: number | string
  data: unknown
  message: string
}

type AxiosBaseQueryArgs = Pick<
  AxiosRequestConfig,
  'data' | 'headers' | 'method' | 'params' | 'url'
>

interface AxiosBaseQueryOptions {
  baseUrl?: string
}

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError

    return {
      status: axiosError.response?.status ?? 'FETCH_ERROR',
      data: axiosError.response?.data ?? axiosError.message,
      message: axiosError.message,
    }
  }

  return {
    status: 'UNKNOWN_ERROR',
    data: error,
    message: error instanceof Error ? error.message : 'Unknown API error.',
  }
}

export function axiosBaseQuery({
  baseUrl = import.meta.env.VITE_API_BASE_URL ?? '',
}: AxiosBaseQueryOptions = {}): BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> {
  return async ({ url, method = 'GET', data, params, headers }, api) => {
    try {
      const result = await httpClient.request({
        baseURL: baseUrl,
        url,
        method,
        data,
        params,
        headers,
        signal: api.signal,
      })

      return { data: result.data }
    } catch (error) {
      return { error: toApiError(error) }
    }
  }
}
