"use client";

import { Button } from "@/services/supabase/components/components/ui/button";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store";
import { clearUser } from "@/store/userSlice";

export function LogoutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const logout = async () => {
    await fetch(
      `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "http://localhost:4000"}/auth/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    dispatch(clearUser());
    router.push("/auth/login");
  };

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      Logout
    </Button>
  );
}
