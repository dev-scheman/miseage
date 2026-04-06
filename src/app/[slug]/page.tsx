"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FACILITY_EMOJI } from "@/lib/facilityEmoji";
import Footer from "@/components/Footer";

const DAYS = [
  { key: "monday",    label: "月" },
  { key: "tuesday",   label: "火" },
  { key: "wednesday", label: "水" },
  { key: "thursday",  label: "木" },
  { key: "friday",    label: "金" },
  { key: "saturday",  label: "土" },
  { key: "sunday",    label: "日" },
];

const TODAY_KEY = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];


export default function ShopPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [shop, setShop] = useState<any>(null);
  const [facilityMaster, setFacilityMaster] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      // 店舗取得（カテゴリ情報も一緒に）
      const { data: shopData } = await supabase
        .from("shops")
        .select("*, category_master(*)")
        .eq("slug", slug)
        .single();

      // facility master
      const { data: master } = await supabase
        .from("facility_master")
        .select("*");

      setShop(shopData);
      setFacilityMaster(master || []);
    };

    fetchData();
  }, [slug]);

  if (!shop) return <div className="p-6">読み込み中...</div>;

  // facility label取得用
  const facilityMap = Object.fromEntries(
    facilityMaster.map((f) => [f.key, f])
  );

  // JSON-LD: openingHours string形式 "Mo-Sa 10:00-20:00"
  const DAY_ABBR: Record<string, string> = {
    monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th",
    friday: "Fr", saturday: "Sa", sunday: "Su",
  };
  const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

  const buildOpeningHours = (): string[] => {
    if (!shop.opening_hours) return [];

    // 同じ時間の曜日をグループ化
    const groups: Record<string, string[]> = {};
    DAY_ORDER.forEach((day) => {
      const h = shop.opening_hours[day];
      if (!h || h.closed) return;
      const key = `${h.open}__${h.close}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(day);
    });

    const result: string[] = [];
    Object.entries(groups).forEach(([timeKey, days]) => {
      // DAY_ORDER順にソートして連続する曜日をレンジにまとめる
      const indices = days.map((d) => DAY_ORDER.indexOf(d)).sort((a, b) => a - b);
      let start = indices[0];
      let end = indices[0];

      for (let i = 1; i <= indices.length; i++) {
        if (i < indices.length && indices[i] === end + 1) {
          end = indices[i];
        } else {
          const startAbbr = DAY_ABBR[DAY_ORDER[start]];
          const endAbbr   = DAY_ABBR[DAY_ORDER[end]];
          const range = start === end ? startAbbr : `${startAbbr}-${endAbbr}`;
          const [opens, closes] = timeKey.split("__");
          result.push(`${range} ${opens}-${closes}`);
          if (i < indices.length) { start = indices[i]; end = indices[i]; }
        }
      }
    });

    return result;
  };

  const openingHoursStrings = buildOpeningHours();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": shop.category_master?.schema_type ?? "LocalBusiness",
    name: shop.name,
    ...(shop.phone && { telephone: shop.phone }),
    ...(shop.postal_code || shop.prefecture ? {
      address: {
        "@type": "PostalAddress",
        ...(shop.postal_code    && { postalCode: shop.postal_code }),
        ...(shop.prefecture     && { addressRegion: shop.prefecture }),
        ...(shop.city           && { addressLocality: shop.city }),
        ...(shop.street_address && { streetAddress: shop.street_address }),
        addressCountry: "JP",
      },
    } : {}),
    ...(shop.image_url                 && { image: shop.image_url }),
    ...(shop.google_map_url            && { hasMap: shop.google_map_url }),
    ...(shop.metadata?.menu_url        && { hasMenu: shop.metadata.menu_url }),
    ...(shop.metadata?.reservation_url && { reservationUrl: shop.metadata.reservation_url }),
    ...((shop.metadata?.price_from || shop.metadata?.price_to) && {
      priceRange: `¥${shop.metadata.price_from || ""}〜¥${shop.metadata.price_to || ""}`,
    }),
    ...(openingHoursStrings.length > 0 && { openingHours: openingHoursStrings }),
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 h-[44px] bg-white flex items-center justify-center px-4 z-50">
        <button
          onClick={() => router.back()}
          className="absolute left-4 text-gray-600 hover:text-gray-800"
        >
          <svg aria-label="戻る" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24" style={{ transform: 'rotate(-90deg)' }}><title>戻る</title><path d="M21 17.502a.997.997 0 0 1-.707-.293L12 8.913l-8.293 8.296a1 1 0 1 1-1.414-1.414l9-9.004a1.03 1.03 0 0 1 1.414 0l9 9.004A1 1 0 0 1 21 17.502Z"></path></svg>
        </button>
        <p className="font-semibold text-sm">{shop.name}</p>
      </div>

      {/* Page content padding */}
      <div className="pt-[44px]">
        {/* ヘッダー（Instagramない場合のみ表示） */}
        {!shop.instagram_url && (
          <div className="border-b p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {shop.image_url
                ? <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">🏪</div>
              }
            </div>
            <div>
              <p className="font-bold">{shop.name}</p>
              <p className="text-sm text-gray-500">@{shop.slug}</p>
            </div>
          </div>
        )}

      {/* インスタ or 店舗画像フォールバック */}
      <div className="max-w-xl mx-auto">
        {shop.instagram_url ? (
          <iframe
            src={shop.instagram_url.replace(/\/$/, "") + "/embed"}
            className="w-full aspect-square overflow-hidden min-h-[400px]"
            scrolling="no"
          />
        ) : shop.image_url ? (
          <img
            src={shop.image_url}
            alt={shop.name}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-300 text-6xl">🏪</div>
        )}
      </div>

      {/* ── 店舗情報（Googleマップ準拠の並び） ── */}
      <div className="max-w-xl mx-auto divide-y divide-gray-100">

        {/* カテゴリ */}
        {shop.category_master && (
          <div className="px-4 py-3 flex gap-2 flex-wrap">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {shop.category_master.parent_label}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {shop.category_master.name}
            </span>
          </div>
        )}

        {/* 営業時間 */}
        {shop.opening_hours && Object.keys(shop.opening_hours).length > 0 && (
          <div className="px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">営業時間</p>
            {DAYS.map(({ key, label }) => {
              const day = shop.opening_hours[key];
              if (!day) return null;
              const isToday = key === TODAY_KEY;
              return (
                <div key={key} className={`flex items-center gap-3 text-sm py-0.5 ${isToday ? "font-semibold" : ""}`}>
                  <span className={`w-5 text-center flex-shrink-0 ${isToday ? "text-blue-600" : "text-gray-400"}`}>{label}</span>
                  {day.closed
                    ? <span className="text-gray-400">定休日</span>
                    : <span>{day.open} 〜 {day.close}</span>
                  }
                  {isToday && <span className="text-xs text-blue-500">今日</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* 住所・最寄り駅 */}
        {(shop.prefecture || shop.city || shop.street_address) && (
          <div className="px-4 py-3 space-y-1">
            <p className="text-sm text-gray-700">
              〒{shop.postal_code && `${shop.postal_code} `}
              {shop.prefecture}{shop.city}{shop.street_address}
            </p>
            {shop.metadata?.nearest_stations && (
              <div className="text-sm text-gray-500">
                {shop.metadata.nearest_stations.split("\n").filter(Boolean).map((line: string, i: number) => (
                  <p key={i}>🚉 {line.trim()}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 電話番号 */}
        {shop.phone && (
          <div className="px-4 py-3">
            <a href={`tel:${shop.phone}`} className="text-sm text-blue-600">
              📞 {shop.phone}
            </a>
          </div>
        )}

        {/* アクションリンク（予約・メニュー・Googleマップ） */}
        {(shop.metadata?.reservation_url || shop.metadata?.menu_url || shop.google_map_url) && (
          <div className="px-4 py-3 flex flex-col gap-2">
            {shop.metadata?.reservation_url && (
              <a
                href={shop.metadata.reservation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-black text-white text-sm font-semibold py-3 rounded-xl"
              >
                📅 予約する
              </a>
            )}
            {shop.metadata?.menu_url && (
              <a
                href={shop.metadata.menu_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center border border-gray-200 text-sm font-semibold py-3 rounded-xl"
              >
                🍽 メニューを見る
              </a>
            )}
            {shop.google_map_url && (
              <a
                href={shop.google_map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center border border-gray-200 text-sm font-semibold py-3 rounded-xl"
              >
                📍 Googleマップで見る
              </a>
            )}
          </div>
        )}

        {/* 設備・対応 */}
        {shop.facilities && (
          <div className="px-4 py-3 space-y-4">
            <p className="text-xs font-semibold text-black uppercase tracking-wide">設備・対応</p>
            {Object.entries(
              facilityMaster.reduce((acc: any, f: any) => {
                if (!acc[f.group_name]) acc[f.group_name] = [];
                acc[f.group_name].push(f);
                return acc;
              }, {})
            ).map(([group, items]: any) => {
              const visibleItems = items.filter((f: any) => {
                const value = shop.facilities[f.key];
                if (f.type === "boolean") return value === true;
                if (f.type === "enum") return !!value;
                if (f.type === "multi_enum") return value?.length > 0;
                return false;
              });
              if (visibleItems.length === 0) return null;
              // グループラベルを表示するか判定（グループと項目が同じ名前でない場合のみ表示）
              const showGroupLabel = !visibleItems.some((f: any) => f.label === group);
              return (
                <div key={group}>
                  {showGroupLabel && (
                    <h3 className="text-xs font-semibold text-gray-400 tracking-wide mb-1.5">{group}</h3>
                  )}
                  <div className="space-y-1.5">
                    {visibleItems.map((f: any) => {
                      const value = shop.facilities[f.key];
                      const emoji = FACILITY_EMOJI[f.key];
                      if (f.type === "boolean") return (
                        <div key={f.key} className="text-sm flex items-center gap-1.5">
                          {emoji && <span>{emoji}</span>}<span>{f.label}</span>
                        </div>
                      );
                      if (f.type === "enum") {
                        const opt = f.options?.find((o: any) => o.value === value);
                        return (
                          <div key={f.key} className="text-sm flex items-center gap-1.5">
                            {emoji && <span>{emoji}</span>}<span>{f.label}: {opt?.label}</span>
                          </div>
                        );
                      }
                      if (f.type === "multi_enum") {
                        const labels = value.map((v: string) => f.options?.find((o: any) => o.value === v)?.label).filter(Boolean).join(", ");
                        return (
                          <div key={f.key} className="text-sm flex items-center gap-1.5">
                            {emoji && <span>{emoji}</span>}<span>{f.label}: {labels}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Legal Links Footer */}
      <div className="px-4 py-4 text-center border-t mt-8">
        <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-500 mb-4">
          <button onClick={() => router.push("/privacy")} className="hover:text-gray-700">プライバシーポリシー</button>
          <span>|</span>
          <button onClick={() => router.push("/terms")} className="hover:text-gray-700">利用規約</button>
          <span>|</span>
          <button onClick={() => router.push("/legal")} className="hover:text-gray-700">特定商取引法</button>
          <span>|</span>
          <button onClick={() => router.push("/contact")} className="hover:text-gray-700">お問い合わせ</button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-16" />
      <Footer />
      </div>
    </div>
  );
}