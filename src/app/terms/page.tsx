"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold">利用規約</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. サービスの利用</h2>
            <p className="text-gray-700">
              本サービスを利用されるお客様は、本規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. ユーザーアカウント</h2>
            <p className="text-gray-700">
              お客様は、ご自身のアカウント情報を正確に保管する責任を負うものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 禁止事項</h2>
            <p className="text-gray-700">
              以下の行為は禁止いたします：
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>違法行為</li>
              <li>他のユーザーへの迷惑行為</li>
              <li>本サービスの不正利用</li>
              <li>著作権の侵害</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. サービス内容の変更</h2>
            <p className="text-gray-700">
              本サービスの内容は予告なく変更される場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 免責事項</h2>
            <p className="text-gray-700">
              本サービスの利用により生じた損害について、当社は責任を負わないものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. 規約の変更</h2>
            <p className="text-gray-700">
              本規約は予告なく変更される場合があります。
            </p>
          </section>
        </div>

        <p className="text-sm text-gray-500 pt-8 border-t">
          最終更新日：{new Date().getFullYear()}年
        </p>
      </div>
    </div>
    </>
  );
}
