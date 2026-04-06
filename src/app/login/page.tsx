"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <button
          onClick={() => router.push("/")}
          className="font-bold text-lg hover:opacity-70"
        >
          MiseAge
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
        {/* カード */}
        <div className="w-full max-w-md bg-white border rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">ログイン</h1>
            <p className="text-sm text-gray-500">
              Googleビジネスプロフィール（GBP）に登録しているGoogleアカウントでログインしてください
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-black text-white px-6 py-3 rounded-lg font-semibold"
          >
            Googleでログイン
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full border px-6 py-3 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            トップページに戻る
          </button>

          <div className="pt-4 border-t text-center space-y-2 text-xs text-gray-600">
            <p>
              ログインすると
              <button
                onClick={() => router.push("/terms")}
                className="text-blue-600 hover:text-blue-700 mx-0.5"
              >
                利用規約
              </button>
              と
              <button
                onClick={() => router.push("/privacy")}
                className="text-blue-600 hover:text-blue-700 mx-0.5"
              >
                プライバシーポリシー
              </button>
              に同意されたものとみなします
            </p>
          </div>

          <div className="pt-4 border-t text-center space-y-2">
            <p className="text-xs text-gray-500">
              GBPへのご登録がまだのオーナー様は
            </p>
            <button
              onClick={() => router.push("/contact")}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              こちらからご連絡ください
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}