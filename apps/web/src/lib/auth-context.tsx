'use client';

import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiTenant, ApiUser } from './api-client';

interface MeResponse {
  user: ApiUser;
  tenant: ApiTenant;
}

interface AuthState {
  user: ApiUser | null;
  tenant: ApiTenant | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, tenant: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<MeResponse>('/auth/me')).data,
    retry: false,
  });

  return (
    <AuthContext.Provider value={{ user: data?.user ?? null, tenant: data?.tenant ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
