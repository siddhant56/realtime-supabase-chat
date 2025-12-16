import { LoginForm } from "@/services/supabase/components/components/login-form";
import { getCurrentUser } from "@/services/supabase/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  // If already authenticated, send user to home instead of showing login again
  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen-with-header w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
