"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function BillingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);

      if (data?.trial_ends_at) {
        const now = new Date();
        const end = new Date(data.trial_ends_at);
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        setRemainingDays(days);
      }
    };

    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 border p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold text-center">
          プラン管理
        </h1>

        {/* トライアル状態 */}
        {profile?.trial_ends_at && !profile?.subscribed && (
          <div className="bg-yellow-100 p-4 rounded-lg text-sm">
            <p className="font-semibold">
              無料トライアル中
            </p>
            <p>
              残り{" "}
              <span className="font-bold">
                {remainingDays}
              </span>{" "}
              日
            </p>
          </div>
        )}

        {/* 期限切れ */}
        {profile?.trial_ends_at &&
          !profile?.subscribed &&
          remainingDays !== null &&
          remainingDays <= 0 && (
            <div className="bg-red-100 p-4 rounded-lg text-sm">
              無料期間が終了しました
            </div>
          )}

        {/* プラン */}
        <div className="border rounded-lg p-4 space-y-2">
          <p className="font-semibold">Proプラン</p>
          <p className="text-sm text-gray-600">
            ・店舗登録 / 編集 無制限  
            ・今後の機能すべて利用可能
          </p>

          <p className="text-xl font-bold">¥1,000 / 月</p>
        </div>

        {/* CTA */}
        <button
          className="w-full bg-black text-white p-3 rounded-lg"
          onClick={() => {
            alert("ここにStripe連携（後で）");
          }}
        >
          プランを開始する
        </button>

        {/* 戻る */}
        <button
          onClick={() => router.push("/mypage")}
          className="w-full text-sm text-gray-500"
        >
          ← マイページに戻る
        </button>
      </div>
    </div>
  );
}