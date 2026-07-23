"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Field, inputClass } from "../admin/ListingFields";
import type { ComplexOption } from "../lib/naverImport";

interface FormState {
  complexName: string;
  building: string;
  floor: string;
  transactionType: "매매" | "전세" | "월세";
  desiredPriceLabel: string;
  occupancyStatus: string;
  interiorCondition: string;
  moveOutDate: string;
  viewingAvailability: string;
  notes: string;
  contactName: string;
  contactPhone: string;
}

const EMPTY_FORM: FormState = {
  complexName: "",
  building: "",
  floor: "",
  transactionType: "매매",
  desiredPriceLabel: "",
  occupancyStatus: "",
  interiorCondition: "",
  moveOutDate: "",
  viewingAvailability: "",
  notes: "",
  contactName: "",
  contactPhone: "",
};

const selectClass =
  "rounded-md border border-navy-900/15 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500";

export default function SellPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [complexOptions, setComplexOptions] = useState<ComplexOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadComplexOptions() {
      try {
        const response = await fetch("/api/complexes");
        const data = await response.json();
        if (!cancelled && response.ok) {
          setComplexOptions(data.complexOptions as ComplexOption[]);
        }
      } catch {
        // 단지명 자동완성이 없어도 직접 입력은 계속 가능합니다.
      }
    }

    loadComplexOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors(null);

    try {
      const response = await fetch("/api/listing-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          floor: form.floor.trim() === "" ? undefined : Number(form.floor),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? [data.error ?? "접수에 실패했습니다."]);
        return;
      }

      setDone(true);
    } catch {
      setErrors(["네트워크 오류로 접수에 실패했습니다. 다시 시도해주세요."]);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-sm font-semibold text-gold-600">접수 완료</p>
        <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
          매물 접수가 완료되었습니다.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
          담당자가 확인 후 빠르게 연락드리겠습니다.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">
          SELL
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          매물 내놓기
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
          아래 내용을 남겨주시면 호수공인중개사사무소 담당자가 빠르게
          연락드립니다.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-navy-900/10 p-6 sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="단지명" full>
              <input
                required
                list="complex-name-options"
                value={form.complexName}
                onChange={(event) =>
                  updateField("complexName", event.target.value)
                }
                placeholder="예: 호수마을e편한세상2단지"
                className={inputClass}
              />
              <datalist id="complex-name-options">
                {complexOptions.map((option) => (
                  <option key={option.id} value={option.name} />
                ))}
              </datalist>
            </Field>

            <Field label="동 (선택)">
              <input
                value={form.building}
                onChange={(event) => updateField("building", event.target.value)}
                placeholder="예: 201동"
                className={inputClass}
              />
            </Field>

            <Field label="층 (선택)">
              <input
                type="number"
                value={form.floor}
                onChange={(event) => updateField("floor", event.target.value)}
                placeholder="예: 6"
                className={inputClass}
              />
            </Field>

            <Field label="거래유형">
              <select
                value={form.transactionType}
                onChange={(event) =>
                  updateField(
                    "transactionType",
                    event.target.value as FormState["transactionType"],
                  )
                }
                className={selectClass}
              >
                <option value="매매">매매</option>
                <option value="전세">전세</option>
                <option value="월세">월세</option>
              </select>
            </Field>

            <Field label="희망가">
              <input
                required
                value={form.desiredPriceLabel}
                onChange={(event) =>
                  updateField("desiredPriceLabel", event.target.value)
                }
                placeholder="예: 4억 2,000만원"
                className={inputClass}
              />
            </Field>

            <Field label="집주인 거주 여부 (선택)">
              <input
                value={form.occupancyStatus}
                onChange={(event) =>
                  updateField("occupancyStatus", event.target.value)
                }
                placeholder="예: 집주인 거주"
                className={inputClass}
              />
            </Field>

            <Field label="인테리어 상태 (선택)">
              <input
                value={form.interiorCondition}
                onChange={(event) =>
                  updateField("interiorCondition", event.target.value)
                }
                placeholder="예: 부분 인테리어"
                className={inputClass}
              />
            </Field>

            <Field label="이사 가능 시기 (선택)">
              <input
                value={form.moveOutDate}
                onChange={(event) =>
                  updateField("moveOutDate", event.target.value)
                }
                placeholder="예: 9월 말"
                className={inputClass}
              />
            </Field>

            <Field label="집보기 가능 시간 (선택)">
              <input
                value={form.viewingAvailability}
                onChange={(event) =>
                  updateField("viewingAvailability", event.target.value)
                }
                placeholder="예: 평일 오후 6시 이후"
                className={inputClass}
              />
            </Field>

            <Field label="기타 메모 (선택)" full>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
                className={inputClass}
              />
            </Field>

            <Field label="이름">
              <input
                required
                value={form.contactName}
                onChange={(event) =>
                  updateField("contactName", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="연락처">
              <input
                required
                type="tel"
                value={form.contactPhone}
                onChange={(event) =>
                  updateField("contactPhone", event.target.value)
                }
                placeholder="010-0000-0000"
                className={inputClass}
              />
            </Field>
          </div>

          {errors && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <ul className="list-disc space-y-0.5 pl-4">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-3 text-sm font-bold text-navy-950 shadow-md shadow-gold-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "접수 중..." : "접수하기"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
