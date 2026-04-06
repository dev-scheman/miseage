"use client";

import { useRouter } from "next/navigation";
import Head from "next/head";

export default function LegalPage() {
  const router = useRouter();

  return (
    <>
      <head>
        <meta name="robots" content="noindex" />
      </head>
      <div className="min-h-screen bg-white text-black">
      <header className="border-b p-4">
        <button
          onClick={() => router.push("/")}
          className="font-bold text-lg hover:opacity-70"
        >
          MiseAge
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold">特定商取引法に基づく表示</h1>

        <div className="space-y-4 text-gray-700">
          <div className="grid grid-cols-3 gap-4 border rounded-lg p-4">
            <div>
              <p className="font-semibold">販売業者</p>
              <p className="text-sm">合同会社 Show Tech</p>
            </div>
            <div>
              <p className="font-semibold">代表者名</p>
              <p className="text-sm">大川将祉</p>
            </div>
            <div>
              <p className="font-semibold">住所</p>
              <p className="text-sm">福岡県久留米市日ノ出町15-701</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
            <div>
              <p className="font-semibold">電話番号</p>
              <p className="text-sm">090-4191-7089</p>
            </div>
            <div>
              <p className="font-semibold">メールアドレス</p>
              <p className="text-sm">support@miseage.jp</p>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">サービス内容</p>
            <p className="text-sm">ローカルビジネス向けMEO特化SaaS</p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">料金</p>
            <p className="text-sm">
              初めてご利用のユーザー様は、最初の店舗登録から<br />
              トライアルとして14日間無料でフル機能ご利用いただけます<br />
              その後は、1店舗登録毎に月500円のライセンス購入が必要です。
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">支払方法</p>
            <p className="text-sm">クレジットカード（Stripe決済）</p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">支払時期</p>
            <p className="text-sm">毎月の自動更新日に課金されます</p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">返品・キャンセル・解約方法</p>
            <p className="text-sm">
              サービスの性質上、お支払い後の返金・返品は承っておりません。<br />
              解約をご希望の場合は、いつでもマイページより解約手続きが可能です。
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold mb-2">その他の注意事項</p>
            <p className="text-sm">
              サービスの利用には Google OAuth による認証が必要です。<br />
              トライアル期間終了後、プランの選択がない場合は<br />
              MEOブースト等、有料機能が停止します（マイページのご利用は可能です）
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 pt-8 border-t">
          最終更新日：{new Date().getFullYear()}年
        </p>
      </div>
    </div>
    </>
  );
}
