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

interface XhrResponse {
  status: number;
  headers: {
    get: (name: string) => string | null;
  };
  ok: boolean;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

function xhrFetch(url: string, options: any): Promise<XhrResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    if (options.headers) {
      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      headers.forEach((value: string, key: string) => {
        // Do not set Content-Type manually for FormData so that XHR sets boundary automatically
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    xhr.onload = () => {
      const headersMap = new Map<string, string>();
      const rawHeaders = xhr.getAllResponseHeaders();
      rawHeaders.split('\r\n').forEach((line) => {
        const parts = line.split(': ');
        const key = parts[0]?.toLowerCase();
        const val = parts.slice(1).join(': ');
        if (key) {
          headersMap.set(key, val);
        }
      });

      const responseObj: XhrResponse = {
        status: xhr.status,
        headers: {
          get: (name: string) => headersMap.get(name.toLowerCase()) || null,
        },
        ok: xhr.status >= 200 && xhr.status < 300,
        json: async () => {
          return JSON.parse(xhr.responseText);
        },
        text: async () => {
          return xhr.responseText;
        },
      };
      resolve(responseObj);
    };

    xhr.onerror = () => {
      reject(new TypeError('Network request failed'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Request timed out'));
    };

    xhr.send(options.body);
  });
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = TIMEOUT_MS, skipAuth = false, skipRefresh = false, ...fetchOptions } = options;

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
    const isFormData = fetchOptions.body instanceof FormData;
    if (!headers.has('Content-Type') && !isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach auth token if needed
    if (!skipAuth) {
      const token = await getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const doFetch = (url: string, initOptions: any) => {
      if (isFormData) {
        return xhrFetch(url, initOptions);
      }
      return fetch(url, initOptions);
    };

    try {
      const response = await doFetch(`${BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(id);

      // Handle 401 Unauthorized (attempt token refresh)
      if (response.status === 401 && !skipAuth && !skipRefresh) {
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
          const retryResponse = await doFetch(`${BASE_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
          });

          const retryContentType = retryResponse.headers.get('Content-Type') || '';
          const isRetryJson = retryContentType.includes('application/json');

          if (!retryResponse.ok) {
            let errMessage = `Request failed after token refresh: ${retryResponse.status}`;
            if (isRetryJson) {
              try {
                const errText = await retryResponse.text();
                const errJson = JSON.parse(errText);
                if (Array.isArray(errJson.errors) && errJson.errors.length > 0) {
                  const details = errJson.errors.map((e: any) => e.message || e.msg || JSON.stringify(e)).join(', ');
                  errMessage = `${errJson.message || 'Validation error'}: ${details}`;
                } else {
                  errMessage = errJson.message || errMessage;
                }
              } catch {
                // Ignore parse errors
              }
            } else {
              try {
                const errText = await retryResponse.text();
                if (errText && errText.trim().length > 0) {
                  const cleanText = errText.replace(/<[^>]*>/g, '').trim().substring(0, 100);
                  errMessage = `Server error (${retryResponse.status}): ${cleanText}`;
                }
              } catch {
                // Ignore text read errors
              }
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
        let errMessage = `HTTP error occurred: ${response.status}`;
        if (isJson) {
          try {
            const errText = await response.text();
            const errJson = JSON.parse(errText);
            if (Array.isArray(errJson.errors) && errJson.errors.length > 0) {
              const details = errJson.errors.map((e: any) => e.message || e.msg || JSON.stringify(e)).join(', ');
              errMessage = `${errJson.message || 'Validation error'}: ${details}`;
            } else {
              errMessage = errJson.message || errMessage;
            }
          } catch {
            // Ignore parse errors on HTTP error responses
          }
        } else {
          try {
            const errText = await response.text();
            if (errText && errText.trim().length > 0) {
              const cleanText = errText.replace(/<[^>]*>/g, '').trim().substring(0, 100);
              errMessage = `Server error (${response.status}): ${cleanText}`;
            }
          } catch {
            // Ignore text read errors
          }
        }
        throw new ApiError(errMessage, response.status);
      }

      if (!isJson) {
        throw new ApiError('Server returned an invalid content format (expected JSON).', response.status);
      }

      let json: ApiResponse<T>;
      try {
        const text = await response.text();
        if (!text || text.trim() === '') {
          return {} as T;
        }
        json = JSON.parse(text);
      } catch (jsonErr: any) {
        if (response.ok) {
          return {} as T;
        }
        throw new ApiError(`Failed to parse response: ${jsonErr.message || jsonErr}`, response.status);
      }

      if (!json || !json.success) {
        throw new ApiError(json?.message || 'API request failed', response.status);
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
