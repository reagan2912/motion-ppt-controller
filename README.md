# Motion PPT Controller

브라우저에서 손동작으로 PDF 슬라이드를 넘기는 PoC.

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000
```

## 사용법

1. PDF 파일 업로드
2. 카메라 권한 허용
3. 발표 시작 클릭
4. 손바닥을 카메라에 보이고 좌/우로 휙 동작

## 키보드 단축키

- → / Space / PageDown: 다음
- ← / Backspace / PageUp: 이전
- Home / End: 처음 / 마지막
- ESC: 시작 화면

## 디버그 모드

`http://localhost:3000?debug=1`

## 알려진 한계

- 박수 인식 미지원
- 가상 커서 / 메뉴는 Phase 2
- Chrome/Edge만 지원 (Firefox 미보장)

## 개발

```bash
npm run check     # 타입+린트+포맷+테스트 (커밋 전 필수)
npm test          # 단위 테스트
npm run dev       # 개발 서버
```

자세한 작업 지침: `CLAUDE.md`
설계서: `docs/2026-04-30-motion-ppt-controller-design.md`
