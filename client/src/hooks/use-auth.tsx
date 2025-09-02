import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { login as authLogin, logout as authLogout, getCurrentUser } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { user, token, setUser, setToken, clearAuth } = useAuthStore();

  // Check for existing session on mount
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getCurrentUser,
    enabled: !!token && !user,
    retry: false,
    staleTime: Infinity,
  });

  // Update user in store when query resolves
  useEffect(() => {
    if (currentUser && !user) {
      setUser(currentUser.user);
    }
  }, [currentUser, user, setUser]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authLogin,
    onSuccess: (data) => {
      setToken(data.accessToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authLogout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user,
    token,
    isLoading: isLoading || loginMutation.isPending,
    login,
    logout,
    isAuthenticated: !!user && !!token,
  };
}
