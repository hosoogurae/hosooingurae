/**
 * 국토부 보도자료 RSS(https://www.molit.go.kr/dev/board/board_rss.jsp?rss_id=NEWS)에서
 * 실제로 받은 응답을 3건으로 축약한 샘플입니다. link 필드가 CDATA 없이
 * &#38;(숫자 문자참조)로 앰퍼샌드를 담고 있는 것도 실제 그대로입니다.
 */
export const MOLIT_RSS_SAMPLE = `<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
		<title><![CDATA[보도자료]]></title>
		<link>https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp</link>
		<description></description>
		<language>ko</language>
		<item>
			<category><![CDATA[보도자료]]></category>
			<title><![CDATA[[설명] 정부는 ‘26년 목표 물량 26.8만호 달성을 위해 총력을 기울이고 있습니다.]]></title>
			<link>https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092417&#38;src=text&#38;kw=000004</link>
			<description><![CDATA[<iframe width="100%" height="840" id="iframebirisingo" title="보도자료" src="https://manager.molit.go.kr/USR/viewer.do?mode=mb&amp;type=NEWS&amp;id=297456&amp;num=1" class="iframe_birisingo"></iframe>]]></description>
			<pubDate>Fri, 11 Sep 2026 16:01:49 +0900</pubDate>
			<dc:date>2026-09-11 16:01:49</dc:date>
		</item>
		<item>
			<category><![CDATA[보도자료]]></category>
			<title><![CDATA[[차관동정] 김이탁 제1차관, LH 조직 개편, 충분히 소통하면서 추진]]></title>
			<link>https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092416&#38;src=text&#38;kw=000004</link>
			<description><![CDATA[<iframe width="100%" height="840" id="iframebirisingo" title="보도자료" src="https://manager.molit.go.kr/USR/viewer.do?mode=mb&amp;type=NEWS&amp;id=297457&amp;num=1" class="iframe_birisingo"></iframe>]]></description>
			<pubDate>Fri, 11 Sep 2026 15:43:29 +0900</pubDate>
			<dc:date>2026-09-11 15:43:29</dc:date>
		</item>
		<item>
			<category><![CDATA[보도자료]]></category>
			<title><![CDATA[2026년도 민자고속도로 운영평가 결과]]></title>
			<link>https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092409&#38;src=text&#38;kw=000004</link>
			<description><![CDATA[<iframe width="100%" height="840" id="iframebirisingo" title="보도자료" src="https://manager.molit.go.kr/USR/viewer.do?mode=mb&amp;type=NEWS&amp;id=297431&amp;num=1" class="iframe_birisingo"></iframe>]]></description>
			<pubDate>Thu, 10 Sep 2026 14:04:14 +0900</pubDate>
			<dc:date>2026-09-10 14:04:14</dc:date>
		</item>
</channel></rss>`;
