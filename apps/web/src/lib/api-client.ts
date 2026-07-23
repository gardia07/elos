import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true,
});

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ApiTenant {
  slug: string;
  name: string;
}
