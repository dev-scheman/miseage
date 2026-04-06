"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function useRequireActivePlan() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const now = new Date();

      if (
        profile &&
        !profile.subscribed &&
        profile.trial_ends_at &&
        new Date(profile.trial_ends_at) < now
      ) {
        router.push("/billing");
      }
    };

    check();
  }, []);
}