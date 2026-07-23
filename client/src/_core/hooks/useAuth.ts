import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export function useAuth(requireAuth = true) {
  const [_, setLocation] = useLocation();
  const { data: user, isLoading, error } = trpc.auth.getMe.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (requireAuth && !isLoading && !user) {
      setLocation("/login");
    }
  }, [requireAuth, isLoading, user, setLocation]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      window.location.reload();
    },
    onError: (err) => {
      toast.error(`Logout failed: ${err.message}`);
    }
  });

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return {
    user: user || null,
    loading: isLoading,
    error: error || null,
    isAuthenticated: !!user,
    logout,
  };
}
