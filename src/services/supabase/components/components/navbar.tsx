"use client";

import Link from "next/link";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";

export function Navbar() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="border-b bg-background h-header">
      <nav className="container mx-auto px-4 flex justify-between items-center h-full gap-4">
        <Link href="/" className="text-xl font-bold">
          SuperChat
        </Link>

        {isLoading || user == null ? (
          <Button asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        )}
      </nav>
    </div>
  );
}
