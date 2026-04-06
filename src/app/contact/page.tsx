"use client";

import { useRouter } from "next/navigation";

export default function ContactPage() {
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
        <h1 className="text-3xl font-bold">お問い合わせ</h1>

        <div className="space-y-6">
          <p className="text-gray-700">
            MiseAge についてのご質問やご不明な点がございましたら、以下のいずれかの方法でお気軽にお問い合わせください。
          </p>

          <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="font-semibold mb-2">📧 メールでのお問い合わせ</h2>
              <a
                href="mailto:support@miseage.jp"
                className="text-blue-600 hover:text-blue-700 break-all"
              >
                support@miseage.jp
              </a>
            </div>

            <div className="border-t pt-4">
              <h2 className="font-semibold mb-2">💬 公式LINE</h2>
              <p className="text-sm text-gray-600">
                ただいま準備中です。今しばらくお待ちください。
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">GBPのご登録について</h3>
            <p className="text-sm text-blue-800">
              Googleビジネスプロフィール（GBP）の登録がまだお済みでない場合は、お気軽にお問い合わせください。<br />
              登録方法についてのご説明やサポートを承っています。
            </p>
          </div>

          <div className="pt-6 border-t">
            <p className="text-sm text-gray-500">
              通常、営業日の24時間以内にご返信させていただきます。
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
