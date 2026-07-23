"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

const EXAMPLE_QUERIES = ["4억 이하 아파트", "바로 입주", "고층", "월세 오피스텔"];

export default function RecommendSearchBox({
  initialQuery = "",
  size = "large",
}: {
  initialQuery?: string;
  size?: "large" | "compact";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function goToResults(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/recommend?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    goToResults(query);
  }

  function handleExampleClick(example: string) {
    setQuery(example);
    goToResults(example);
  }

  const isLarge = size === "large";

  return (
    <div className={isLarge ? "mx-auto max-w-2xl" : "w-full"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-800/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 4억 초반, 고층, 바로 입주 가능한 아파트"
            className={`w-full rounded-full border border-navy-900/15 bg-white pl-12 pr-4 text-navy-900 outline-none focus:border-gold-500 ${
              isLarge ? "py-4 text-base sm:text-lg" : "py-3 text-sm"
            }`}
          />
        </div>
        <button
          type="submit"
          className={`rounded-full bg-gradient-to-r from-gold-500 to-gold-600 font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.02] ${
            isLarge ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"
          }`}
        >
          검색
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExampleClick(example)}
            className="rounded-full border border-navy-900/15 px-4 py-2 text-xs font-semibold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600 sm:text-sm"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
