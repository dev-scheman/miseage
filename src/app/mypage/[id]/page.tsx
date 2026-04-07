"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireActivePlan } from "@/lib/useRequireActivePlan";
import { FACILITY_EMOJI } from "@/lib/facilityEmoji";
import Footer from "@/components/Footer";

// 大分類ごとの追加フィールド定義
const CATEGORY_EXTRA_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  food_beverage: [
    { key: "menu_url",        label: "メニューURL",   placeholder: "https://..." },
    { key: "cuisine_type",    label: "料理ジャンル",  placeholder: "例: 和食、イタリアン" },
    { key: "price_range",     label: "価格帯",        placeholder: "例: ¥800〜¥1,500" },
  ],
  beauty_health: [
    { key: "service_description",label: "施術メニュー概要", placeholder: "例: カット・カラー・パーマ" },
  ],
  fitness: [
    { key: "price_info",      label: "料金情報",    placeholder: "例: 月額¥7,000〜" },
  ],
  medical: [],
  education: [
    { key: "price_info",      label: "料金情報",          placeholder: "例: 月謝¥8,000〜" },
  ],
  hotel: [
    { key: "price_range",     label: "料金目安",  placeholder: "例: 1泊¥8,000〜" },
  ],
  entertainment: [
    { key: "price_range",     label: "料金目安",  placeholder: "例: 30分¥500〜" },
  ],
  automotive: [],
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

  // 初期値（変更判定用）
  const [initialState, setInitialState] = useState<any>(null);

  // 基本情報
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");

  // 画像
  const [imageUrl, setImageUrl] = useState("");
  const [apiImageUrl, setApiImageUrl] = useState(""); // API から取得した画像
  const [useApiImage, setUseApiImage] = useState(false); // API 画像を使うか
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
  const [metadata, setMetadata] = useState<Record<string, string | string[]>>({});

  // 営業時間
  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>({});
  const [bulkOpen, setBulkOpen] = useState("10:00");
  const [bulkClose, setBulkClose] = useState("20:00");

  // FAQ
  const [faqs, setFaqs] = useState<any[]>([]);

  // 凡例ポップアップ
  const [showLegend, setShowLegend] = useState(false);

  // 削除確認モーダル
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

      // API から取得した phone（JSON パースが必要な場合に対応）
      let dataforceData = data.dataforce_response;
      if (typeof dataforceData === 'string') {
        try {
          dataforceData = JSON.parse(dataforceData);
        } catch (e) {
          dataforceData = {};
        }
      }
      const apiPhone = (dataforceData?.phone || "").replace(/^\+81/, '0');
      setPhone(data.phone || apiPhone || "");

      // API url がインスタ URL の場合は自動入力（? 以降を削除）
      let apiInstagramUrl = "";
      if (dataforceData?.url?.includes("instagram.com")) {
        apiInstagramUrl = dataforceData.url.split("?")[0];
      }
      setInstagramUrl(data.instagram_url || apiInstagramUrl || "");

      // place_id から Google Maps URL を自動生成
      const gmapUrl = data.google_map_url || (data.place_id
        ? `https://maps.google.com/?q=place_id:${data.place_id}`
        : "");
      setGoogleMapUrl(gmapUrl);
      setPostalCode(data.postal_code || "");
      setPrefecture(data.prefecture || "");
      setCity(data.city || "");
      setStreetAddress(data.street_address || "");

      // street_address が未入力の場合のみ API データから自動入力
      if (!data.street_address && dataforceData?.address_info) {
        const addrInfo = dataforceData.address_info;
        setPostalCode(data.postal_code || addrInfo.zip || "");
        setPrefecture(data.prefecture || addrInfo.region || "");
        setCity(data.city || addrInfo.city || "");
        setStreetAddress(addrInfo.address || "");
      }
      setFacilities(data.facilities || {});
      setOpeningHours(data.opening_hours || {});

      // FAQ を JSON から読み込み
      setFaqs(data.faqs_jsonb || []);

      // street_address が未入力の場合のみ API データから営業時間を自動入力
      if (!data.street_address && dataforceData?.work_hours?.timetable) {
        const apiTimetable = dataforceData.work_hours.timetable;
        const convertedHours: Record<string, DayHours> = {};

        for (const day of DAYS) {
          const dayKey = day.key;
          const dayData = apiTimetable[dayKey];

          if (dayData && Array.isArray(dayData) && dayData.length > 0) {
            const slot = dayData[0]; // 最初の営業時間のみを使用
            convertedHours[dayKey] = {
              open: `${String(slot.open.hour).padStart(2, '0')}:${String(slot.open.minute).padStart(2, '0')}`,
              close: `${String(slot.close.hour).padStart(2, '0')}:${String(slot.close.minute).padStart(2, '0')}`,
              closed: false,
            };
          } else {
            // データがない場合は定休日
            convertedHours[dayKey] = { open: "", close: "", closed: true };
          }
        }
        setOpeningHours(convertedHours);
      }

      // 旧 price_range → price_from / price_to に自動マイグレーション
      const rawMeta = data.metadata || {};

      // instagram_url（? 以降削除済み）と重複する URL を other_urls から除外
      const cleanInstagramUrl = (data.instagram_url || apiInstagramUrl || "").split("?")[0];
      const filteredOtherUrls = (data.other_urls || []).filter((url: string) =>
        !url.includes("instagram.com") || (cleanInstagramUrl && !url.includes(cleanInstagramUrl.split("/").pop()))
      );

      let metaDataToSet;
      if (rawMeta.price_range && !rawMeta.price_from && !rawMeta.price_to) {
        const parts = String(rawMeta.price_range).split("〜");
        const from = parts[0]?.replace(/^¥/, "") || "";
        const to   = parts[1]?.replace(/^¥/, "") || "";
        const { price_range: _, ...rest } = rawMeta;
        metaDataToSet = { ...rest, price_from: from, price_to: to, other_urls: filteredOtherUrls };
      } else {
        metaDataToSet = { ...rawMeta, other_urls: filteredOtherUrls };
      }
      setMetadata(metaDataToSet);

      // metadataWithoutUrls を initialState 用に定義
      const { other_urls, ...metadataWithoutUrls } = metaDataToSet;

      // API 画像 URL を取得
      const apiImage = dataforceData?.main_image || "";
      setApiImageUrl(apiImage);

      // 初回入力（image_url が未設定）で API 画像がある場合は、それを使う
      if (data.image_url) {
        setImageUrl(data.image_url);
        setUseApiImage(false);
      } else if (apiImage) {
        // API 画像を初期選択状態にする（まだ保存されていない）
        setUseApiImage(true);
      } else {
        setImageUrl(data.image_url || "");
        setUseApiImage(false);
      }

      if (data.category_master) {
        setParentCategory(data.category_master.parent_category);
        setCategoryId(data.category_id);
      }

      // category_master 取得（先に取得して API category マッピングに使用）
      const { data: catMaster } = await supabase
        .from("category_master")
        .select("*")
        .order("parent_category")
        .order("name");
      setCategoryMaster(catMaster || []);

      if (!data.category_id && dataforceData?.category) {
        // category_id が未設定で API category がある場合、category_mapping から検索
        const { data: categoryMapping } = await supabase
          .from("category_mapping")
          .select("*")
          .eq("api_category", dataforceData.category)
          .single();

        if (categoryMapping?.big_category) {
          setParentCategory(categoryMapping.big_category);

          // category_master から detail_category に対応する id を検索
          if (categoryMapping?.detail_category && catMaster) {
            const matchingCategory = catMaster.find(
              cat => cat.parent_category === categoryMapping.big_category &&
                     cat.id === categoryMapping.detail_category
            );
            if (matchingCategory) {
              setCategoryId(matchingCategory.id);
            }
          }
        }
      }

      // facility_master を Map で保持
      const { data: facMaster } = await supabase
        .from("facility_master")
        .select("*");
      const map: Record<string, any> = {};
      (facMaster || []).forEach((f: any) => { map[f.key] = f; });
      setFacilityMasterMap(map);

      // 初期値をセット（変更判定用）
      setInitialState({
        name: data.name || "",
        phone: data.phone || apiPhone || "",
        instagramUrl: data.instagram_url || apiInstagramUrl || "",
        googleMapUrl: gmapUrl,
        postalCode: data.postal_code || "",
        prefecture: data.prefecture || "",
        city: data.city || "",
        streetAddress: data.street_address || "",
        categoryId: data.category_id || null,
        parentCategory: data.category_master?.parent_category || "",
        metadata: metadataWithoutUrls || {},
        facilities: data.facilities || {},
        openingHours: data.opening_hours || {},
        imageUrl: useApiImage ? apiImageUrl : (data.image_url || ""),
        useApiImage,
        apiImageUrl,
        faqs: data.faqs_jsonb || [],
      });
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

  // 設備チェックから FAQ を自動生成
  useEffect(() => {
    const updatedFaqs = [...faqs];

    // facilityMasterMap を使って、チェックされた項目の FAQ を生成
    Object.entries(facilities).forEach(([facilityKey, isChecked]) => {
      const facility = facilityMasterMap[facilityKey];
      if (!facility) return;

      if (isChecked) {
        // チェック ON: FAQ がなければ作成
        const existingFaq = updatedFaqs.find((f) => f.created_from === facilityKey);
        if (!existingFaq && facility.faq_question) {
          updatedFaqs.push({
            "@type": "Question",
            name: facility.faq_question,
            acceptedAnswer: {
              "@type": "Answer",
              text: facility.faq_answer_example || "",
            },
            created_from: facilityKey,
          });
        }
      } else {
        // チェック OFF: 対応する FAQ を削除
        const indexToRemove = updatedFaqs.findIndex((f) => f.created_from === facilityKey);
        if (indexToRemove >= 0) {
          updatedFaqs.splice(indexToRemove, 1);
        }
      }
    });

    setFaqs(updatedFaqs);
  }, [facilities, facilityMasterMap]);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabase.from("shops").delete().eq("id", id);
    setIsDeleting(false);
    if (!error) {
      alert("削除しました");
      router.push("/mypage");
    } else {
      alert("削除に失敗しました");
      console.error(error);
      setShowDeleteConfirm(false);
    }
  };

  const handleBackClick = () => {
    // 現在の状態と初期値を比較
    const currentState = {
      name,
      phone,
      instagramUrl,
      googleMapUrl,
      postalCode,
      prefecture,
      city,
      streetAddress,
      categoryId,
      parentCategory,
      metadata,
      facilities,
      openingHours,
      imageUrl,
      useApiImage,
      apiImageUrl,
      faqs,
    };

    const hasChanges = JSON.stringify(currentState) !== JSON.stringify(initialState);

    if (hasChanges) {
      if (confirm("変更が保存されていません。戻りますか？")) {
        router.push("/mypage");
      }
    } else {
      router.push("/mypage");
    }
  };

  const handleUpdate = async () => {
    // バリデーション：番地・建物名は必須
    if (!streetAddress.trim()) {
      alert("番地・建物名は必須項目です");
      return;
    }

    // metadata から other_urls を抽出
    const { other_urls, ...metadataWithoutUrls } = metadata;

    // FAQ から created_from を除外（JSON-LD 形式で保存）
    const faqs_jsonld = faqs.map(({ created_from, ...faq }) => faq);

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
        metadata: metadataWithoutUrls,
        other_urls: (Array.isArray(other_urls) ? other_urls : []).filter(u => u.trim()),
        facilities,
        opening_hours: openingHours,
        image_url: useApiImage ? apiImageUrl : (imageUrl || null),
        faqs_jsonb: faqs_jsonld,
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
  const SectionLabel = ({ children, dark, meoIcon }: { children: React.ReactNode; dark?: boolean; meoIcon?: boolean }) => (
    <p className={`text-xs font-semibold uppercase tracking-widest pt-6 pb-1 ${dark ? "text-gray-900" : "text-gray-400"} flex items-center gap-2`}>
      {meoIcon && <span className="text-sm">📍</span>}
      {children}
    </p>
  );

  const inputCls = "w-full border border-gray-200 bg-white rounded-xl px-3 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-black focus:shadow-[0_0_0_1px_black] transition-colors";
  const labelCls = "text-xs text-gray-500 mb-1 block";

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b grid grid-cols-3 items-center px-4 h-11">
        <button onClick={handleBackClick} className="text-gray-500 text-sm justify-self-start">
          ✕
        </button>
        <span className="font-semibold text-center">店舗情報を編集</span>
        <button
          onClick={handleUpdate}
          className="text-sm font-bold text-white bg-black px-4 py-2 rounded-lg justify-self-end -mr-3"
        >
          保存する
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-20">

        {/* ── 店舗画像 ── */}
        <SectionLabel dark>📍 店舗画像</SectionLabel>
        {apiImageUrl ? (
          <div className="grid grid-cols-2 gap-4">
            {/* 左：API 画像 */}
            <div className="flex flex-col gap-2">
              <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={apiImageUrl} alt="GBP画像" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-gray-500">(GBPから自動取得しました)</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="imageSource"
                  checked={useApiImage}
                  onChange={() => {
                    setUseApiImage(true);
                    setImageUrl("");
                  }}
                  className="cursor-pointer"
                />
                <span>この画像を使う（推奨）</span>
              </label>
            </div>

            {/* 右：ユーザーアップロード */}
            <div className="flex flex-col gap-2">
              <div className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
                {imageUrl && !useApiImage ? (
                  <img src={imageUrl} alt="ユーザー画像" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 px-2">[タップして画像を選択]</p>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="imageSource"
                  checked={!useApiImage}
                  onChange={() => {
                    setUseApiImage(false);
                  }}
                  className="cursor-pointer"
                />
                <span>自分で画像をアップする</span>
              </label>
              {!useApiImage && (
                <label className="cursor-pointer inline-block bg-blue-50 border border-blue-200 text-blue-600 text-xs px-3 py-2 rounded-lg text-center">
                  {imageUploading ? "アップロード中..." : "画像を選択"}
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
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* API 画像がない場合は従来のUI */}
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
              {imageUrl
                ? <img src={imageUrl} alt="店舗画像" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🏪</div>
              }
            </div>
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
        )}

        {/* ── 店舗名 ── */}
        <SectionLabel dark>📍 店舗名 <span className="text-red-500">※</span></SectionLabel>
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
            <label className={labelCls}><span className="text-sm">📍</span> 業種（大分類）<span className="text-red-500">※</span></label>
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
              <label className={labelCls}>詳細カテゴリ（小分類）<span className="text-red-500">※</span></label>
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
            <label className={labelCls}><span className="text-sm">📍</span> 郵便番号<span className="text-red-500">※</span></label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className={`${inputCls}`}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="810-0001"
                  maxLength={8}
                />
                {!shop?.street_address && postalCode && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                    ⚙️
                  </span>
                )}
              </div>
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
            <label className={labelCls}><span className="text-sm">📍</span> 都道府県 <span className="text-gray-300">（郵便番号から自動入力）</span></label>
            <div className="relative">
              <input className={`${inputCls} text-gray-400`} value={prefecture} readOnly placeholder="郵便番号で検索" />
              {!shop?.street_address && prefecture && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                  ⚙️
                </span>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}><span className="text-sm">📍</span> 市区郡 <span className="text-gray-300">（郵便番号から自動入力）</span></label>
            <div className="relative">
              <input className={`${inputCls} text-gray-400`} value={city} readOnly placeholder="郵便番号で検索" />
              {!shop?.street_address && city && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                  ⚙️
                </span>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}><span className="text-sm">📍</span> 番地・建物名<span className="text-red-500">※</span></label>
            <div className="relative">
              <input className={inputCls} value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="天神1-1-1 〇〇ビル2F" />
              {!shop?.street_address && streetAddress && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                  ⚙️
                </span>
              )}
            </div>
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
            <label className={labelCls}><span className="text-sm">📍</span> 電話番号<span className="text-red-500">※</span></label>
            <div className="relative">
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="000-0000-0000" />
              {(() => {
                let dfData = shop?.dataforce_response;
                if (typeof dfData === 'string') {
                  try {
                    dfData = JSON.parse(dfData);
                  } catch (e) {
                    dfData = {};
                  }
                }
                return dfData?.phone ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                    ⚙️
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div>
            <label className={labelCls}>Instagram URL</label>
            <input className={inputCls} value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/..." />
          </div>
          <div>
            <label className={labelCls}><span className="text-sm">📍</span> Googleマップ URL</label>
            <input className={inputCls} value={googleMapUrl} onChange={(e) => setGoogleMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
          </div>
          <div>
            <label className={labelCls}>予約URL</label>
            <input className={inputCls} value={metadata["reservation_url"] || ""} onChange={(e) => setMetadata({...metadata, reservation_url: e.target.value})} placeholder="https://..." />
          </div>

          {/* その他のURL */}
          <div>
            <label className={labelCls}>その他のURL</label>
            <div className="space-y-2">
              {(Array.isArray(metadata["other_urls"]) ? metadata["other_urls"] : []).map((url: string, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...(Array.isArray(metadata["other_urls"]) ? metadata["other_urls"] : [])];
                      newUrls[idx] = e.target.value;
                      setMetadata({...metadata, other_urls: newUrls});
                    }}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newUrls = (Array.isArray(metadata["other_urls"]) ? metadata["other_urls"] : []).filter((_, i) => i !== idx);
                      setMetadata({...metadata, other_urls: newUrls});
                    }}
                    className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-200"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newUrls = [...(Array.isArray(metadata["other_urls"]) ? metadata["other_urls"] : []), ""];
                  setMetadata({...metadata, other_urls: newUrls});
                }}
                className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 w-full"
              >
                ＋ URLを追加
              </button>
            </div>
          </div>
        </div>

        {/* ── カテゴリ別追加情報（JSON-LD用） ── */}
        {extraFields.length > 0 && (
          <>
            <SectionLabel dark>追加情報 <span className="normal-case text-gray-400 font-normal">検索エンジンに活用</span></SectionLabel>
            <div className="space-y-2">
              {extraFields.map((f) => (
                <div key={f.key}>
                  <label className={labelCls}>{["menu_url", "price_range"].includes(f.key) && <span className="text-sm">📍</span>} {f.label}</label>
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
        <SectionLabel dark meoIcon>営業時間 <span className="text-red-500">※</span></SectionLabel>
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
                {f.type === "boolean" ? (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm flex-1">
                      <input
                        type="checkbox"
                        checked={!!facilities[f.key]}
                        onChange={(e) =>
                          setFacilities({ ...facilities, [f.key]: e.target.checked })
                        }
                        className="accent-black"
                      />
                      {f.label}
                    </label>
                    {showRemove && (
                      <button type="button" onClick={showRemove} className="text-gray-300 text-xs">✕</button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500">{f.label}</p>
                      {showRemove && (
                        <button type="button" onClick={showRemove} className="text-gray-300 text-xs">✕</button>
                      )}
                    </div>

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
                  </>
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

        {/* ── よくある質問 ── */}
        <SectionLabel dark meoIcon>よくある質問</SectionLabel>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-start gap-2 mb-2">
                <input
                  type="text"
                  className={`${inputCls} flex-1`}
                  value={faq.name || ""}
                  onChange={(e) => {
                    const updated = [...faqs];
                    updated[index].name = e.target.value;
                    setFaqs(updated);
                  }}
                  placeholder="質問を入力（例：駐車場はありますか？）"
                />
                <button
                  type="button"
                  onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                  className="text-gray-400 text-sm py-3"
                >
                  ✕
                </button>
              </div>
              <textarea
                className={`${inputCls} resize-none w-full`}
                rows={2}
                value={faq.acceptedAnswer?.text || ""}
                onChange={(e) => {
                  const updated = [...faqs];
                  updated[index].acceptedAnswer = { "@type": "Answer", text: e.target.value };
                  setFaqs(updated);
                }}
                placeholder="回答を入力（例：無料駐車場30台完備）"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFaqs([...faqs, { "@type": "Question", name: "", acceptedAnswer: { "@type": "Answer", text: "" } }]);
            }}
            className="w-full border border-gray-300 bg-gray-50 text-gray-700 text-sm py-3 rounded-xl"
          >
            + 質問を追加
          </button>
        </div>

        {/* 削除 */}
        <div className="pt-10 pb-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-red-500 text-sm py-3"
          >
            この店舗を削除する
          </button>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4 text-red-600">店舗情報を削除しますか？</h3>
            <div className="text-sm text-gray-700 whitespace-pre-line mb-6">
              削除すると入力されたデータ及び
ランクデータの復旧ができません。
本当に店舗情報を削除されますか？

また、すでにお支払いいただいた
月額料金の返金は致しかねます。

（期間内であれば、新規店舗の登録は可能です）
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 凡例ボタン（右下固定） */}
      <button
        onClick={() => setShowLegend(!showLegend)}
        className="fixed bottom-8 right-4 bg-yellow-400 text-black text-xs px-3 py-2 rounded-lg font-semibold"
      >
        📍 マークの意味
      </button>

      {/* 凡例ポップアップ */}
      {showLegend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">マークの意味</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-semibold">MEOに効果的な項目</p>
                  <p className="text-gray-600">Google マップ検索結果に反映される重要な情報</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-lg">⚙️</span>
                <div>
                  <p className="font-semibold">Google Business Profile から自動取得</p>
                  <p className="text-gray-600">GBP登録情報から自動入力されたデータ</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-lg">※</span>
                <div>
                  <p className="font-semibold">必須項目</p>
                  <p className="text-gray-600">保存するために必ず入力が必要</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              className="w-full mt-6 bg-black text-white font-bold py-2 rounded-lg"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Footers */}
      <Footer />
    </div>
  );
}
