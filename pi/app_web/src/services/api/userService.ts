const API_BASE_URL = 'http://localhost/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: string;
}

class UserService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.request('/users');
  }

  async createUser(userData: CreateUserData): Promise<{ success: boolean; id: number; message: string }> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: Partial<User>): Promise<{ success: boolean; message: string }> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async authenticate(email: string, password: string): Promise<{ success: boolean; user: User }> {
    return this.request('/auth', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }
}

export const userService = new UserService();