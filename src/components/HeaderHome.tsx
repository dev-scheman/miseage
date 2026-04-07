"use client";

interface HeaderHomeProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchCompositionStart: () => void;
  onSearchCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
  prefecture: string | null;
  onPrefectureClick: () => void;
}

export default function HeaderHome({
  search,
  onSearchChange,
  onSearchCompositionStart,
  onSearchCompositionEnd,
  prefecture,
  onPrefectureClick,
}: HeaderHomeProps) {
  return (
    <div className="sticky top-0 bg-white z-10 space-y-2">
      {/* First row: MiseAge logo + Prefecture */}
      <div className="h-11 flex items-center px-4 gap-3">
        <div className="font-bold text-[20px]">MiseAge</div>
        <button
          onClick={onPrefectureClick}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {prefecture || "全国版"} ▼
        </button>
      </div>

      {/* Second row: Search input */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="店名で検索"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onCompositionStart={onSearchCompositionStart}
          onCompositionEnd={onSearchCompositionEnd}
        />
        <button className="border px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
          ⚙︎
        </button>
      </div>
    </div>
  );
}
