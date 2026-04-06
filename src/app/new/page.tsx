"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

export default function NewShopPage() {
  useRequireActivePlan();
  
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const isValidSlug = /^[a-z0-9-]+$/.test(slug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !slug) {
      alert("店舗名とURLは必須です");
      return;
    }

    if (!isValidSlug) {
      alert("slugは半角英数字とハイフンのみです");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Googleログインしてください");
      router.push("/login");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("shops")
      .insert([
        {
          name,
          slug,
          phone,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (!error && data) {

      // profile取得
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // なければ作る（＝初回）
      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          plan: "trial",
          trial_ends_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ),
          subscribed: false,
        });
      }

      router.push(`/mypage/${data.id}`);

    } else {
      alert("登録に失敗しました");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-4 pb-32">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">
          店舗登録
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 店名 */}
          <div>
            <input
              className="w-full border p-3 rounded-lg"
              placeholder="店舗名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* slug */}
          <div className="space-y-1">
            <input
              className={`w-full border p-3 rounded-lg ${slug && !isValidSlug
                ? "border-red-500"
                : ""
                }`}
              placeholder="例: showch-cafe"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />

            <p className="text-sm text-gray-500">
              半角英数字とハイフンのみ（例: showch-cafe）
            </p>

            {slug && !isValidSlug && (
              <p className="text-red-500 text-sm">
                半角英数字とハイフンのみ使用できます
              </p>
            )}
          </div>

          {/* 電話（任意） */}
          <div>
            <input
              className="w-full border p-3 rounded-lg"
              placeholder="電話番号（任意）"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* ボタン */}
          <button
            type="submit"
            disabled={!name || !slug || !isValidSlug || loading}
            className="w-full bg-black text-white p-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
        </form>
      </div>

      {/* Legal Links Footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t px-4 py-4">
        <div className="max-w-xl mx-auto flex flex-wrap gap-4 justify-center text-xs text-gray-500">
          <a href="/privacy" className="hover:text-gray-700">プライバシーポリシー</a>
          <span>|</span>
          <a href="/terms" className="hover:text-gray-700">利用規約</a>
          <span>|</span>
          <a href="/legal" className="hover:text-gray-700">特定商取引法</a>
          <span>|</span>
          <a href="/contact" className="hover:text-gray-700">お問い合わせ</a>
        </div>
      </div>

      {/* Navigation Footer */}
      <Footer />
    </div>
  );
}