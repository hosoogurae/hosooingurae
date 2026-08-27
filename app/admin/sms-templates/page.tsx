"use client";

import { useEffect, useState } from "react";
import type { AdminSmsTemplate } from "../../lib/smsTemplates";
import { DEFAULT_SMS_TEMPLATES } from "../../lib/smsTemplateText";

type EditingState = { mode: "new" | "edit"; id?: string; name: string; body: string } | null;

export default function AdminSmsTemplatesPage() {
  const [templates, setTemplates] = useState<AdminSmsTemplate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/admin/sms-templates");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "내 양식을 불러오지 못했습니다.");
      }
      setTemplates(data.templates as AdminSmsTemplate[]);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/sms-templates");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.errors?.[0] ?? "내 양식을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setTemplates(data.templates as AdminSmsTemplate[]);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openNew() {
    setEditing({ mode: "new", name: "", body: "" });
    setSaveError(null);
  }

  function openEdit(template: AdminSmsTemplate) {
    setEditing({ mode: "edit", id: template.id, name: template.name, body: template.body });
    setSaveError(null);
  }

  /** 기본 양식을 시작점으로 "내 양식"에 복사합니다 — 문구를 처음부터 안 써도 됩니다. */
  function copyDefaultAsNew(defaultTemplate: { label: string; body: string }) {
    setEditing({ mode: "new", name: `${defaultTemplate.label} (내 양식)`, body: defaultTemplate.body });
    setSaveError(null);
  }

  async function handleSave() {
    if (!editing) return;
    const name = editing.name.trim();
    const body = editing.body.trim();
    if (!name || !body) {
      setSaveError("양식 이름과 내용을 모두 입력해주세요.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        editing.mode === "new"
          ? "/api/admin/sms-templates"
          : `/api/admin/sms-templates/${editing.id}`,
        {
          method: editing.mode === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, body }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "저장에 실패했습니다.");
      }
      setEditing(null);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 양식을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/sms-templates/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0] ?? "삭제에 실패했습니다.");
      }
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">ADMIN</p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">문자양식</h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/70">
        고객에게 보낼 문자 문구를 미리 만들어두고, 문자 작성 화면에서 골라 쓸 수
        있습니다.
      </p>

      <div className="mt-5 rounded-xl border border-gold-500/40 bg-gold-500/5 px-4 py-4 text-sm leading-relaxed text-navy-900">
        상담한 손님에게 보내는 안내 문자와 달리, 매물 홍보 문자를 여러 명에게
        보낼 때는 사전 수신동의·(광고) 표기·야간(21~08시) 발송 금지가
        적용됩니다.
      </div>

      {/* 기본 제공 양식 */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-navy-950">기본 제공 양식</h2>
        <p className="mt-1 text-xs text-navy-800/50">
          바로 쓰거나, 복사해서 내 양식으로 고쳐 쓸 수 있습니다.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {DEFAULT_SMS_TEMPLATES.map((template) => (
            <li
              key={template.id}
              className="rounded-xl border border-navy-900/10 bg-white p-4"
            >
              <p className="text-sm font-bold text-navy-950">{template.label}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy-800/70">
                {template.body}
              </p>
              <button
                type="button"
                onClick={() => copyDefaultAsNew(template)}
                className="mt-3 min-h-[44px] rounded-lg border border-navy-900/15 px-4 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
              >
                복사해서 내 양식으로 만들기
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 내 양식 */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-950">내 양식</h2>
          <button
            type="button"
            onClick={openNew}
            className="min-h-[48px] rounded-lg bg-navy-950 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-900"
          >
            + 새 양식 만들기
          </button>
        </div>

        {loadError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {loadError}
          </p>
        )}

        {templates === null && !loadError && (
          <p className="mt-4 text-sm text-navy-800/50">불러오는 중...</p>
        )}

        {templates !== null && templates.length === 0 && !loadError && (
          <p className="mt-4 rounded-xl border border-navy-900/10 px-6 py-10 text-center text-sm text-navy-800/50">
            아직 만든 양식이 없습니다.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-3">
          {(templates ?? []).map((template) => (
            <li key={template.id} className="rounded-xl border border-navy-900/10 bg-white p-4">
              <p className="text-sm font-bold text-navy-950">{template.name}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy-800/70">
                {template.body}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(template)}
                  className="min-h-[44px] flex-1 rounded-lg border border-navy-900/15 px-4 text-sm font-bold text-navy-800 transition-colors hover:border-gold-500 hover:text-gold-600"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingId === template.id}
                  className="min-h-[44px] flex-1 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === template.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 새 양식 만들기 / 수정 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h3 className="text-lg font-black text-navy-950">
              {editing.mode === "new" ? "새 양식 만들기" : "양식 수정"}
            </h3>

            <label className="mt-5 block text-sm font-bold text-navy-900">
              양식 이름
              <input
                value={editing.name}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
                placeholder="예: 계약 안내"
                className="mt-1.5 min-h-[48px] w-full rounded-lg border border-navy-900/15 px-3 text-base text-navy-900 outline-none focus:border-gold-500"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-navy-900">
              문자 내용
              <textarea
                value={editing.body}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, body: event.target.value } : prev))
                }
                placeholder="문자 내용을 입력해주세요"
                rows={8}
                className="mt-1.5 w-full rounded-lg border border-navy-900/15 px-3 py-2.5 text-base leading-relaxed text-navy-900 outline-none focus:border-gold-500"
              />
              <span className="mt-1.5 block text-xs font-normal text-navy-800/50">
                {"{단지명}"}, {"{매물주소}"}, {"{매물페이지URL}"}, {"{홈페이지URL}"},{" "}
                {"{부동산전화번호}"}처럼 중괄호 안에 이름을 넣으면, 문자 작성 화면에서 값이
                없을 때 그대로 남아 직접 채울 수 있습니다.
              </span>
            </label>

            {saveError && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[52px] flex-1 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-base font-bold text-navy-950 shadow-md shadow-gold-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[52px] flex-1 rounded-xl border border-navy-900/15 text-base font-bold text-navy-800"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
