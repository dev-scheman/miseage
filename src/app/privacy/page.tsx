"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
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
        <h1 className="text-3xl font-bold">プライバシーポリシー</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. 個人情報の取得</h2>
            <p className="text-gray-700">
              MiseAgeは、お客様からご提供いただく個人情報を、ユーザー認証、サービス提供、サポート対応などの目的で取得いたします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 個人情報の利用</h2>
            <p className="text-gray-700">
              取得した個人情報は以下の目的で利用します：
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>サービスの提供・維持・改善</li>
              <li>ユーザーサポート</li>
              <li>お知らせ・ご連絡</li>
              <li>課金・決済処理</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 個人情報の保護</h2>
            <p className="text-gray-700">
              お客様の個人情報を保護するため、適切なセキュリティ対策を実施いたします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 第三者提供</h2>
            <p className="text-gray-700">
              個人情報は、法律に基づく場合を除き、お客様の同意なしに第三者に提供いたしません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 問い合わせ</h2>
            <p className="text-gray-700">
              個人情報の取扱いについてご質問やご不明な点がありましたら、<a href="/contact" className="text-blue-600">お問い合わせ</a>ください。
            </p>
          </section>
        </div>

        <p className="text-sm text-gray-500 pt-8 border-t">
          最終更新日：{new Date().getFullYear()}年
        </p>
      </div>
    </div>
  );
}
