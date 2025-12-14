// Axios types - optional dependency
type AxiosInstance = any;
type AxiosRequestConfig = any;
type AxiosResponse = any;
type AxiosError = any;
import type { NetworkHandler } from '../core/networkHandler';
import type { RetryConfig } from '../types';

/**
 * Create axios interceptor that uses NetworkHandler
 */
export function createAxiosInterceptor(handler: NetworkHandler) {
  return {
    request: (
      config: AxiosRequestConfig
    ): AxiosRequestConfig | Promise<AxiosRequestConfig> => {
      // Store original adapter if not already set
      if (!(config as any).__originalAdapter) {
        (config as any).__originalAdapter = config.adapter;
      }
      return config;
    },

    response: {
      onFulfilled: (response: AxiosResponse) => response,
      onRejected: async (error: AxiosError): Promise<AxiosResponse> => {
        const config = error.config;
        if (!config) {
          throw error;
        }

        // Get retry config from request config
        const retryConfig = (config as any).__retryConfig as
          | Partial<RetryConfig>
          | undefined;

        // Convert axios request to fetch
        const url = config.url || '';
        const fullUrl = config.baseURL ? `${config.baseURL}${url}` : url;

        const fetchOptions: RequestInit = {
          method: config.method?.toUpperCase() || 'GET',
          headers: config.headers as HeadersInit,
          body: config.data,
          signal: config.signal,
        };

        try {
          // Use smart fetch with retry
          const response = await handler.smartFetch(
            fullUrl,
            fetchOptions,
            retryConfig
          );

          // Convert fetch response to axios response format
          const data = await response.json().catch(() => response.text());
          const headers: Record<string, string> = {};
          response.headers.forEach((value: string, key: string) => {
            headers[key] = value;
          });
          const axiosResponse: AxiosResponse = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers,
            config,
            request: {},
          };

          return axiosResponse;
        } catch {
          throw error; // Re-throw original axios error
        }
      },
    },
  };
}

/**
 * Apply axios interceptor to axios instance
 */
export function applyAxiosInterceptor(
  axiosInstance: AxiosInstance,
  handler: NetworkHandler
): () => void {
  const interceptor = createAxiosInterceptor(handler);

  const requestId = axiosInstance.interceptors.request.use(interceptor.request);
  const responseId = axiosInstance.interceptors.response.use(
    interceptor.response.onFulfilled,
    interceptor.response.onRejected
  );

  // Return cleanup function
  return () => {
    axiosInstance.interceptors.request.eject(requestId);
    axiosInstance.interceptors.response.eject(responseId);
  };
}

/**
 * Helper to set retry config on axios request
 */
export function withRetryConfig<T extends AxiosRequestConfig>(
  config: T,
  retryConfig: Partial<RetryConfig>
): T {
  const result = { ...(config as Record<string, any>) };
  result.__retryConfig = retryConfig;
  return result as T;
}
