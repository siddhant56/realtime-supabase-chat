import { cache } from "react";
import { getCurrentExpressUser } from "@/lib/auth";

export const getCurrentUser = cache(async () => {
  return getCurrentExpressUser();
});
