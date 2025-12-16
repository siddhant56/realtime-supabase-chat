"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/services/supabase/components/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/services/supabase/components/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store";
import { setUser } from "@/store/userSlice";

type Mode = "login" | "register";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint =
      mode === "login"
        ? "/auth/login"
        : "/auth/register";

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "http://localhost:4000"}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      if (!res.ok) {
        setError(
          mode === "login" ? "Invalid credentials" : "Unable to register user"
        );
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (data && data.id) {
        dispatch(setUser({ id: data.id, email: data.email }));
      }

      router.push("/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError(null);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === "login" ? "Welcome back!" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to your account to continue"
              : "Register to start using the chat"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive-500">{error}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? mode === "login"
                  ? "Logging in..."
                  : "Registering..."
                : mode === "login"
                  ? "Log in"
                  : "Register"}
            </Button>
            <button
              type="button"
              onClick={toggleMode}
              className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {mode === "login"
                ? "Don't have an account? Register"
                : "Already have an account? Log in"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

