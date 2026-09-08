/**
 * 전화번호 비교/저장용 정규화 — 숫자만 남깁니다("010-1234-5678" → "01012345678").
 * 표기가 달라도(하이픈 유무, 공백 등) 같은 번호면 같은 값으로 비교되게 하기
 * 위함이며, 화면에 보여줄 때는 원본 표기를 그대로 쓰고 이 값은 저장/비교
 * 용도로만 씁니다.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Contact Picker 등 외부에서 들어오는 표기가 제각각인 휴대폰 번호("+82
 * 10-1234-5678", "010 1234 5678", "010.1234.5678" 등)를 "010-1234-5678"
 * 형태(하이픈 구분)로 통일합니다.
 *
 * 국내 이동통신 번호(0으로 시작하는 010/011/016/017/018/019, 즉 "01"로
 * 시작하는 10~11자리)만 하이픈을 넣어 재구성합니다. 그 외(국번을 알 수
 * 없는 유선전화, 자릿수가 안 맞는 값 등)는 숫자만 남긴 값을 그대로
 * 돌려줍니다 — 자릿수를 잘못 추측해 없는 하이픈 구분을 지어내지 않기
 * 위함입니다(예: 02 유선전화는 지역번호가 2자리라 010과 같은 규칙을
 * 적용할 수 없음).
 */
export function formatPhoneNumber(raw: string): string {
  let digits = normalizePhone(raw);
  if (!digits) return "";

  // "+82 10-1234-5678" / "82 10 1234 5678" → 국내 표기(0으로 시작)로 되돌립니다.
  // 국가코드 뒤에 남는 자리수가 9(구형 10자리 번호)~10(11자리 번호)이므로
  // "82" 포함 전체 길이는 11~12자리입니다.
  if (digits.startsWith("82") && digits.length >= 11 && digits.length <= 12) {
    digits = `0${digits.slice(2)}`;
  }

  if (!digits.startsWith("01")) return digits;

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}
