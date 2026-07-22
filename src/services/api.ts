// Backend Auth & API Service Layer
import type { User } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

// Storage key for JWT token
const TOKEN_KEY = 'pdpa_jwt_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Login API
export const apiLogin = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAuthToken(data.token);
    }
    return data;
  } catch (err) {
    console.warn('Backend server unreachable, falling back to local authentication mode');
    return { success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้' };
  }
};

// Verify User Me API
export const apiFetchCurrentUser = async (): Promise<User | null> => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.success ? data.user : null;
  } catch (err) {
    return null;
  }
};
