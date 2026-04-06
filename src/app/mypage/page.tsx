"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import FooterMenu from "@/components/FooterMenu";


export default function MyPage() {

  useRequireActivePlan();

  const [shops, setShops] = useState<any[]>([]);
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setUser(authUser);

      if (!authUser) {
        router.push("/login");
        return;
      }
      setLoading(false);

      const { data } = await supabase
        .from("shops")
        .select("*")
        .eq("user_id", authUser.id);

      setShops(data || []);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setProfile(profileData);

    };

    fetchShops();


  }, []);

  if (loading) return null;

  const days = getRemainingDays();

  const color = (days ?? 100) <= 3 ? "bg-red-100" : "bg-yellow-100";

  const handleSwitchAccount = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/mypage`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white text-black pb-32">
      {/* Account Menu Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-center">MiseAge</h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-500">現在ログイン中のGoogleアカウント</p>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                {user?.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-sm">{user?.user_metadata?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={handleSwitchAccount}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold text-sm"
              >
                別のGoogleアカウントでログイン
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-width Header */}
      <div className="fixed top-0 left-0 right-0 h-11 bg-white border-b flex items-center justify-between px-4 z-30">
        <button className="text-gray-600 hover:text-gray-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center gap-1 hover:opacity-70"
        >
          <span className="text-base font-semibold">{user?.email}</span>
          <span className="text-xs">▼</span>
        </button>

        <div className="w-6" />
      </div>

      <div className="pt-11" />

      <div className="max-w-xl mx-auto space-y-6 p-6">

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

      {/* Footers */}
      <Footer />
      <FooterMenu />
    </div>
  );
}