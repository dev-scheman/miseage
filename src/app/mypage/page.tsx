"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";


export default function MyPage() {

  useRequireActivePlan();

  const [shops, setShops] = useState<any[]>([]);
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getRemainingDays = () => {
    if (!profile?.trial_ends_at) return null;

    const now = new Date();
    const end = new Date(profile.trial_ends_at);

    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days;
  };

  useEffect(() => {
    const fetchShops = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setLoading(false);

      const { data } = await supabase
        .from("shops")
        .select("*")
        .eq("user_id", user.id);

      setShops(data || []);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

    };

    fetchShops();


  }, []);

  if (loading) return null;

  const days = getRemainingDays();

  const color = (days ?? 100) <= 3 ? "bg-red-100" : "bg-yellow-100";
  return (
    <div className="min-h-screen bg-white text-black p-6 pb-32">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">マイページ</h1>
        {profile?.trial_ends_at && !profile?.subscribed && (
          <div className="p-3 bg-yellow-100 rounded-lg text-sm ${color}">
            無料期間終了まであと{" "}
            <span className="font-bold">
              {getRemainingDays()}
            </span>
            日
          </div>
        )}
        {/* 店舗一覧 */}
        <div className="space-y-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="border p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{shop.name}</p>
                <p className="text-sm text-gray-500">@{shop.slug}</p>
              </div>

              <button
                onClick={() => router.push(`/${shop.slug}`)}
                className="text-sm text-blue-600"
              >
                表示
              </button>
              <button
                onClick={() => router.push(`/mypage/${shop.id}`)}
                className="text-sm text-gray-500"
              >
                編集
              </button>
            </div>
          ))}
        </div>

        {/* 新規作成 */}
        <button
          onClick={() => router.push("/new")}
          className="w-full bg-black text-white p-3 rounded-lg"
        >
          新しい店舗を登録
        </button>
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