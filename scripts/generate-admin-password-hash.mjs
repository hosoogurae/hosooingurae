// 사용법: node scripts/generate-admin-password-hash.mjs "실제 비밀번호"
// 출력된 값을 그대로 Vercel의 ADMIN_PASSWORD_HASH 환경변수에 붙여넣으세요.
// 이 스크립트는 비밀번호를 어디에도 저장/전송하지 않고 터미널에만 출력합니다.
import crypto from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('사용법: node scripts/generate-admin-password-hash.mjs "실제 비밀번호"');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(password, salt, 64);
console.log(`${salt.toString("hex")}:${key.toString("hex")}`);
