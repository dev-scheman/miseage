"use client";

import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b p-4">
        <button
          onClick={() => router.push("/")}
          className="font-bold text-lg hover:opacity-70"
        >
          MiseAge
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold">お問い合わせ</h1>
          {/* 後で実装 */}
        </div>
      </div>
    </div>
  );
}
