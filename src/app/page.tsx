"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

export default function Home() {
  const [shops, setShops] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const [facilityMaster, setFacilityMaster] = useState<any[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  // 条件検索モーダル用
  const [isConditionOpen, setIsConditionOpen] = useState(false);
  // { [key]: true | "value" | ["v1","v2"] }
  const [facilityFilters, setFacilityFilters] = useState<Record<string, any>>({});
  // モーダル内の編集中の値（Applyで確定）
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>({});

  const [prefecture, setPrefecture] = useState<string | null>(null);
  const [isAreaOpen, setIsAreaOpen] = useState(false);

  const router = useRouter();

  // 条件検索のアクティブ数
  const activeConditionCount = Object.values(facilityFilters).filter((v) => {
    if (typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;

  // 初期ロード
  useEffect(() => {
    const init = async () => {
      const { data: master } = await supabase
        .from("facility_master")
        .select("*");

      setFacilityMaster(master || []);
    };

    init();
  }, []);

  // 検索（IME + デバウンス）
  useEffect(() => {
    if (isComposing) return;

    const timer = setTimeout(() => {
      fetchShops();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedFacilities, facilityFilters, prefecture, isComposing]);

  const fetchShops = async () => {
    let query = supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });

    // テキスト検索
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,slug.ilike.%${search}%`
      );
    }

    // 都道府県
    if (prefecture) {
      query = query.eq("prefecture", prefecture);
    }

    // トップのfacilityタグ（boolean）
    selectedFacilities.forEach((key) => {
      query = query.contains("facilities", {
        [key]: true,
      });
    });

    // 条件検索モーダルのフィルタ
    Object.entries(facilityFilters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (Array.isArray(value) && value.length === 0) return;
      if (typeof value === "boolean" && value) {
        query = query.contains("facilities", { [key]: true });
      } else if (typeof value === "string" && value) {
        query = query.contains("facilities", { [key]: value });
      } else if (Array.isArray(value) && value.length > 0) {
        // multi_enum: 選択した値をすべて含む店舗
        value.forEach((v: string) => {
          query = query.contains("facilities", { [key]: [v] });
        });
      }
    });

    const { data } = await query;
    setShops(data || []);
  };

  return (
    <div className="min-h-screen bg-white text-black pb-20">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white z-10 border-b p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="font-bold text-lg">MiseAge</div>

          <button
            onClick={() => setIsAreaOpen(true)}
            className="text-sm text-gray-500"
          >
            {prefecture || "全国版"} ▼
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="店名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setSearch(e.currentTarget.value);
            }}
          />

          <button
            onClick={() => {
              setDraftFilters({ ...facilityFilters });
              setIsConditionOpen(true);
            }}
            className={`relative border px-3 py-2 rounded-lg ${activeConditionCount > 0 ? "bg-black text-white" : ""}`}
          >
            ⚙︎
            {activeConditionCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeConditionCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* facilityタグ（エリア選択時のみ） */}
      {prefecture && (
        <div className="p-3 flex gap-2 overflow-x-auto">
          {facilityMaster
            .filter((f) => f.type === "boolean")
            .map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  if (selectedFacilities.includes(f.key)) {
                    setSelectedFacilities(
                      selectedFacilities.filter(
                        (k) => k !== f.key
                      )
                    );
                  } else {
                    setSelectedFacilities([
                      ...selectedFacilities,
                      f.key,
                    ]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm border whitespace-nowrap ${
                  selectedFacilities.includes(f.key)
                    ? "bg-black text-white"
                    : "bg-white"
                }`}
              >
                {f.label}
              </button>
            ))}
        </div>
      )}

      {/* 検索表示 */}
      {search && (
        <p className="px-4 text-sm text-gray-500">
          「{search}」の検索結果
        </p>
      )}

      {/* 一覧 */}
      <div className="max-w-xl mx-auto p-4 space-y-4">
        {shops.length === 0 && (
          <p className="text-gray-500">店舗がありません</p>
        )}

        {shops.map((shop) => (
          <div
            key={shop.id}
            onClick={() => router.push(`/${shop.slug}`)}
            className="border rounded-xl overflow-hidden cursor-pointer hover:shadow"
          >
            {shop.instagram_url ? (
              <iframe
                src={
                  shop.instagram_url.replace(/\/$/, "") +
                  "/embed"
                }
                className="w-full aspect-square pointer-events-none overflow-hidden min-h-[400px]"
                scrolling="no"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-200" />
            )}

            <div className="p-3">
              <p className="font-semibold">{shop.name}</p>
              <p className="text-sm text-gray-500">
                @{shop.slug}
              </p>
              {shop.prefecture && (
                <p className="text-xs text-gray-400">
                  {shop.prefecture}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/login")}
        className="fixed bottom-20 right-6 bg-yellow-400 text-black px-4 py-3 rounded-full shadow-lg font-semibold"
      >
        お店を登録
      </button>

      {/* Footer */}
      <Footer />

      {/* 条件検索モーダル */}
      {isConditionOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* ヘッダー */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold">条件で絞り込む</h2>
            <button onClick={() => setIsConditionOpen(false)}>✕</button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* グループ別に表示 */}
            {(() => {
              const groups: Record<string, any[]> = {};
              facilityMaster.forEach((f) => {
                const g = f.group_name || "その他";
                if (!groups[g]) groups[g] = [];
                groups[g].push(f);
              });
              return Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <h3 className="font-semibold text-sm text-gray-500 mb-3 uppercase tracking-wide">
                    {group}
                  </h3>
                  <div className="space-y-4">
                    {items.map((f) => (
                      <div key={f.key}>
                        <p className="font-medium mb-2">{f.label}</p>

                        {/* boolean */}
                        {f.type === "boolean" && (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!draftFilters[f.key]}
                              onChange={(e) =>
                                setDraftFilters({
                                  ...draftFilters,
                                  [f.key]: e.target.checked || undefined,
                                })
                              }
                            />
                            あり
                          </label>
                        )}

                        {/* enum */}
                        {f.type === "enum" && (
                          <div className="flex flex-wrap gap-2">
                            {f.options?.map((opt: any) => (
                              <button
                                key={opt.value}
                                onClick={() =>
                                  setDraftFilters({
                                    ...draftFilters,
                                    [f.key]:
                                      draftFilters[f.key] === opt.value
                                        ? undefined
                                        : opt.value,
                                  })
                                }
                                className={`px-3 py-1 rounded-full text-sm border ${
                                  draftFilters[f.key] === opt.value
                                    ? "bg-black text-white"
                                    : "bg-white"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* multi_enum */}
                        {f.type === "multi_enum" && (
                          <div className="flex flex-wrap gap-2">
                            {f.options?.map((opt: any) => {
                              const current: string[] = draftFilters[f.key] || [];
                              const selected = current.includes(opt.value);
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    const next = selected
                                      ? current.filter((v) => v !== opt.value)
                                      : [...current, opt.value];
                                    setDraftFilters({
                                      ...draftFilters,
                                      [f.key]: next.length > 0 ? next : undefined,
                                    });
                                  }}
                                  className={`px-3 py-1 rounded-full text-sm border ${
                                    selected ? "bg-black text-white" : "bg-white"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* フッター */}
          <div className="p-4 border-t flex gap-3">
            <button
              onClick={() => {
                setDraftFilters({});
                setFacilityFilters({});
                setIsConditionOpen(false);
              }}
              className="flex-1 border p-3 rounded-lg text-sm"
            >
              リセット
            </button>
            <button
              onClick={() => {
                setFacilityFilters({ ...draftFilters });
                setIsConditionOpen(false);
              }}
              className="flex-1 bg-black text-white p-3 rounded-lg text-sm font-semibold"
            >
              適用する
            </button>
          </div>
        </div>
      )}

      {/* エリアモーダル */}
      {isAreaOpen && (
        <div className="fixed inset-0 bg-white z-50 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">エリア選択</h2>
            <button onClick={() => setIsAreaOpen(false)}>
              ✕
            </button>
          </div>

          {/* 全国 */}
          <div className="mb-6">
            <button
              onClick={() => {
                setPrefecture(null);
                setIsAreaOpen(false);
              }}
              className="text-blue-600"
            >
              全国
            </button>
          </div>

          <div className="space-y-6">
            {/* 九州 */}
            <div>
              <p className="font-semibold mb-2">九州</p>
              <div className="grid grid-cols-2 gap-2">
                {["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPrefecture(p);
                      setIsAreaOpen(false);
                    }}
                    className={`border rounded-lg p-2 text-left ${
                      prefecture === p
                        ? "bg-black text-white"
                        : ""
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 関東 */}
            <div>
              <p className="font-semibold mb-2">関東</p>
              <div className="grid grid-cols-2 gap-2">
                {["東京", "神奈川", "千葉", "埼玉"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPrefecture(p);
                      setIsAreaOpen(false);
                    }}
                    className={`border rounded-lg p-2 text-left ${
                      prefecture === p
                        ? "bg-black text-white"
                        : ""
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 近畿 */}
            <div>
              <p className="font-semibold mb-2">近畿</p>
              <div className="grid grid-cols-2 gap-2">
                {["大阪", "京都", "兵庫", "奈良", "滋賀", "和歌山"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPrefecture(p);
                      setIsAreaOpen(false);
                    }}
                    className={`border rounded-lg p-2 text-left ${
                      prefecture === p
                        ? "bg-black text-white"
                        : ""
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}