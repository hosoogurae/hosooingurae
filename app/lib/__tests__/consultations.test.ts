import { describe, expect, it } from "vitest";
import {
  consultationRowToConsultation,
  consultationUpdateToRowPatch,
  extractedFieldRowToField,
} from "../supabase/mappers";

const BASE_ROW = {
  id: "consult-1",
  customer_id: "customer-1",
  started_at: "2026-07-29T09:00:00.000Z",
  ended_at: null,
  duration_seconds: null,
  mode: "manual" as const,
  status: "in_progress" as const,
  transcript: null,
  corrected_transcript: null,
  summary: null,
  extracted_conditions: {},
  uncertain_fields: [],
  follow_up_tasks: [],
  sms_draft: null,
  internal_memo: null,
  tags: [],
  created_by: null,
  created_at: "2026-07-29T09:00:00.000Z",
  updated_at: "2026-07-29T09:00:00.000Z",
};

describe("consultationRowToConsultation — 태그/희망조건 jsonb 왕복", () => {
  it("tags 배열을 그대로 옮긴다", () => {
    const consultation = consultationRowToConsultation({ ...BASE_ROW, tags: ["반려동물", "재방문"] });
    expect(consultation.tags).toEqual(["반려동물", "재방문"]);
  });

  it("tags가 없으면(null) 빈 배열로 기본값을 채운다", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consultation = consultationRowToConsultation({ ...BASE_ROW, tags: null as any });
    expect(consultation.tags).toEqual([]);
  });

  it("extracted_conditions은 숫자·배열·객체 등 다양한 JSON 값을 그대로 보존한다", () => {
    const consultation = consultationRowToConsultation({
      ...BASE_ROW,
      extracted_conditions: { price: 43000, options: ["에어컨", "붙박이장"], range: { min: 40000, max: 45000 } },
    });
    expect(consultation.extractedConditions).toEqual({
      price: 43000,
      options: ["에어컨", "붙박이장"],
      range: { min: 40000, max: 45000 },
    });
  });
});

describe("extractedFieldRowToField — field_value(jsonb) 통과", () => {
  it("문자열이 아닌 값(숫자/배열/객체)도 그대로 통과시킨다", () => {
    const numberField = extractedFieldRowToField({
      id: "f1",
      consultation_id: "consult-1",
      field_key: "price",
      field_value: 43000,
      confidence: "confirmed",
      created_at: "2026-07-29T09:00:00.000Z",
      updated_at: "2026-07-29T09:00:00.000Z",
    });
    expect(numberField.fieldValue).toBe(43000);

    const arrayField = extractedFieldRowToField({
      id: "f2",
      consultation_id: "consult-1",
      field_key: "options",
      field_value: ["에어컨", "붙박이장"],
      confidence: "uncertain",
      created_at: "2026-07-29T09:00:00.000Z",
      updated_at: "2026-07-29T09:00:00.000Z",
    });
    expect(arrayField.fieldValue).toEqual(["에어컨", "붙박이장"]);
    expect(arrayField.confidence).toBe("uncertain");
  });
});

describe("consultationUpdateToRowPatch — 부분 갱신 + 태그", () => {
  it("tags가 주어지면 patch에 포함하고, 없으면 포함하지 않는다", () => {
    expect(consultationUpdateToRowPatch({ tags: ["급매"] })).toEqual({ tags: ["급매"] });
    expect(consultationUpdateToRowPatch({})).toEqual({});
  });

  it("customerId를 undefined로 두면(값을 안 보내면) patch에 아예 포함하지 않는다", () => {
    expect(consultationUpdateToRowPatch({ customerId: undefined })).toEqual({});
  });

  it("customerId가 실제 값이면 customer_id로 그대로 옮긴다", () => {
    expect(consultationUpdateToRowPatch({ customerId: "customer-1" })).toEqual({
      customer_id: "customer-1",
    });
  });
});
