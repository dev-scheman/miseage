"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import Footer from "@/components/Footer";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function MyPageDashboard() {
  useRequireActivePlan();
  const router = useRouter();

  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [rankHistory, setRankHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");

  // キーワード設定モーダル
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<any>(null);
  const [kwAddress2, setKwAddress2] = useState("");
  const [kwAddress3, setKwAddress3] = useState("");
  const [kwIncludeAddress3, setKwIncludeAddress3] = useState(false);
  const [kwKeyword, setKwKeyword] = useState("");
  const [kwSearching, setKwSearching] = useState(false);
  const [kwResults, setKwResults] = useState<any[]>([]);
  const [kwSearched, setKwSearched] = useState(false);
  const [kwCurrentRank, setKwCurrentRank] = useState<number | null | string>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ログアウト → Google SSO アカウント選択画面へ
  const handleLogoutAndLogin = async () => {
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/mypage`,
      },
    });
  };

  // キーワードモーダルを開く
  const openKeywordModal = async (kw?: any) => {
    setEditingKeyword(kw || null);
    setKwKeyword(kw?.keyword || "");
    setKwResults([]);
    setKwSearched(false);
    setKwCurrentRank(null);

    if (!selectedShop) return;

    // postal_code から address3 を取得
    const res = await fetch("/api/resolve-postal-code", {
      method: "POST",
      body: JSON.stringify({ postalCode: selectedShop.postal_code }),
    });
    const data = await res.json();
    setKwAddress2(data.city || selectedShop.city || "");
    setKwAddress3(data.address3 || "");

    // 既存キーワードの city から address3 を含むか判定
    if (kw?.city && data.address3) {
      setKwIncludeAddress3(kw.city.includes(data.address3));
    } else {
      setKwIncludeAddress3(false);
    }

    setShowKeywordModal(true);
  };


  // キーワード決定（新規追加または編集確認）
  const handleKwDecide = async () => {
    if (!kwKeyword.trim()) {
      alert("キーワードを入力してください");
      return;
    }

    if (editingKeyword) {
      // 編集モード：確認ダイアログを表示
      setShowEditConfirm(true);
    } else {
      // 新規追加：直接DB保存
      setKwSearching(true);
      await saveKeyword();
    }
  };

  // 確認後のキーワード保存
  const saveKeyword = async () => {
    if (!selectedShop) return;

    const city = kwIncludeAddress3 && kwAddress3
      ? `${kwAddress2}${kwAddress3}`
      : kwAddress2;

    try {
      let newKeywordId: string | null = null;

      if (editingKeyword) {
        // 旧キーワード論理削除
        await supabase
          .from("shop_keywords")
          .update({ is_active: false })
          .eq("id", editingKeyword.id);

        await supabase
          .from("rank_checks")
          .update({ is_active: false })
          .eq("keyword_id", editingKeyword.id);
      }

      // 新キーワード挿入
      const position = editingKeyword
        ? editingKeyword.position
        : keywords.length + 1;

      const { data: insertData } = await supabase
        .from("shop_keywords")
        .insert({
          shop_id: selectedShop.id,
          keyword: kwKeyword,
          position,
          prefecture: selectedShop.prefecture,
          city,
          is_active: true,
          is_paid: false,
          next_check_at: new Date().toISOString(),
        })
        .select();

      if (insertData && insertData.length > 0) {
        newKeywordId = insertData[0].id;
      }

      // 初回の順位チェック実行
      if (newKeywordId) {
        try {
          const res = await fetch("/api/search-places", {
            method: "POST",
            body: JSON.stringify({
              keyword: kwKeyword,
              city,
              prefecture: selectedShop.prefecture,
              depth: 20,
            }),
          });
          const data = await res.json();
          const results = data.results || [];

          // place_id で順位を特定
          const matched = results.find((r: any) => r.placeId === selectedShop.place_id);
          const rank = matched ? matched.rank : null;

          // rank_checks テーブルに記録
          await supabase.from("rank_checks").insert({
            keyword_id: newKeywordId,
            shop_id: selectedShop.id,
            keyword_text: kwKeyword,
            search_area: city,
            rank,
            is_active: true,
            check_status: rank ? "ok" : "not_found",
          });

          // shop_keywords の latest_rank を更新
          if (rank) {
            await supabase
              .from("shop_keywords")
              .update({ latest_rank: rank })
              .eq("id", newKeywordId);
          }
        } catch (searchError) {
          console.error("Error in initial rank check:", searchError);
        }
      }

      // モーダル閉じて、キーワード再取得
      setShowKeywordModal(false);
      setShowEditConfirm(false);

      // 店舗選択を再トリガーしてキーワード再取得
      const { data: keywordsData } = await supabase
        .from("shop_keywords")
        .select("*")
        .eq("shop_id", selectedShop.id)
        .eq("is_active", true)
        .order("position");

      const keywordsWithTrend = await Promise.all(
        (keywordsData || []).map(async (kw) => {
          const { data: latestRanks } = await supabase
            .from("rank_checks")
            .select("rank, checked_at")
            .eq("keyword_id", kw.id)
            .eq("is_active", true)
            .order("checked_at", { ascending: false })
            .limit(2);

          let trend = "→";
          let change = 0;
          if (latestRanks && latestRanks.length === 2) {
            const current = latestRanks[0].rank;
            const previous = latestRanks[1].rank;
            if (current && previous) {
              change = previous - current;
              if (change > 0) trend = "↑";
              else if (change < 0) trend = "↓";
            }
          }
          return { ...kw, trend, change };
        })
      );
      setKeywords(keywordsWithTrend);
    } catch (error) {
      console.error("Error saving keyword:", error);
      alert("キーワード保存に失敗しました");
    } finally {
      setKwSearching(false);
    }
  };

  // キーワード削除
  const handleKwDelete = async () => {
    if (!editingKeyword) return;

    try {
      setKwSearching(true);
      await supabase
        .from("shop_keywords")
        .update({ is_active: false })
        .eq("id", editingKeyword.id);

      await supabase
        .from("rank_checks")
        .update({ is_active: false })
        .eq("keyword_id", editingKeyword.id);

      setShowKeywordModal(false);
      setShowDeleteConfirm(false);

      // キーワード再取得
      const { data: keywordsData } = await supabase
        .from("shop_keywords")
        .select("*")
        .eq("shop_id", selectedShop?.id)
        .eq("is_active", true)
        .order("position");

      const keywordsWithTrend = await Promise.all(
        (keywordsData || []).map(async (kw) => {
          const { data: latestRanks } = await supabase
            .from("rank_checks")
            .select("rank, checked_at")
            .eq("keyword_id", kw.id)
            .eq("is_active", true)
            .order("checked_at", { ascending: false })
            .limit(2);

          let trend = "→";
          let change = 0;
          if (latestRanks && latestRanks.length === 2) {
            const current = latestRanks[0].rank;
            const previous = latestRanks[1].rank;
            if (current && previous) {
              change = previous - current;
              if (change > 0) trend = "↑";
              else if (change < 0) trend = "↓";
            }
          }
          return { ...kw, trend, change };
        })
      );
      setKeywords(keywordsWithTrend);
    } catch (error) {
      console.error("Error deleting keyword:", error);
      alert("キーワード削除に失敗しました");
    } finally {
      setKwSearching(false);
    }
  };

  // 店舗の画像 URL を取得（image_url または API 画像）
  const getShopImage = (shop: any) => {
    if (!shop) return null;
    if (shop.image_url) return shop.image_url;

    let dataforceData = shop.dataforce_response;
    if (typeof dataforceData === 'string') {
      try {
        dataforceData = JSON.parse(dataforceData);
      } catch (e) {
        return null;
      }
    }
    return dataforceData?.main_image || null;
  };

  // 初期化：店舗一覧取得
  useEffect(() => {
    // URL フラグメントをクリア
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");
      const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email || "";
      const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
      console.log("User name:", name);
      console.log("User avatar:", avatar);
      setUserName(name);
      setUserAvatar(avatar);

      // 店舗一覧取得
      const { data: shopsData } = await supabase
        .from("shops")
        .select("id, name, image_url, slug, place_id, dataforce_response, postal_code, city, prefecture")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setShops(shopsData || []);
      if (shopsData && shopsData.length > 0) {
        setSelectedShopId(shopsData[0].id);
      }

      // プロフィール取得（試用期間）
      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_ends_at")
        .eq("id", user.id)
        .single();

      if (profile?.trial_ends_at) {
        const daysLeft = Math.ceil(
          (new Date(profile.trial_ends_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );
        setTrialDaysLeft(Math.max(0, daysLeft));
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // 店舗選택時：キーワード＆順位履歴取得
  useEffect(() => {
    if (!selectedShopId) return;

    const fetchKeywordsAndRanks = async () => {
      // キーワード取得
      const { data: keywordsData } = await supabase
        .from("shop_keywords")
        .select("*")
        .eq("shop_id", selectedShopId)
        .eq("is_active", true)
        .order("position");

      // キーワードに変動情報を付与
      const keywordsWithTrend = await Promise.all(
        (keywordsData || []).map(async (kw) => {
          // 最新2つの順位チェックを取得
          const { data: latestRanks } = await supabase
            .from("rank_checks")
            .select("rank, checked_at")
            .eq("keyword_id", kw.id)
            .eq("is_active", true)
            .order("checked_at", { ascending: false })
            .limit(2);

          let trend = "→"; // 変動なし
          let change = 0;

          if (latestRanks && latestRanks.length === 2) {
            const current = latestRanks[0].rank;
            const previous = latestRanks[1].rank;

            if (current && previous) {
              change = previous - current; // 正の値 = 上昇
              if (change > 0) trend = "↑";
              else if (change < 0) trend = "↓";
            }
          }

          return { ...kw, trend, change };
        })
      );

      setKeywords(keywordsWithTrend);

      // 順位履歴取得（最新30日分）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: ranksData } = await supabase
        .from("rank_checks")
        .select("*")
        .eq("shop_id", selectedShopId)
        .eq("is_active", true)
        .gte("checked_at", thirtyDaysAgo.toISOString())
        .order("checked_at", { ascending: true });

      // グラフ用にデータを整形（複数キーワード対応）
      const chartMap = new Map<string, any>();
      ranksData?.forEach((r) => {
        const d = new Date(r.checked_at);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const date = `${month}/${day}`;
        if (!chartMap.has(date)) {
          chartMap.set(date, { date });
        }
        const entry = chartMap.get(date);
        entry[r.keyword_text] = r.rank || null;
      });

      const chartData = Array.from(chartMap.values());
      setRankHistory(chartData);

      // 選択店舗の詳細取得
      const shop = shops.find((s) => s.id === selectedShopId);
      setSelectedShop(shop);
    };

    fetchKeywordsAndRanks();
  }, [selectedShopId, shops]);

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b h-11 px-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-900"
        >
          <svg width="24" height="24" viewBox="0 0 0.45 0.45" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M.212.019a.025.025 0 0 0-.025.02L.18.071Q.163.076.147.085L.12.068a.025.025 0 0 0-.032.004L.07.089a.025.025 0 0 0-.004.032l.017.028Q.075.164.07.18L.039.188a.025.025 0 0 0-.02.025v.025a.025.025 0 0 0 .02.025L.07.27q.005.017.013.033L.067.33a.025.025 0 0 0 .004.032L.089.38A.025.025 0 0 0 .12.383L.147.366Q.163.374.18.38l.007.032a.025.025 0 0 0 .025.02h.025a.025.025 0 0 0 .025-.02L.27.38.302.366.33.383A.025.025 0 0 0 .361.38L.379.361A.025.025 0 0 0 .383.33L.365.302Q.374.287.379.27L.41.263A.025.025 0 0 0 .43.238V.212A.025.025 0 0 0 .41.187L.379.18Q.374.164.365.148L.383.12A.025.025 0 0 0 .379.089L.361.071A.025.025 0 0 0 .33.068L.302.085.27.071.263.04A.025.025 0 0 0 .238.02zM.147.114A.2.2 0 0 1 .202.092l.01-.047h.025l.011.047q.03.005.054.022L.343.089l.018.018-.025.041a.2.2 0 0 1 .022.054l.047.01v.025L.358.248a.2.2 0 0 1-.022.054l.025.041-.018.018L.302.336a.2.2 0 0 1-.054.022l-.01.047H.212L.202.358A.2.2 0 0 1 .148.336L.107.361.089.343.115.302A.2.2 0 0 1 .092.248L.045.238V.212l.047-.01A.2.2 0 0 1 .115.148L.088.107.106.089zm.124.111a.045.045 0 1 1-.091 0 .045.045 0 0 1 .091 0m.027 0a.072.072 0 1 1-.145 0 .072.072 0 0 1 .145 0" fill="currentColor"/>
          </svg>
        </button>
        <button
          onClick={() => setShowAccountModal(true)}
          className="flex items-center gap-1 text-sm font-semibold flex-1 justify-center hover:text-gray-600"
        >
          {userEmail}
          <span>▼</span>
        </button>
        <div className="w-6"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* 試用期間バナー */}
        {trialDaysLeft !== null && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4 mb-6 text-sm">
            無料期間終了までであと <span className="font-bold">{trialDaysLeft}</span> 日
          </div>
        )}

        {/* 店舗セレクタ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="-0.06 -0.06 0.72 0.72" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin" fill="currentColor">
              <path d="M.18.06H.09a.03.03 0 0 0-.03.03v.06a.03.03 0 0 0 .03.03h.06A.03.03 0 0 0 .18.15zM.09.24v.299h.06V.39A.06.06 0 0 1 .21.33h.06a.06.06 0 0 1 .06.06v.149h.18V.24H.45A.1.1 0 0 1 .39.217.1.1 0 0 1 .33.24H.27A.1.1 0 0 1 .21.217.1.1 0 0 1 .15.24zM.03.217A.1.1 0 0 1 0 .15V.09A.09.09 0 0 1 .09 0h.42A.09.09 0 0 1 .6.09v.06a.1.1 0 0 1-.03.067v.322a.06.06 0 0 1-.06.06H.281L.27.6H.21L.199.599H.09a.06.06 0 0 1-.06-.06zm.24.322V.39H.21v.149zM.36.06H.24v.09a.03.03 0 0 0 .03.03h.06A.03.03 0 0 0 .36.15zm.06 0v.09a.03.03 0 0 0 .03.03h.06A.03.03 0 0 0 .54.15V.09A.03.03 0 0 0 .51.06zm0 .27h.03a.03.03 0 0 1 .03.03v.09a.03.03 0 0 1-.03.03H.42A.03.03 0 0 1 .39.45V.36A.03.03 0 0 1 .42.33"/>
            </svg>
            <p className="text-xs font-bold uppercase tracking-widest text-black">
              登録済みの店舗（{shops.length}件）
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full border border-gray-300 rounded-xl p-4 flex items-center gap-3 bg-white hover:bg-gray-50 text-left"
            >
              {(() => {
                const imgUrl = getShopImage(selectedShop);
                return imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={selectedShop.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">
                    🏪
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{selectedShop?.name}</p>
                <p className="text-xs text-gray-500">@{selectedShop?.slug}</p>
              </div>
              <span className="text-gray-400">▼</span>
            </button>

            {/* ドロップダウンメニュー */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                {shops.map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
                  >
                    {(() => {
                      const imgUrl = getShopImage(shop);
                      return imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={shop.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                          🏪
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{shop.name}</p>
                      <p className="text-xs text-gray-500">@{shop.slug}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedShop && (
          <>
            {/* グラフ */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="-0.06 -0.12 0.72 0.72" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin" fill="currentColor">
                  <path d="M.083.153.109.33h.382L.517.151.412.242.299.097.182.241zM.384.107.382.109h.004l.035.045.043-.037h.004L.466.115.538.052a.03.03 0 0 1 .049.027L.543.39H.058L.012.081A.03.03 0 0 1 .061.054L.13.115.128.117h.003l.043.038L.21.11h.003L.211.108.277.029A.03.03 0 0 1 .324.03zM.06.42h.48v.03a.03.03 0 0 1-.03.03H.09A.03.03 0 0 1 .06.45z"/>
                </svg>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-900">
                  順位推移（30日）
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 h-64">
                {rankHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rankHistory} margin={{ left: -40, top: 10, right: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis reversed domain={[20, 1]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => value ? `${value}位` : "圏外"} />
                      <Legend />
                      {keywords.map((kw, idx) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                        return (
                          <Line
                            key={kw.id}
                            type="linear"
                            dataKey={kw.keyword}
                            stroke={colors[idx % colors.length]}
                            dot={{ fill: "white", stroke: colors[idx % colors.length], strokeWidth: 2, r: 4 }}
                            strokeWidth={3}
                            isAnimationActive={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    順位データがまだありません
                  </div>
                )}
              </div>
            </div>

            {/* キーワード一覧 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 0.72 0.72" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path d="M.667.72.445.498a.3.3 0 0 1-.17.057H.272A.27.27 0 0 1 0 .282V.279a.279.279 0 0 1 .558 0 .3.3 0 0 1-.057.17L.502.448.724.67zM.279.075a.203.203 0 1 0 .001 0z"/>
                  </svg>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-900">
                    キーワード ({keywords.length}/3) 無料枠
                  </p>
                </div>
                {keywords.length > 3 && (
                  <p className="text-xs text-gray-500">
                    4つ目以降 <span className="text-red-600 font-semibold">+¥100/月/キーワード</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                {keywords.length > 0 ? (
                  keywords.map((kw) => {
                    const trendColor = kw.trend === "↑" ? "text-green-600" : kw.trend === "↓" ? "text-red-600" : "text-gray-400";
                    return (
                      <div key={kw.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{kw.keyword}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              検索エリア: <span className="font-semibold">{kw.city}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <p className="font-semibold text-sm">
                                {kw.latest_rank ? `${kw.latest_rank}位` : "計測中"}
                              </p>
                              {kw.latest_rank && (
                                <p className={`text-sm font-bold ${trendColor}`}>
                                  {kw.trend}{Math.abs(kw.change) > 0 ? ` (${kw.change > 0 ? '+' : ''}${kw.change})` : ''}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => openKeywordModal(kw)}
                              className="text-blue-600 text-xs font-semibold mt-1 flex items-center gap-1 ml-auto"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              編集
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">
                    登録されたキーワードはまだありません
                  </p>
                )}
              </div>
              <button
                onClick={() => openKeywordModal()}
                className="w-full mt-3 border border-gray-300 text-gray-700 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50"
              >
                + キーワードを追加
              </button>
            </div>
          </>
        )}
      </div>

      {/* キーワード設定モーダル */}
      {showKeywordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            {/* ヘッダー */}
            <div className="sticky top-0 bg-white h-11 px-6 flex items-center justify-between border-b border-gray-200">
              <h3 className="font-bold text-base flex-1">
                {editingKeyword ? "キーワードを編集" : "キーワードを追加"}
              </h3>
              <button
                onClick={() => setShowKeywordModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            {/* コンテンツ */}
            <div className="px-6 py-6">
              {/* 検索エリア設定 */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-900 mb-2">
                  検索エリア
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={!kwIncludeAddress3}
                        onChange={() => setKwIncludeAddress3(false)}
                        className="rounded"
                      />
                      都市 ({kwAddress2})
                    </label>
                  </div>
                  {kwAddress3 && (
                    <div>
                      <label className="text-xs text-gray-600 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={kwIncludeAddress3}
                          onChange={() => setKwIncludeAddress3(true)}
                          className="rounded"
                        />
                        詳細エリア ({kwAddress2}{kwAddress3})
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* キーワード入力 */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-900 mb-2">
                  キーワード
                </label>
                <input
                  type="text"
                  value={kwKeyword}
                  onChange={(e) => setKwKeyword(e.target.value)}
                  placeholder="美容院、イタリアン、カフェ等"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 追加/更新ボタン */}
              <button
                onClick={handleKwDecide}
                disabled={kwSearching || !kwKeyword.trim()}
                className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed mb-3"
              >
                {kwSearching ? (editingKeyword ? "変更中..." : "追加中...") : (editingKeyword ? "このキーワードに変更する" : "このキーワードを追加する")}
              </button>

              {/* 削除ボタン（編集モードのみ） */}
              {editingKeyword && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700"
                >
                  キーワードを削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 編集確認ダイアログ */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">キーワードを変更しますか？</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              キーワードを変更すると、過去の順位履歴は参照できなくなります。同じキーワードに戻した場合も、新たな順位データの蓄積になります。変更しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  setKwSearching(true);
                  await saveKeyword();
                }}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">キーワードを削除しますか？</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              キーワードを削除すると、過去の順位履歴は参照できなくなります。同じキーワードを再登録した場合も、新たな順位データの蓄積になります。削除しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleKwDelete}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アカウント切り替えモーダル */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full relative">
            {/* 右上の閉じるボタン */}
            <button
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>

            <h3 className="font-bold text-lg mb-6">MiseAge</h3>

            <p className="text-xs text-gray-500 mb-3">現在ログイン中のGoogleアカウント</p>

            {/* 現在ログインしているアカウント */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* ボタン */}
            <button
              onClick={handleLogoutAndLogin}
              className="w-full bg-black text-white font-semibold py-2 rounded-lg hover:bg-gray-800"
            >
              別のGoogleアカウントでログイン
            </button>
          </div>
        </div>
      )}

      {/* 新規店舗登録ボタン（右下固定） */}
      <button
        onClick={() => router.push("/new")}
        className="fixed bottom-8 right-4 bg-yellow-400 text-black rounded-lg px-4 py-3 flex items-center gap-2 font-semibold hover:bg-yellow-500 shadow-lg"
        title="新しい店舗を登録"
      >
        <svg width="24" height="24" viewBox="-0.16 -0.16 1.92 1.92" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin" fill="currentColor">
          <path d="M.48.16H.24a.08.08 0 0 0-.08.08V.4a.08.08 0 0 0 .08.08H.4A.08.08 0 0 0 .48.4zM.24.64v.797H.4V1.04A.16.16 0 0 1 .56.88h.16a.16.16 0 0 1 .16.16v.397h.48V.64H1.2a.27.27 0 0 1-.16-.061.27.27 0 0 1-.16.061H.72A.27.27 0 0 1 .56.579.27.27 0 0 1 .4.64zM.08.579A.27.27 0 0 1 0 .4V.24A.24.24 0 0 1 .24 0h1.12a.24.24 0 0 1 .24.24V.4a.27.27 0 0 1-.08.179v.859a.16.16 0 0 1-.16.16H.749L.72 1.6H.56l-.029-.003H.24a.16.16 0 0 1-.16-.16zm.64.859V1.04H.56v.397zM.96.16H.64V.4a.08.08 0 0 0 .08.08h.16A.08.08 0 0 0 .96.4zm.16 0V.4a.08.08 0 0 0 .08.08h.16A.08.08 0 0 0 1.44.4V.24a.08.08 0 0 0-.08-.08zm0 .72h.08a.08.08 0 0 1 .08.08v.24a.08.08 0 0 1-.08.08h-.08a.08.08 0 0 1-.08-.08V.96a.08.08 0 0 1 .08-.08"/>
        </svg>
        店舗を追加
      </button>

      {/* Footer */}
      <Footer />
    </div>
  );
}
