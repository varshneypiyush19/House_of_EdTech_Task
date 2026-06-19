import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

const BASE_URL = 'https://api.freeapi.app/api/v1';
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export class ApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

// Helper to delay execution for retry backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Secure Store keys for auth
export const AUTH_ACCESS_TOKEN_KEY = 'auth_access_token';
export const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveTokens(accessToken: string, refreshToken: string) {
  try {
    await SecureStore.setItemAsync(AUTH_ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Failed to save tokens', error);
  }
}

export async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(AUTH_ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens', error);
  }
}

async function refreshAuthTokens(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new ApiError('No refresh token available', 401);
  }

  const response = await fetch(`${BASE_URL}/users/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshToken}`, // API expects refresh token in header or body
    },
    body: JSON.stringify({ refreshToken }),
  });

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    await clearTokens();
    throw new ApiError('Refresh token expired or invalid', response.status);
  }

  if (!isJson) {
    await clearTokens();
    throw new ApiError('Server returned an invalid content format (expected JSON) on token refresh.', response.status);
  }

  const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await response.json();
  if (!json.success || !json.data.accessToken) {
    await clearTokens();
    throw new ApiError('Refresh token failed', response.status);
  }

  await saveTokens(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken;
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = TIMEOUT_MS, skipAuth = false, ...fetchOptions } = options;

  // 1. Check network connection first
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    throw new ApiError('No internet connection. Please check your network and try again.', 0);
  }

  let attempt = 0;
  
  const executeCall = async (): Promise<T> => {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const headers = new Headers(fetchOptions.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach auth token if needed
    if (!skipAuth) {
      const token = await getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(id);

      // Handle 401 Unauthorized (attempt token refresh)
      if (response.status === 401 && !skipAuth) {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const newAccessToken = await refreshAuthTokens();
              isRefreshing = false;
              onRefreshed(newAccessToken);
            } catch (refreshErr) {
              isRefreshing = false;
              refreshSubscribers = [];
              throw refreshErr;
            }
          }

          // Queue this request until token is refreshed
          const retryWithNewToken = new Promise<string>((resolve) => {
            subscribeTokenRefresh((token) => resolve(token));
          });

          const freshToken = await retryWithNewToken;
          headers.set('Authorization', `Bearer ${freshToken}`);
          
          // Re-execute request with new token
          const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
          });

          const retryContentType = retryResponse.headers.get('Content-Type') || '';
          const isRetryJson = retryContentType.includes('application/json');

          if (!retryResponse.ok) {
            let errMessage = 'Request failed after token refresh';
            if (isRetryJson) {
              const errJson = await retryResponse.json().catch(() => ({}));
              errMessage = errJson.message || errMessage;
            }
            throw new ApiError(errMessage, retryResponse.status);
          }

          if (!isRetryJson) {
            throw new ApiError('Server returned an invalid content format after token refresh.', retryResponse.status);
          }

          const retryJson: ApiResponse<T> = await retryResponse.json();
          return retryJson.data;
        }
      }

      const contentType = response.headers.get('Content-Type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        let errMessage = 'HTTP error occurred';
        if (isJson) {
          const errJson = await response.json().catch(() => ({}));
          errMessage = errJson.message || errMessage;
        }
        throw new ApiError(errMessage, response.status);
      }

      if (!isJson) {
        throw new ApiError('Server returned an invalid content format (expected JSON).', response.status);
      }

      const json: ApiResponse<T> = await response.json();
      if (!json.success) {
        throw new ApiError(json.message || 'API request failed', response.status);
      }

      return json.data;
    } catch (error: any) {
      clearTimeout(id);

      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out. Please try again.', 408);
      }

      // Retry logic for network errors (status 0 or 5xx)
      const isNetworkError = error.statusCode === 0 || error instanceof TypeError;
      const isServerError = error.statusCode >= 500 && error.statusCode < 600;

      if ((isNetworkError || isServerError) && attempt < MAX_RETRIES) {
        const backoffDelay = Math.pow(2, attempt) * 1000;
        await sleep(backoffDelay);
        return executeCall();
      }

      throw error;
    }
  };

  return executeCall();
}
