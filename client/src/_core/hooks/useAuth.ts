import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useAuth() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
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
