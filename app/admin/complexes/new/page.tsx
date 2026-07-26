"use client";

import { useRouter } from "next/navigation";
import type { ComplexFieldsInput } from "../../../lib/complexValidation";
import ComplexForm from "../ComplexForm";

export default function NewComplexPage() {
  const router = useRouter();

  async function handleCreate(input: ComplexFieldsInput): Promise<{ error?: string }> {
    try {
      const response = await fetch("/api/admin/complexes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.errors?.[0] ?? "단지 생성에 실패했습니다." };
      }
      router.push(`/admin/complexes/${data.complex.id}/edit`);
      return {};
    } catch {
      return { error: "네트워크 오류가 발생했습니다." };
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        새 단지 등록
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        단지명만 입력해도 등록할 수 있습니다. 나머지 정보와 평면 타입은 등록 후
        이어지는 화면에서 언제든 채울 수 있습니다.
      </p>

      <div className="mt-8">
        <ComplexForm onSubmit={handleCreate} submitLabel="단지 등록" />
      </div>
    </div>
  );
}
