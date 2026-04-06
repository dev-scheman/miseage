"use client";

import { useRouter } from "next/navigation";

export default function FooterMenu() {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 w-full h-16 bg-white border-t flex justify-around items-center">
      <button onClick={() => router.push("/")} className="hover:opacity-70">
        🏠
      </button>
      <button onClick={() => router.push("/mypage")} className="hover:opacity-70">
        👤
      </button>
    </div>
  );
}
