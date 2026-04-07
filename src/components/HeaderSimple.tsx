"use client";

import { useRouter } from "next/navigation";

export default function HeaderSimple() {
  const router = useRouter();

  return (
    <header className="h-11 flex items-center px-4">
      <button
        onClick={() => router.push("/")}
        className="font-bold text-[20px] hover:opacity-70"
      >
        MiseAge
      </button>
    </header>
  );
}
