import { cache } from "react";
import { createClient } from "../server";

export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  return (await (await supabase).auth.getUser()).data.user;
});
