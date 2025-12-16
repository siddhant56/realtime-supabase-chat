import { useAppSelector } from "@/store";

export function useCurrentUser() {
  const user = useAppSelector((state) => state.user);

  return { user, isLoading: false };
}
