// 사용법: node scripts/generate-admin-password-hash.mjs
// 화면에 뜨는 안내대로 새 비밀번호를 입력하면(입력 내용은 표시되지 않습니다)
// .env.local의 ADMIN_PASSWORD_HASH= 줄을 직접 갱신합니다(기존 줄이 있으면
// 교체, 없으면 추가). 복사·붙여넣기 과정에서 값이 잘리는 문제를 없애기
// 위해 해시 자체는 화면에 출력하지 않습니다 — 완료 메시지만 뜹니다.
// 비밀번호는 어떤 파일에도 저장하지 않습니다.
// 인자로 비밀번호를 넘기지 않는 이유: 커맨드라인 인자는 셸 히스토리에
// 그대로 남으므로, 반드시 화면에 안 보이는 입력 프롬프트로만 받습니다.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL_PATH = path.resolve(__dirname, "..", ".env.local");

// 영문·숫자·일반 기호(공백~물결, ASCII 0x20~0x7E)만 허용합니다. 한글·전각
// 문자 등이 섞이면(예: VAPID_SUBJECT에 전각 마침표 。가 들어갔던 사고)
// .env 파일에서 깨지거나 다른 도구가 오해석할 수 있어 미리 막습니다.
const ASCII_ONLY = /^[\x20-\x7E]+$/;

const KEY_ENTER = "\n";
const KEY_CR = "\r";
const KEY_EOF = String.fromCharCode(4); // Ctrl+D
const KEY_SIGINT = String.fromCharCode(3); // Ctrl+C
const KEY_DEL = String.fromCharCode(127); // Backspace (대부분의 터미널)
const KEY_BS = "\b";

/**
 * 비밀번호를 두 번 입력받아 오타를 확인하므로 stdin 리더 하나를
 * 재사용합니다. 파이프 입력이나 붙여넣기처럼 한 chunk에 여러 줄이 함께
 * 들어오는 경우를 대비해, 완성된 줄은 큐에 쌓아뒀다가 readLine() 호출
 * 순서대로 꺼내 씁니다.
 */
class HiddenLineReader {
  constructor() {
    this.stdin = process.stdin;
    this.wasRaw = this.stdin.isRaw;
    if (this.stdin.isTTY) this.stdin.setRawMode(true);
    this.stdin.resume();
    this.stdin.setEncoding("utf8");

    this.partial = "";
    this.completedLines = [];
    this.pendingResolve = null;

    this.onData = this.onData.bind(this);
    this.stdin.on("data", this.onData);
  }

  onData(chunk) {
    for (const ch of chunk.toString()) {
      if (ch === KEY_SIGINT) {
        process.stdout.write("\n");
        process.exit(130);
      }
      if (ch === KEY_ENTER || ch === KEY_CR || ch === KEY_EOF) {
        this.completedLines.push(this.partial);
        this.partial = "";
        this.flush();
        continue;
      }
      if (ch === KEY_DEL || ch === KEY_BS) {
        this.partial = this.partial.slice(0, -1);
      } else {
        this.partial += ch;
      }
    }
  }

  flush() {
    if (this.pendingResolve && this.completedLines.length > 0) {
      const line = this.completedLines.shift();
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      process.stdout.write("\n");
      resolve(line);
    }
  }

  readLine(question) {
    process.stdout.write(question);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.flush();
    });
  }

  close() {
    this.stdin.removeListener("data", this.onData);
    if (this.stdin.isTTY) this.stdin.setRawMode(this.wasRaw ?? false);
    this.stdin.pause();
  }
}

/**
 * .env.local의 ADMIN_PASSWORD_HASH= 줄만 교체(없으면 추가)하고, 나머지
 * 줄과 줄바꿈 스타일(CRLF/LF)은 그대로 보존합니다.
 */
function writeHashToEnvLocal(hash) {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error(`.env.local 파일을 찾을 수 없습니다: ${ENV_LOCAL_PATH}`);
  }

  const original = fs.readFileSync(ENV_LOCAL_PATH, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r\n|\n/);

  const targetIndex = lines.findIndex((line) =>
    /^ADMIN_PASSWORD_HASH=/.test(line),
  );
  const newLine = `ADMIN_PASSWORD_HASH=${hash}`;

  if (targetIndex !== -1) {
    lines[targetIndex] = newLine;
  } else {
    // 마지막 줄이 빈 줄(파일이 개행으로 끝남)이면 그 앞에 추가합니다.
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.splice(lines.length - 1, 0, newLine);
    } else {
      lines.push(newLine);
    }
  }

  fs.writeFileSync(ENV_LOCAL_PATH, lines.join(eol));
  return targetIndex !== -1 ? "replaced" : "appended";
}

async function main() {
  const reader = new HiddenLineReader();

  const password = await reader.readLine(
    "새 관리자 비밀번호 입력(화면에 표시되지 않습니다): ",
  );
  if (!password) {
    reader.close();
    console.error("비밀번호가 비어 있습니다.");
    process.exitCode = 1;
    return;
  }

  if (!ASCII_ONLY.test(password)) {
    reader.close();
    console.error(
      "허용되지 않는 문자가 포함되어 있습니다(한글·전각 문자 등). " +
        "영문·숫자·일반 기호(예: ! @ # $ % ^ & * - _ =)만 사용해주세요.",
    );
    process.exitCode = 1;
    return;
  }

  const confirm = await reader.readLine("확인을 위해 한 번 더 입력: ");
  reader.close();

  if (password !== confirm) {
    console.error("두 번 입력한 값이 서로 다릅니다. 다시 실행해주세요.");
    process.exitCode = 1;
    return;
  }

  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  const hash = `${salt.toString("hex")}:${key.toString("hex")}`;

  let action;
  try {
    action = writeHashToEnvLocal(hash);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "해시를 .env.local에 쓰지 못했습니다.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    action === "replaced"
      ? "\n.env.local의 ADMIN_PASSWORD_HASH 값을 새 비밀번호로 교체했습니다."
      : "\n.env.local에 ADMIN_PASSWORD_HASH 줄을 새로 추가했습니다.",
  );
  console.log(
    "Vercel에도 반영하려면 .env.local을 열어 ADMIN_PASSWORD_HASH 값을 복사한 뒤 " +
      "프로젝트 환경변수에 등록해주세요(자동 반영되지 않습니다).",
  );
}

main();
