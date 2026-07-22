/**
 * 네이버 매물 페이지에서 실행할 북마클릿 소스를 만듭니다. 이건 "1차 프로토타입"
 * 전용입니다 — landthumb-phinf.pstatic.net 이미지 URL만 모아서 새 탭으로 연
 * 관리자 테스트 화면에 postMessage로 넘겨줄 뿐, 저장/DB/출처선택은 하지 않습니다.
 *
 * 왜 fetch가 아니라 postMessage인가: 이 코드는 네이버 페이지 안에서 실행되므로
 * 우리 서버로 직접 요청(fetch)을 보내면 네이버 페이지의 CSP(connect-src)에
 * 막힐 수 있습니다. window.open으로 새 창을 여는 것과 postMessage로 메시지를
 * 보내는 것은 일반적인 링크 이동과 같은 취급이라 그 제한을 받지 않습니다.
 *
 * 새 창이 아직 로딩 중일 때 보낸 postMessage는 유실될 수 있어서(리스너가 아직
 * 안 붙어있음), ack를 받을 때까지 일정 간격으로 반복 전송합니다.
 */
export function buildNaverPhotosBookmarklet(targetOrigin: string): string {
  const targetUrl = `${targetOrigin}/admin/import-naver/photos-test`;

  const source = `(function(){
    var TARGET_ORIGIN = ${JSON.stringify(targetOrigin)};
    var TARGET_URL = ${JSON.stringify(targetUrl)};
    var HOST = "landthumb-phinf.pstatic.net";

    function baseUrl(url) {
      var i = url.indexOf("?");
      return i === -1 ? url : url.slice(0, i);
    }
    function typeSize(url) {
      var m = url.match(/[?&]type=[a-zA-Z]*(\\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }

    var imgs = document.querySelectorAll("img");
    var byBase = {};
    for (var i = 0; i < imgs.length; i++) {
      var el = imgs[i];
      var src = el.currentSrc || el.src || el.getAttribute("data-src") || el.getAttribute("data-original");
      if (!src) continue;
      var u;
      try { u = new URL(src, location.href); } catch (e) { continue; }
      if (u.hostname !== HOST) continue;
      if ((el.naturalWidth && el.naturalWidth < 50) || (el.naturalHeight && el.naturalHeight < 50)) continue;
      var full = u.href;
      var base = baseUrl(full);
      var size = typeSize(full);
      if (!byBase[base] || byBase[base].size < size) {
        byBase[base] = { url: full, size: size };
      }
    }

    var urls = [];
    for (var key in byBase) { urls.push(byBase[key].url); }

    if (urls.length === 0) {
      alert("landthumb-phinf.pstatic.net 이미지가 이 페이지에서 발견되지 않았습니다. 매물 상세 페이지가 맞는지, 사진이 로딩된 상태인지 확인해주세요.");
      return;
    }

    var win;
    try {
      win = window.open(TARGET_URL, "_blank");
    } catch (e) {
      alert("새 창을 열지 못했습니다(팝업 차단 또는 브라우저 보안 정책으로 추정). 오류: " + e.message);
      return;
    }
    if (!win) {
      alert("새 창이 열리지 않았습니다. 브라우저 주소창 근처의 팝업 차단 아이콘을 확인하고 허용한 뒤 다시 시도해주세요.");
      return;
    }

    var acked = false;
    var attempts = 0;
    var maxAttempts = 40;

    function onMessage(event) {
      if (event.origin !== TARGET_ORIGIN) return;
      if (event.data === "hosoo-import-ack") {
        acked = true;
        window.removeEventListener("message", onMessage);
      }
    }
    window.addEventListener("message", onMessage);

    var timer = setInterval(function() {
      attempts++;
      if (acked || attempts > maxAttempts) {
        clearInterval(timer);
        window.removeEventListener("message", onMessage);
        if (!acked) {
          alert("이미지 목록 전달에 실패했습니다(약 6초 대기 후 시간 초과). 새 탭이 정상적으로 열려서 로딩됐는지 확인 후 다시 시도해주세요. 계속 실패하면 관리자에게 알려주세요.");
        }
        return;
      }
      try {
        win.postMessage({ type: "hosoo-import-photos", pageUrl: location.href, urls: urls }, TARGET_ORIGIN);
      } catch (e) {
        clearInterval(timer);
        alert("이미지 목록 전달 중 오류가 발생했습니다: " + e.message);
      }
    }, 150);
  })();`;

  // javascript: URI는 퍼센트 인코딩하면 안 됩니다(인코딩된 문자열을 그대로
  // 실행하려고 해서 문법 오류가 납니다). 대신 줄바꿈만 제거해 한 줄로 만들어
  // 주소창에 직접 붙여넣어도 안전하게 동작하도록 합니다.
  const minified = source.replace(/\s+/g, " ").trim();
  return `javascript:${minified}`;
}
