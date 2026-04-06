"use client";

export default function Footer() {
  return (
    <div className="border-t bg-gray-50 px-4 py-8">
      <div className="max-w-xl mx-auto flex flex-wrap gap-4 justify-center text-xs text-gray-500">
        <a href="/privacy" className="hover:text-gray-700">プライバシーポリシー</a>
        <span>|</span>
        <a href="/terms" className="hover:text-gray-700">利用規約</a>
        <span>|</span>
        <a href="/legal" className="hover:text-gray-700">特定商取引法</a>
        <span>|</span>
        <a href="/contact" className="hover:text-gray-700">お問い合わせ</a>
      </div>
    </div>
  );
}
