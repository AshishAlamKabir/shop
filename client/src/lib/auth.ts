import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'RETAILER' | 'SHOP_OWNER';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest('POST', '/api/auth/login', credentials);
  const data = await response.json();
  
  // Store tokens
  setStoredToken(data.accessToken);
  setStoredRefreshToken(data.refreshToken);
  
  return data;
}

export async function logout(): Promise<void> {
  try {
    // Try to call logout endpoint if token exists
    const token = getStoredToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    // Ignore logout errors, just clear local storage
    console.warn('Logout request failed, clearing local storage');
  } finally {
    clearStoredTokens();
  }
}

export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No token available');
  }

  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredTokens();
    }
    throw new Error('Failed to get current user');
  }

  return response.json();
}

export async function refreshToken(): Promise<string> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiRequest('POST', '/api/auth/refresh', {
    refreshToken,
  });

  const data = await response.json();
  setStoredToken(data.accessToken);
  
  return data.accessToken;
}
