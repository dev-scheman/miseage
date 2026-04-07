"use client";

import HeaderSimple from "@/components/HeaderSimple";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderSimple />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-xl text-gray-600">ページが見つかりません</p>
            <p className="text-sm text-gray-500">
              申し訳ありません。お探しのページは存在しません。
            </p>
          </div>

          <a
            href="/"
            className="inline-block w-full bg-black text-white py-3 rounded-lg font-semibold hover:opacity-90"
          >
            トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
