# Motion PPT Controller — Claude Code 작업 지침

## 프로젝트 개요

브라우저 단독 모션 인식 PPT 컨트롤러 (Phase 1 PoC).
설계서: `docs/2026-04-30-motion-ppt-controller-design.md`

## 기술 스택 (변경 금지)

- Next.js 14 (App Router) + TypeScript strict
- @mediapipe/tasks-vision 0.10.18
- react-pdf 9.x + pdfjs-dist 4.x
- Vitest 1.x

새 의존성 추가 전에 사람에게 확인. Tailwind, Zustand, Redux, Storybook, Playwright 등은 거부됨 (설계서 §3.2 참조).

## Clean Architecture 레이어 (강제)

```
Presentation (app/, components/)
↓
Application (lib/application/)
↓
Infrastructure (lib/infrastructure/)
↓
Domain (lib/domain/)
```

### 의존성 규칙

- `lib/domain/`: 외부 의존 0. React, DOM, MediaPipe, fetch, `Date.now()` 임포트 금지.
- `lib/infrastructure/`: 외부 시스템 어댑터. Domain만 의존 가능.
- `lib/application/`: React 훅. Domain + Infrastructure 의존 가능.
- `components/`, `app/`: UI. Application 훅만 사용. Infrastructure 직접 호출 금지.

ESLint `no-restricted-imports`로 강제됨. 위반 시 빌드 실패.

## Harness Engineering — 자동 가드레일

### 모든 변경 후 필수 명령

```bash
npm run check
```

이 명령은 `tsc --noEmit && eslint && prettier --check && vitest run`를 순차 실행.
**실패 시 절대 우회하지 말 것** (`--no-verify` 등 금지).

### 강제 규칙 (ESLint)

- `max-lines: 800`: 단일 파일 800줄 초과 금지. 도달 시 분해.
- `no-explicit-any`: `any` 타입 금지. `unknown` + 타입 가드 사용.
- `no-non-null-assertion`: `!` 연산자 금지.
- `no-restricted-imports`: 레이어 위반 차단.

## 코딩 컨벤션

- TypeScript strict (`noUncheckedIndexedAccess: true`).
- 함수형 우선: 가능한 한 순수 함수, 불변 데이터.
- 매직 넘버 금지 — `lib/domain/config.ts`에 상수로 정의.
- 한국어 주석 OK. 코드 식별자는 영어.
- 모든 클라이언트 컴포넌트 파일 상단에 `'use client'`.
- `useEffect` cleanup 누락 금지 (특히 카메라/타이머/이벤트 리스너).

## 금지 항목

다음을 추가/구현하지 말 것:

- 백엔드 (Python, Node 서버, DB)
- PPTX 직접 렌더링 (PDF만)
- 모바일 지원
- 박수 인식, 가상 커서 / Dwell time (Phase 2)
- 신규 의존성 (사전 협의 없이)

## 검증 명령

```bash
npm run dev           # 개발 서버
npm run build         # 프로덕션 빌드
npm run check         # 전체 검증 (커밋 전 필수)
npm run test          # 단위 테스트
```

## 흔한 함정

1. `useEffect` cleanup에서 카메라 stop 누락 → 빨간 LED 안 꺼짐.
2. MediaPipe `recognizeForVideo`에 같은 timestamp 두 번 → 에러.
3. `URL.createObjectURL` 후 `revokeObjectURL` 안 함 → 메모리 누수.
4. PDF Worker URL 잘못 → react-pdf 무한 로딩.
5. SSR에서 react-pdf 깨짐 → `'use client'` 필수.
6. 카메라 좌우 반전 — UI는 `scaleX(-1)`, MediaPipe 입력은 원본. (설계서 §5.5 참조)
