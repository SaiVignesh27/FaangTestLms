import { apiRequest } from "./queryClient";
import { AuthResponse, LoginCredentials } from "@shared/types";

// Function to handle user login
export async function loginUser(credentials: LoginCredentials, role: 'admin' | 'student'): Promise<AuthResponse> {
  const endpoint = role === 'admin' ? '/api/auth/admin/login' : '/api/auth/student/login';
  const response = await apiRequest('POST', endpoint, credentials);
  const data = await response.json();
  
  // Store token in localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  if (data.user && data.user.email) {
    localStorage.setItem('userEmail', data.user.email);
  }
  
  // Redirect to the appropriate dashboard based on role
  const redirectUrl = role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
  window.location.href = redirectUrl;
  
  return data;
}

// Function to check if user is authenticated
export function isAuthenticated(): boolean {
  return localStorage.getItem('token') !== null;
}

// Function to get current user data
export function getCurrentUser(): AuthResponse['user'] | null {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Function to get authentication token
export function getToken(): string | null {
  return localStorage.getItem('token');
}

// Function to logout user
export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userEmail');
  window.location.href = '/';
}

// Function to check if user has a specific role
export function hasRole(role: 'admin' | 'student'): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

// Add authorization header to fetch requests
export function addAuthHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getToken();
  if (token) {
    return {
      ...headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return headers;
}
