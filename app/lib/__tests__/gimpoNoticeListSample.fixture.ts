/**
 * 김포시 고시공고 목록
 * (https://www.gimpo.go.kr/portal/ntfcPblancList.do?key=1004&cate_cd=1&searchCnd=40900000000)에서
 * 실제로 받은 응답의 표 구조를 3행으로 축약한 샘플입니다.
 */
export const GIMPO_NOTICE_LIST_SAMPLE = `<table class="p-table simple mobile" data-table="rwd" data-tabletype="simple" data-breakpoint="760">
	<caption>고시공고 목록<p class="summary">번호, 고시공고번호, 제목, 담당부서, 등록일 항목을 포함한 고시공고 목록</p></caption>
	<thead>
		<tr>
			<th scope="col">번호</th>
			<th scope="col">고시공고번호</th>
			<th scope="col">제목</th>
			<th scope="col">담당부서</th>
			<th scope="col">등록일</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td class="text_center">4857</td>
			<td class="text_left">김포시 통진읍 공고 제2026-66호</td>
			<td class="text_left"><a href="./ntfcPblancView.do?key=1004&amp;not_ancmt_mgt_no=75624&amp;pageIndex=1&amp;searchCnd=40900000000&amp;cate_cd=1">도로지정 공고(고정리 774-3)</a></td>
			<td class="text_center">통진읍</td>
			<td class="text_center">2026-09-11</td>
		</tr>
		<tr>
			<td class="text_center">4856</td>
			<td class="text_left">김포시 장기본동 공고 제2026-22호</td>
			<td class="text_left"><a href="./ntfcPblancView.do?key=1004&amp;not_ancmt_mgt_no=75574&amp;pageIndex=1&amp;searchCnd=40900000000&amp;cate_cd=1">신규 주민등록증 발급 대상자 통지 반송 공고 (2009년 8월생)</a></td>
			<td class="text_center">장기본동</td>
			<td class="text_center">2026-09-11</td>
		</tr>
		<tr>
			<td class="text_center">4855</td>
			<td class="text_left">김포시 월곶면 공고 제2026-38호</td>
			<td class="text_left"><a href="./ntfcPblancView.do?key=1004&amp;not_ancmt_mgt_no=75620&amp;pageIndex=1&amp;searchCnd=40900000000&amp;cate_cd=1">주민등록 무단전출자 직권조치결과 및 행정상 관리주소 이전 공고 협조 요청(2차)</a></td>
			<td class="text_center">월곶면</td>
			<td class="text_center">2026-09-11</td>
		</tr>
	</tbody>
</table>`;
