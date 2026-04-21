import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const getAuthenticatedUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
};

export const requireAuthenticatedUser = async (): Promise<User> => {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Kamu harus login dulu");
  }

  return user;
};