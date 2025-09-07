import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { refreshToken, clearStoredTokens } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryOnAuth: boolean = true,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Add Authorization header if token exists
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add Content-Type header for requests with data
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle token expiration
  if (res.status === 403 && retryOnAuth && url !== '/api/auth/refresh') {
    try {
      // Try to refresh the token
      await refreshToken();
      
      // Retry the original request with the new token
      const newToken = localStorage.getItem('accessToken');
      const newHeaders = { ...headers };
      if (newToken) {
        newHeaders['Authorization'] = `Bearer ${newToken}`;
      }
      
      const retryRes = await fetch(url, {
        method,
        headers: newHeaders,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      
      await throwIfResNotOk(retryRes);
      return retryRes;
    } catch (refreshError) {
      // Refresh failed, clear tokens and redirect to login
      clearStoredTokens();
      window.location.href = '/';
      throw refreshError;
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add Authorization header if token exists
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Handle token expiration for queries
    if (res.status === 403) {
      try {
        // Try to refresh the token
        await refreshToken();
        
        // Retry the query with the new token
        const newToken = localStorage.getItem('accessToken');
        const newHeaders = { ...headers };
        if (newToken) {
          newHeaders['Authorization'] = `Bearer ${newToken}`;
        }
        
        const retryRes = await fetch(queryKey.join("/") as string, {
          headers: newHeaders,
          credentials: "include",
        });
        
        await throwIfResNotOk(retryRes);
        return await retryRes.json();
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearStoredTokens();
        window.location.href = '/';
        throw refreshError;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
