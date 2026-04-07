"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import { useRouter } from "next/navigation";
import HeaderSimple from "@/components/HeaderSimple";
import Footer from "@/components/Footer";
import FooterMenu from "@/components/FooterMenu";

interface SearchResult {
  rank: number;
  title: string;
  address: string;
  phone: string;
  placeId: string;
  rating: number | null;
  votes: number | null;
  latitude: number;
  longitude: number;
  mainImage: string | null;
  category: string | null;
  url: string | null;
  contactUrl: string | null;
  bookOnlineUrl: string | null;
  workHours: any;
  rawData: any;
}

interface AddressInfo {
  prefecture: string;
  city: string;
  address3?: string;
}

export default function NewShopPage() {
  useRequireActivePlan();

  const router = useRouter();

  // ステップ1: 基本情報
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [includeAddress3, setIncludeAddress3] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [postalCodeLoading, setPostalCodeLoading] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState("");

  // ステップ2: 検索結果
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isSecondarySearch, setIsSecondarySearch] = useState(false);

  // モーダル表示
  const [modal, setModal] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const isValidSlug = /^[a-z0-9.-]+$/.test(slug);
  const isValidPostalCode = /^\d{3}-\d{4}$|^\d{7}$/.test(postalCode);

  // 郵便番号から住所を自動取得
  const handlePostalCodeChange = async (value: string) => {
    setPostalCode(value);
    setPostalCodeError("");

    if (!/^\d{7}$|^\d{3}-\d{4}$/.test(value)) {
      setAddressInfo(null);
      setPostalCodeLoading(false);
      return;
    }

    setPostalCodeLoading(true);

    try {
      const response = await fetch("/api/resolve-postal-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postalCode: value }),
      });

      const data = await response.json();

      if (data.success) {
        setAddressInfo({
          prefecture: data.prefecture,
          city: data.city,
          address3: data.address3,
        });
        setPostalCodeError("");
      } else {
        setAddressInfo(null);
        setPostalCodeError(data.error || "郵便番号が見つかりません");
      }
    } catch (error) {
      console.error("郵便番号検索エラー:", error);
      setAddressInfo(null);
      setPostalCodeError("郵便番号の検索に失敗しました");
    } finally {
      setPostalCodeLoading(false);
    }
  };

  // ステップ1: 検索実行
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !slug || !postalCode || !keyword || !addressInfo) {
      setModal({ type: 'error', message: 'すべての項目を入力してください' });
      return;
    }

    if (!isValidSlug) {
      setModal({ type: 'error', message: 'URLは半角英数字、ハイフン、ドットのみ使用できます' });
      return;
    }

    setLoading(true);

    try {
      const city = includeAddress3 && addressInfo.address3
        ? `${addressInfo.city}${addressInfo.address3}`
        : addressInfo.city;
      const searchKeyword = `${addressInfo.prefecture}${city} ${keyword}`;

      const response = await fetch("/api/search-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          city,
          prefecture: addressInfo.prefecture,
          depth: 20,
        }),
      });

      const data = await response.json();

      if (data.success && data.results.length > 0) {
        setSearchResults(data.results);
        setIsSecondarySearch(false);
        setStep(2);
      } else {
        setModal({ type: 'error', message: '検索結果が見つかりませんでした' });
      }
    } catch (error) {
      console.error("検索エラー:", error);
      setModal({ type: 'error', message: '検索に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  // ステップ2: 「この中にありません」→ 再検索
  const handleSecondarySearch = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/search-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: name,
          city: addressInfo!.city,
          prefecture: addressInfo!.prefecture,
          depth: 5,
        }),
      });

      const data = await response.json();

      if (data.success && data.results.length > 0) {
        setSearchResults(data.results);
        setIsSecondarySearch(true);
      } else {
        setModal({ type: 'error', message: '検索結果が見つかりませんでした' });
      }
    } catch (error) {
      console.error("再検索エラー:", error);
      alert("再検索に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // ステップ2: 店舗登録
  const handleRegister = async () => {
    if (!selectedResult) {
      setModal({ type: 'error', message: '店舗を選択してください' });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setModal({ type: 'error', message: 'Googleでログインしてください' });
        router.push("/login");
        return;
      }

      // shops に INSERT
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .insert([
          {
            name,
            slug,
            postal_code: postalCode,
            prefecture: addressInfo!.prefecture,
            city: addressInfo!.city,
            place_id: selectedResult.placeId,
            place_id_status: "confirmed",
            place_confirmed_at: new Date().toISOString(),
            place_rating: selectedResult.rating,
            place_votes: selectedResult.votes,
            place_latitude: selectedResult.latitude,
            place_longitude: selectedResult.longitude,
            dataforce_response: selectedResult.rawData,
            other_urls: (() => {
              const urls: string[] = [];
              if (selectedResult.url) urls.push(selectedResult.url);
              if (selectedResult.rawData?.contributor_url) urls.push(selectedResult.rawData.contributor_url);
              return urls;
            })(),
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (shopError || !shop) {
        setModal({ type: 'error', message: '登録に失敗しました' });
        console.error(shopError);
        return;
      }

      // profile が無ければ作る（初回）
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          plan: "trial",
          trial_ends_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
          subscribed: false,
        });
      }

      // 最初のキーワードを shop_keywords に INSERT
      await supabase.from("shop_keywords").insert({
        shop_id: shop.id,
        keyword,
        position: 1,
        is_active: true,
        is_paid: false,
        next_check_at: new Date().toISOString(),
      });

      router.push(`/mypage/${shop.id}`);
    } catch (error) {
      console.error("登録エラー:", error);
      alert("登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <HeaderSimple />

      <div className="pt-11 flex-1 flex items-center justify-center p-4 pb-32">
        {step === 1 ? (
          // ステップ1: 基本情報入力
          <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow">
            <h1 className="text-2xl font-bold mb-2 text-center">
              お店の基本情報
            </h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Google マップから店舗を特定します
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              {/* 店舗名 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border p-3 rounded-lg"
                  placeholder="例: Show Tech Cafe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* slug */}
              <div className="space-y-1">
                <label className="block text-sm font-medium mb-1">
                  ご希望のユーザーID <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full border p-3 rounded-lg ${
                    slug && !isValidSlug ? "border-red-500" : ""
                  }`}
                  placeholder="例: showtech-cafe"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  required
                />
                <p className="text-xs text-gray-500">
                  MiseAgeのURLに使用されます（半角英数字、ハイフン、ドットのみ）
                </p>
                {slug && !isValidSlug && (
                  <p className="text-red-500 text-xs">
                    半角英数字、ハイフン、ドットのみ使用できます
                  </p>
                )}
              </div>

              {/* 郵便番号 */}
              <div className="space-y-1">
                <label className="block text-sm font-medium mb-1">
                  郵便番号 <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full border p-3 rounded-lg ${
                    postalCode && !isValidPostalCode ? "border-red-500" : ""
                  }`}
                  placeholder="例: 810-0004"
                  value={postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  形式: XXX-XXXX または XXXXXXX
                </p>
              </div>

              {/* 郵便番号エラー */}
              {postalCodeError && (
                <p className="text-red-500 text-sm">{postalCodeError}</p>
              )}

              {/* 表示順位を確認するエリア × キーワード */}
              <div className="pt-6 border-t">
                <h3 className="text-sm font-bold mb-4">
                  表示順位を確認するエリア × キーワード
                </h3>

                {/* 検索エリア */}
                <div className="space-y-1 mb-4">
                  <label className="block text-sm font-medium mb-2">
                    検索エリア
                  </label>
                  <div className={`w-full p-3 rounded-lg text-sm flex items-center justify-between ${
                    addressInfo
                      ? "bg-gray-50 text-black"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    <span>
                      {postalCodeLoading
                        ? "検索中..."
                        : addressInfo
                        ? addressInfo.city
                        : "先に郵便番号を入力してください"}
                    </span>
                    {addressInfo?.address3 && (
                      <label className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeAddress3}
                          onChange={(e) => setIncludeAddress3(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>{addressInfo.address3}まで含める</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* キーワード */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-2">
                    キーワード
                  </label>
                  <input
                    className="w-full border p-3 rounded-lg text-sm"
                    placeholder="例: イタリアン、ラーメン"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ボタン */}
              <button
                type="submit"
                disabled={
                  !name ||
                  !slug ||
                  !isValidSlug ||
                  !isValidPostalCode ||
                  !keyword ||
                  !addressInfo ||
                  loading
                }
                className="w-full bg-black text-white p-3 rounded-lg disabled:opacity-50 font-semibold"
              >
                {loading ? "検索中..." : "検索"}
              </button>
            </form>
          </div>
        ) : (
          // ステップ2: 検索結果表示
          <div className="w-full max-w-2xl">
            <div className="mb-6">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 戻る
              </button>
              <h2 className="text-2xl font-bold mt-2">
                検索結果から選択してください
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                「{name}」と一致する店舗を選んでください
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {searchResults.map((result) => (
                <button
                  key={result.placeId}
                  onClick={() => setSelectedResult(result)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition ${
                    selectedResult?.placeId === result.placeId
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      {result.mainImage && (
                        <img
                          src={result.mainImage}
                          alt={result.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                      {!isSecondarySearch && (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                          {result.rank}位
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg mb-1">{result.title}</p>
                      <p className="text-sm text-gray-600">{result.address}</p>
                      {result.phone && (
                        <p className="text-sm text-gray-600">{result.phone.replace('+81', '0')}</p>
                      )}
                      {result.rating && (
                        <p className="text-sm text-yellow-600 mt-1">
                          ★ {result.rating} ({result.votes} 件)
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!isSecondarySearch && (
              <div className="space-y-3">
                <button
                  onClick={handleSecondarySearch}
                  disabled={loading}
                  className="w-full bg-gray-200 text-gray-800 p-3 rounded-lg disabled:opacity-50 font-semibold hover:bg-gray-300"
                >
                  {loading ? "検索中..." : "この中にありません"}
                </button>
              </div>
            )}

            {isSecondarySearch && (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 mb-3">
                    この一覧にも表示されていない場合は、管理者にお問い合わせください。
                  </p>
                  <button
                    onClick={() => router.push("/contact")}
                    className="w-full bg-white border border-gray-300 text-gray-800 p-3 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    お問い合わせ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 固定登録ボタン（店舗選択時） */}
      {step === 2 && selectedResult && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="bg-black text-white px-4 py-2.5 rounded-lg disabled:opacity-50 font-semibold text-sm shadow-lg hover:bg-gray-900 transition"
          >
            {loading ? "登録中..." : "選択した店舗で登録"}
          </button>
        </div>
      )}

      {/* モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              {modal.type === 'error' && (
                <div className="text-red-500 text-2xl mt-0.5">⚠</div>
              )}
              {modal.type === 'success' && (
                <div className="text-green-500 text-2xl mt-0.5">✓</div>
              )}
              <p className={`text-sm font-medium flex-1 ${
                modal.type === 'error' ? 'text-red-700' : 'text-green-700'
              }`}>
                {modal.message}
              </p>
            </div>
            <button
              onClick={() => setModal(null)}
              className="w-full bg-black text-white p-2.5 rounded-lg font-semibold text-sm hover:bg-gray-800"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <Footer />
      <FooterMenu />
    </div>
  );
}
