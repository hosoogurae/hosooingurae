import { NextResponse } from "next/server";
import { getAllComplexes } from "../../../../lib/complexes";

const OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

/**
 * 고정확도 모드의 전사 모델. 2026-07-28/29 OpenAI 발표 기준 실시간 전사
 * 기본 모델(WER이 이전 gpt-4o-transcribe 대비 크게 낮음). 필요하면 이
 * 값만 바꿔 교체합니다.
 */
const TRANSCRIPTION_MODEL = "gpt-live-transcribe";

/**
 * 도메인 어휘 힌트(prompt). 부동산 중개 상담에서 자주 나오는 용어를
 * 미리 알려주면 인식률이 올라갑니다(OpenAI 공식 문서의 prompt/keywords
 * 힌트 기능).
 */
const TRANSCRIPTION_PROMPT =
  "부동산 공인중개사 사무실의 대면 상담입니다. 아파트명, 단지명, 동, 호수, " +
  "전화번호, 매매가, 전세가, 보증금, 월세, 평형, 입주일, 구래동·장기동·마산동 " +
  "등 김포 지역명이 자주 등장합니다.";

/** keywords로 보낼 수 있는 단지명 개수/길이 상한 — 과도하게 큰 요청 방지. */
const MAX_KEYWORDS = 100;
const MAX_KEYWORDS_TOTAL_CHARS = 2000;

/**
 * 등록된 단지명을 중복 제거·공백 제거한 뒤 keywords 배열로 만듭니다.
 * 실패해도(예: DB 연결 안 됨) 빈 배열을 반환할 뿐 토큰 발급 자체를
 * 막지 않습니다 — 어휘 힌트는 "있으면 도움" 수준의 보조 기능입니다.
 */
async function buildComplexNameKeywords(): Promise<string[]> {
  try {
    const complexes = await getAllComplexes();
    const seen = new Set<string>();
    const keywords: string[] = [];
    let totalChars = 0;

    for (const complex of complexes) {
      const name = complex.name.trim();
      if (!name || seen.has(name)) continue;
      if (keywords.length >= MAX_KEYWORDS) break;
      if (totalChars + name.length > MAX_KEYWORDS_TOTAL_CHARS) break;

      seen.add(name);
      keywords.push(name);
      totalChars += name.length;
    }

    return keywords;
  } catch (error) {
    console.error("[consult-helper/realtime-token] 단지명 목록 조회 실패", error);
    return [];
  }
}

/**
 * 고정확도 모드(OpenAI Realtime) 전용 임시 토큰 발급.
 *
 * 실제 OPENAI_API_KEY는 이 서버 라우트 밖으로 절대 나가지 않습니다 —
 * 브라우저에는 몇 분짜리 임시 토큰(ek_...)만 내려주고, 그걸로 브라우저가
 * OpenAI와 직접 WebRTC 연결을 맺습니다. 이 경로가 /api/admin/ 아래에 있어
 * proxy.ts 미들웨어가 이미 관리자 세션(쿠키/Bearer)을 요구하므로, 이
 * 라우트 자체에는 별도 인증 코드를 두지 않습니다.
 *
 * turn_detection은 의도적으로 보내지 않습니다 — 실제 호출 결과
 * gpt-live-transcribe가 "Turn detection is not supported for this
 * transcription model."(400, param: session.audio.input.turn_detection)로
 * 거부하는 것을 확인했습니다.
 */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[consult-helper/realtime-token] OPENAI_API_KEY가 설정되어 있지 않습니다.");
    return NextResponse.json(
      { error: "고정확도 모드가 아직 설정되지 않았습니다. 관리자에게 문의해주세요." },
      { status: 500 },
    );
  }

  const keywords = await buildComplexNameKeywords();

  try {
    const response = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "transcription",
          // 공식 Client Secrets 스키마(developers.openai.com/api/reference/
          // resources/realtime/subresources/client_secrets) 기준 — 전사 관련
          // 설정은 session 바로 아래가 아니라 session.audio.input 밑에
          // 중첩됩니다. language(단수)는 넣지 않고 languages(복수)만 씁니다
          // ("Don't send both" — 같은 공식 가이드 문서 본문).
          audio: {
            input: {
              transcription: {
                model: TRANSCRIPTION_MODEL,
                languages: ["ko"],
                prompt: TRANSCRIPTION_PROMPT,
                ...(keywords.length > 0 ? { keywords } : {}),
              },
              noise_reduction: {
                // 사무실 데스크 위 노트북 마이크로 상담하는 상황을 기본값으로 가정합니다.
                type: "far_field",
              },
              // turn_detection 필드 없음(위 함수 주석 참고).
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        "[consult-helper/realtime-token] OpenAI 토큰 발급 실패",
        response.status,
        detail,
      );
      // 관리자 화면에서 원인을 바로 알 수 있도록 OpenAI가 응답한 HTTP
      // 상태코드는 그대로 노출합니다(요청 바디 전체나 API 키 등 민감한
      // 내용은 포함하지 않고, 상태코드 + 서버 로그 확인 안내만 전달).
      return NextResponse.json(
        {
          error: `고정확도 모드 연결에 실패했습니다. (OpenAI 응답 코드 ${response.status} — 서버 로그에서 자세한 원인을 확인하세요.)`,
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const clientSecret = data?.value;
    if (typeof clientSecret !== "string") {
      console.error("[consult-helper/realtime-token] 예상치 못한 응답 형식", data);
      return NextResponse.json(
        {
          error:
            "고정확도 모드 연결에 실패했습니다. (OpenAI 응답 형식이 예상과 달랐습니다 — 서버 로그를 확인하세요.)",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      clientSecret,
      modelLabel: TRANSCRIPTION_MODEL,
    });
  } catch (error) {
    console.error("[consult-helper/realtime-token] 요청 실패", error);
    // fetch 자체가 실패한 경우(네트워크 문제 등) — OpenAI HTTP 상태는 없지만
    // 최소한 무엇이 문제였는지(네트워크/DNS 등) 구분할 실마리는 남깁니다.
    const reason = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `고정확도 모드 연결에 실패했습니다. (${reason})` },
      { status: 502 },
    );
  }
}
