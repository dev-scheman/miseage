"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import { FACILITY_EMOJI } from "@/lib/facilityEmoji";

// 大分類ごとの追加フィールド定義
const CATEGORY_EXTRA_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  food_beverage: [
    { key: "menu_url",        label: "メニューURL",   placeholder: "https://..." },
    { key: "reservation_url", label: "予約URL",       placeholder: "https://..." },
    { key: "cuisine_type",    label: "料理ジャンル",  placeholder: "例: 和食、イタリアン" },
    { key: "price_range",     label: "価格帯",        placeholder: "例: ¥800〜¥1,500" },
  ],
  beauty_health: [
    { key: "reservation_url",    label: "予約URL",         placeholder: "https://..." },
    { key: "service_description",label: "施術メニュー概要", placeholder: "例: カット・カラー・パーマ" },
  ],
  fitness: [
    { key: "reservation_url", label: "体験予約URL", placeholder: "https://..." },
    { key: "price_info",      label: "料金情報",    placeholder: "例: 月額¥7,000〜" },
  ],
  medical: [
    { key: "reservation_url", label: "予約URL", placeholder: "https://..." },
  ],
  education: [
    { key: "reservation_url", label: "体験・見学予約URL", placeholder: "https://..." },
    { key: "price_info",      label: "料金情報",          placeholder: "例: 月謝¥8,000〜" },
  ],
  hotel: [
    { key: "reservation_url", label: "予約URL",   placeholder: "https://..." },
    { key: "price_range",     label: "料金目安",  placeholder: "例: 1泊¥8,000〜" },
  ],
  entertainment: [
    { key: "reservation_url", label: "予約URL",   placeholder: "https://..." },
    { key: "price_range",     label: "料金目安",  placeholder: "例: 30分¥500〜" },
  ],
  automotive: [
    { key: "reservation_url", label: "予約・問い合わせURL", placeholder: "https://..." },
  ],
  retail: [],
  service: [],
};

// 曜日定義
const DAYS = [
  { key: "monday",    label: "月" },
  { key: "tuesday",   label: "火" },
  { key: "wednesday", label: "水" },
  { key: "thursday",  label: "木" },
  { key: "friday",    label: "金" },
  { key: "saturday",  label: "土" },
  { key: "sunday",    label: "日" },
];

type DayHours = { open: string; close: string; closed: boolean };

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

export default function EditShopPage() {
  useRequireActivePlan();

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [shop, setShop] = useState<any>(null);

  // 基本情報
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");

  // 画像
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  // 住所
  const [postalCode, setPostalCode] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");         // 市区郡（zipcloud自動入力）
  const [streetAddress, setStreetAddress] = useState(""); // 番地以降
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState("");

  // カテゴリ
  const [categoryMaster, setCategoryMaster] = useState<any[]>([]);
  const [parentCategory, setParentCategory] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // カテゴリ別追加フィールド
  const [metadata, setMetadata] = useState<Record<string, string>>({});

  // 営業時間
  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>({});
  const [bulkOpen, setBulkOpen] = useState("10:00");
  const [bulkClose, setBulkClose] = useState("20:00");

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) => {
    setOpeningHours((prev) => {
      const current = prev[day] ?? { open: "10:00", close: "20:00", closed: false };
      return { ...prev, [day]: { ...current, [field]: value } };
    });
  };

  const applyBulk = () => {
    const updated: Record<string, DayHours> = {};
    DAYS.forEach(({ key }) => {
      const existing = openingHours[key];
      updated[key] = { closed: existing?.closed ?? false, open: bulkOpen, close: bulkClose };
    });
    setOpeningHours(updated);
  };

  // 設備
  const [facilityMasterMap, setFacilityMasterMap] = useState<Record<string, any>>({});
  const [facilities, setFacilities] = useState<any>({});

  // facility_config（大分類+小分類マージ済み）
  const [mergedConfigs, setMergedConfigs] = useState<any[]>([]);
  // ユーザーが「その他」から追加したキー
  const [extraFacilityKeys, setExtraFacilityKeys] = useState<string[]>([]);
  // 「その他」アコーディオン開閉
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  // 大分類の一覧（重複除去）
  const parentCategories = Array.from(
    new Map(categoryMaster.map((c) => [c.parent_category, c.parent_label])).entries()
  );

  // 選択中の大分類に属する小分類
  const subCategories = categoryMaster.filter(
    (c) => c.parent_category === parentCategory
  );

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 店舗取得
      const { data } = await supabase
        .from("shops")
        .select("*, category_master(*)")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!data) { router.push("/mypage"); return; }

      setShop(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setInstagramUrl(data.instagram_url || "");
      setGoogleMapUrl(data.google_map_url || "");
      setPostalCode(data.postal_code || "");
      setPrefecture(data.prefecture || "");
      setCity(data.city || "");
      setStreetAddress(data.street_address || "");
      setFacilities(data.facilities || {});
      setOpeningHours(data.opening_hours || {});

      // 旧 price_range → price_from / price_to に自動マイグレーション
      const rawMeta = data.metadata || {};
      if (rawMeta.price_range && !rawMeta.price_from && !rawMeta.price_to) {
        const parts = String(rawMeta.price_range).split("〜");
        const from = parts[0]?.replace(/^¥/, "") || "";
        const to   = parts[1]?.replace(/^¥/, "") || "";
        const { price_range: _, ...rest } = rawMeta;
        setMetadata({ ...rest, price_from: from, price_to: to });
      } else {
        setMetadata(rawMeta);
      }
      setImageUrl(data.image_url || "");

      if (data.category_master) {
        setParentCategory(data.category_master.parent_category);
        setCategoryId(data.category_id);
      }

      // category_master 取得
      const { data: catMaster } = await supabase
        .from("category_master")
        .select("*")
        .order("parent_category")
        .order("name");
      setCategoryMaster(catMaster || []);

      // facility_master を Map で保持
      const { data: facMaster } = await supabase
        .from("facility_master")
        .select("*");
      const map: Record<string, any> = {};
      (facMaster || []).forEach((f: any) => { map[f.key] = f; });
      setFacilityMasterMap(map);
    };

    fetchAll();
  }, [id]);

  // facility_config: parentCategory / categoryId が変わるたびにフェッチ＆マージ
  useEffect(() => {
    if (!parentCategory) { setMergedConfigs([]); return; }

    const fetchConfigs = async () => {
      // 大分類レベル
      const { data: parentConfigs } = await supabase
        .from("facility_config")
        .select("*")
        .eq("parent_category_key", parentCategory)
        .eq("is_visible", true);

      // 小分類レベル
      let childConfigs: any[] = [];
      if (categoryId) {
        const { data } = await supabase
          .from("facility_config")
          .select("*")
          .eq("category_id", categoryId)
          .eq("is_visible", true);
        childConfigs = data || [];
      }

      // マージ（小分類が大分類を上書き）
      const merged = new Map<string, any>();
      (parentConfigs || []).forEach((c: any) => merged.set(c.facility_key, c));
      childConfigs.forEach((c: any) =>
        merged.set(c.facility_key, { ...merged.get(c.facility_key), ...c })
      );

      setMergedConfigs(
        Array.from(merged.values()).sort((a, b) => a.position - b.position)
      );
    };

    fetchConfigs();
  }, [parentCategory, categoryId]);

  // 既存データがある「その他」キーを自動復元
  useEffect(() => {
    if (mergedConfigs.length === 0) return;
    const otherKeys = mergedConfigs
      .filter((c) => !c.is_default)
      .map((c) => c.facility_key);
    const preselected = otherKeys.filter((key) => {
      const val = facilities[key];
      if (val === undefined || val === null) return false;
      if (typeof val === "boolean") return val;
      if (Array.isArray(val)) return val.length > 0;
      return !!val;
    });
    setExtraFacilityKeys(preselected);
  }, [mergedConfigs]);

  // 郵便番号から住所を自動入力
  const handlePostalLookup = async () => {
    const code = postalCode.replace(/-/g, "");
    if (code.length !== 7) {
      setPostalError("7桁で入力してください");
      return;
    }
    setPostalLoading(true);
    setPostalError("");
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`
      );
      const json = await res.json();
      if (json.results) {
        const r = json.results[0];
        setPrefecture(r.address1);
        setCity(r.address2);   // 市区郡まで
      } else {
        setPostalError("住所が見つかりませんでした");
      }
    } catch {
      setPostalError("検索に失敗しました");
    } finally {
      setPostalLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${id}/main.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("shop-images")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      alert("画像のアップロードに失敗しました");
      console.error(uploadError);
      setImageUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("shop-images")
      .getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setImageUploading(false);
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("shops")
      .update({
        name,
        phone,
        instagram_url: instagramUrl,
        google_map_url: googleMapUrl,
        postal_code: postalCode,
        prefecture,
        city,
        street_address: streetAddress,
        category_id: categoryId || null,
        metadata,
        facilities,
        opening_hours: openingHours,
        image_url: imageUrl || null,
      })
      .eq("id", id);

    if (!error) {
      alert("更新しました");
    } else {
      alert("エラーが発生しました");
      console.error(error);
    }
  };

  if (!shop) return <div className="p-6">読み込み中...</div>;

  const extraFields = CATEGORY_EXTRA_FIELDS[parentCategory] || [];

  // セクション区切り（dark=true のときは黒・太字でメリハリ）
  const SectionLabel = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => (
    <p className={`text-xs font-semibold uppercase tracking-widest pt-6 pb-1 ${dark ? "text-gray-900" : "text-gray-400"}`}>
      {children}
    </p>
  );

  const inputCls = "w-full border border-gray-200 bg-white rounded-xl px-3 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:shadow-[0_0_0_1px_black] transition-colors";
  const labelCls = "text-xs text-gray-500 mb-1 block";

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b flex items-center px-4 py-3 gap-3">
        <button onClick={() => router.push("/mypage")} className="text-gray-500 text-sm">
          ✕
        </button>
        <span className="font-semibold flex-1 text-center">店舗を編集</span>
        <button
          onClick={handleUpdate}
          className="text-sm font-semibold text-blue-600"
        >
          保存
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-20">

        {/* ── 店舗画像 ── */}
        <SectionLabel dark>店舗画像</SectionLabel>
        <div className="flex items-center gap-4">
          {/* プレビュー */}
          <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
            {imageUrl
              ? <img src={imageUrl} alt="店舗画像" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🏪</div>
            }
          </div>
          {/* アップロードボタン */}
          <div className="space-y-1">
            <label className="cursor-pointer inline-block bg-gray-50 border border-gray-200 text-sm px-4 py-2 rounded-xl">
              {imageUploading ? "アップロード中..." : imageUrl ? "画像を変更" : "画像を追加"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={imageUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </label>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="block text-xs text-gray-400"
              >
                削除
              </button>
            )}
            <p className="text-xs text-gray-400">ロゴや店舗写真（検索エンジン向け）</p>
          </div>
        </div>

        {/* ── 店舗名 ── */}
        <SectionLabel>店舗名</SectionLabel>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="店舗名"
        />

        {/* ── カテゴリ ── */}
        <SectionLabel dark>カテゴリ</SectionLabel>
        <div className="space-y-2">
          <div>
            <label className={labelCls}>業種（大分類）</label>
            <select
              className={inputCls}
              value={parentCategory}
              onChange={(e) => { setParentCategory(e.target.value); setCategoryId(null); }}
            >
              <option value="">選択してください</option>
              {parentCategories.map(([slug, label]) => (
                <option key={slug} value={slug}>{label}</option>
              ))}
            </select>
          </div>
          {parentCategory && (
            <div>
              <label className={labelCls}>詳細カテゴリ（小分類）</label>
              <select
                className={inputCls}
                value={categoryId || ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
              >
                <option value="">選択してください</option>
                {subCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── 住所 ── */}
        <SectionLabel dark>住所</SectionLabel>
        <div className="space-y-2">
          <div>
            <label className={labelCls}>郵便番号</label>
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="810-0001"
                maxLength={8}
              />
              <button
                type="button"
                onClick={handlePostalLookup}
                disabled={postalLoading}
                className="border border-gray-200 bg-gray-50 px-3 py-3 rounded-xl text-xs whitespace-nowrap"
              >
                {postalLoading ? "検索中..." : "住所を検索"}
              </button>
            </div>
            {postalError && <p className="text-red-500 text-xs mt-1">{postalError}</p>}
          </div>
          <div>
            <label className={labelCls}>都道府県 <span className="text-gray-300">（郵便番号から自動入力）</span></label>
            <input className={`${inputCls} text-gray-400`} value={prefecture} readOnly placeholder="郵便番号で検索" />
          </div>
          <div>
            <label className={labelCls}>市区郡 <span className="text-gray-300">（郵便番号から自動入力）</span></label>
            <input className={`${inputCls} text-gray-400`} value={city} readOnly placeholder="郵便番号で検索" />
          </div>
          <div>
            <label className={labelCls}>番地・建物名</label>
            <input className={inputCls} value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="天神1-1-1 〇〇ビル2F" />
          </div>
          <div>
            <label className={labelCls}>最寄り駅</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={metadata["nearest_stations"] || ""}
              onChange={(e) => setMetadata({ ...metadata, nearest_stations: e.target.value })}
              placeholder={"天神駅 徒歩3分\n赤坂駅 徒歩7分"}
            />
          </div>
        </div>

        {/* ── 連絡先・リンク ── */}
        <SectionLabel dark>連絡先・リンク</SectionLabel>
        <div className="space-y-2">
          <div>
            <label className={labelCls}>電話番号</label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="000-0000-0000" />
          </div>
          <div>
            <label className={labelCls}>Instagram URL</label>
            <input className={inputCls} value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/..." />
          </div>
          <div>
            <label className={labelCls}>Googleマップ URL</label>
            <input className={inputCls} value={googleMapUrl} onChange={(e) => setGoogleMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
          </div>
        </div>

        {/* ── カテゴリ別追加情報（JSON-LD用） ── */}
        {extraFields.length > 0 && (
          <>
            <SectionLabel dark>追加情報 <span className="normal-case text-gray-400 font-normal">検索エンジンに活用</span></SectionLabel>
            <div className="space-y-2">
              {extraFields.map((f) => (
                <div key={f.key}>
                  <label className={labelCls}>{f.label}</label>
                  {f.key === "price_range" ? (
                    // ¥プレフィックス付き・price_from / price_to で個別管理
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">¥</span>
                        <input
                          className={`${inputCls} pl-7`}
                          value={metadata["price_from"] || ""}
                          onChange={(e) => setMetadata({ ...metadata, price_from: e.target.value })}
                          placeholder="800"
                        />
                      </div>
                      <span className="text-gray-400 text-sm flex-shrink-0">〜</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">¥</span>
                        <input
                          className={`${inputCls} pl-7`}
                          value={metadata["price_to"] || ""}
                          onChange={(e) => setMetadata({ ...metadata, price_to: e.target.value })}
                          placeholder="1,500"
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      className={inputCls}
                      value={metadata[f.key] || ""}
                      onChange={(e) => setMetadata({ ...metadata, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── 営業時間 ── */}
        <SectionLabel dark>営業時間</SectionLabel>
        {/* 一括設定（モバイル対応） */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <p className="text-xs text-gray-600 font-medium mb-2">一括設定</p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={bulkOpen}
              onChange={(e) => setBulkOpen(e.target.value)}
              className="w-28 border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black focus:shadow-[0_0_0_1px_black] transition-colors"
            />
            <span className="text-gray-400 text-xs flex-shrink-0">〜</span>
            <input
              type="time"
              value={bulkClose}
              onChange={(e) => setBulkClose(e.target.value)}
              className="w-28 border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black focus:shadow-[0_0_0_1px_black] transition-colors"
            />
            <button
              type="button"
              onClick={applyBulk}
              className="bg-black text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0"
            >
              全曜日に設定
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {DAYS.map(({ key, label }) => {
            const day = openingHours[key] ?? { open: "10:00", close: "20:00", closed: false };
            return (
              <div key={key} className="flex items-center gap-2 text-sm py-1">
                <span className="w-5 text-center text-gray-500 flex-shrink-0">{label}</span>
                {day.closed ? (
                  <span className="flex-1 text-gray-300 text-xs">定休日</span>
                ) : (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(key, "open", e.target.value)}
                      className="w-28 border border-gray-200 bg-white rounded-lg px-1.5 py-1 text-sm focus:outline-none focus:border-black focus:shadow-[0_0_0_1px_black] transition-colors"
                    />
                    <span className="text-gray-300 text-xs flex-shrink-0">〜</span>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(key, "close", e.target.value)}
                      className="w-28 border border-gray-200 bg-white rounded-lg px-1.5 py-1 text-sm focus:outline-none focus:border-black focus:shadow-[0_0_0_1px_black] transition-colors"
                    />
                  </div>
                )}
                <label className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!day.closed}
                    onChange={(e) => updateDay(key, "closed", e.target.checked)}
                  />
                  定休日
                </label>
              </div>
            );
          })}
        </div>

        {/* ── 設備・対応 ── */}
        {mergedConfigs.length > 0 && (() => {
          const defaultConfigs = mergedConfigs.filter((c) => c.is_default);
          const otherConfigs   = mergedConfigs.filter((c) => !c.is_default);
          const visibleOtherConfigs = otherConfigs.filter(
            (c) => !extraFacilityKeys.includes(c.facility_key)
          );

          const renderFacility = (facilityKey: string, showRemove?: () => void) => {
            const f = facilityMasterMap[facilityKey];
            if (!f) return null;
            const emoji = FACILITY_EMOJI[f.key];
            return (
              <div key={f.key} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">
                    {emoji && <span className="mr-1">{emoji}</span>}{f.label}
                  </p>
                  {showRemove && (
                    <button type="button" onClick={showRemove} className="text-gray-300 text-xs">✕</button>
                  )}
                </div>

                {f.type === "boolean" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!facilities[f.key]}
                      onChange={(e) =>
                        setFacilities({ ...facilities, [f.key]: e.target.checked })
                      }
                      className="accent-black"
                    />
                    あり
                  </label>
                )}

                {f.type === "enum" && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {f.options?.map((opt: any) => (
                      <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          name={f.key}
                          value={opt.value}
                          checked={facilities[f.key] === opt.value}
                          onChange={(e) =>
                            setFacilities({ ...facilities, [f.key]: e.target.value })
                          }
                          className="accent-black"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                )}

                {f.type === "multi_enum" && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {f.options?.map((opt: any) => {
                      const current = facilities[f.key] || [];
                      return (
                        <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={current.includes(opt.value)}
                            onChange={(e) => {
                              let next = [...current];
                              if (e.target.checked) next.push(opt.value);
                              else next = next.filter((v: string) => v !== opt.value);
                              setFacilities({ ...facilities, [f.key]: next });
                            }}
                            className="accent-black"
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          };

          return (
            <>
              {/* セクションラベル */}
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-widest pt-6 pb-1">
                設備・対応
              </p>

              {/* デフォルト表示（group_name でグループ化） */}
              {(() => {
                const groupMap = new Map<string, any[]>();
                defaultConfigs.forEach((c) => {
                  const gn = facilityMasterMap[c.facility_key]?.group_name || "その他";
                  if (!groupMap.has(gn)) groupMap.set(gn, []);
                  groupMap.get(gn)!.push(c);
                });
                return Array.from(groupMap.entries()).map(([groupName, configs]) => (
                  <div key={groupName} className="pt-2 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold tracking-wide">{groupName}</p>
                    {configs.map((c) => renderFacility(c.facility_key))}
                  </div>
                ));
              })()}

              {/* ユーザーが追加した「その他」 */}
              {extraFacilityKeys.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold tracking-wide">追加済み</p>
                  {extraFacilityKeys.map((key) => renderFacility(
                    key,
                    () => setExtraFacilityKeys(extraFacilityKeys.filter((k) => k !== key))
                  ))}
                </div>
              )}

              {/* その他アコーディオン */}
              {visibleOtherConfigs.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOtherOpen((v) => !v)}
                    className="text-sm text-blue-500 flex items-center gap-1"
                  >
                    {isOtherOpen ? "▲" : "＋"} その他の情報を追加
                    <span className="text-gray-300 text-xs ml-1">（{visibleOtherConfigs.length}件）</span>
                  </button>
                  {isOtherOpen && (
                    <div className="mt-2 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                      {visibleOtherConfigs.map((c) => {
                        const f = facilityMasterMap[c.facility_key];
                        if (!f) return null;
                        return (
                          <button
                            key={c.facility_key}
                            type="button"
                            onClick={() => {
                              setExtraFacilityKeys([...extraFacilityKeys, c.facility_key]);
                              if (visibleOtherConfigs.length <= 1) setIsOtherOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm flex justify-between items-center active:bg-gray-50"
                          >
                            <span>{f.label}</span>
                            <span className="text-blue-500 text-xs">追加</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* 削除 */}
        <div className="pt-10 pb-4">
          <button
            onClick={async () => {
              if (!confirm("本当に削除しますか？")) return;
              const { error } = await supabase.from("shops").delete().eq("id", id);
              if (!error) { alert("削除しました"); router.push("/mypage"); }
              else { alert("削除に失敗しました"); console.error(error); }
            }}
            className="w-full text-red-500 text-sm py-3"
          >
            この店舗を削除する
          </button>
        </div>
      </div>
    </div>
  );
}
