# 🚀 eX-GenAI AutoMapper (eXBuilder6 지능형 데이터 바인딩 모듈)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![eXBuilder6](https://img.shields.io/badge/UI_Framework-eXBuilder6-orange.svg)
![Gemini](https://img.shields.io/badge/AI_Model-Google_Gemini-1da1f2.svg)

**eX-GenAI AutoMapper**는 사용자의 자연어(텍스트) 입력을 분석하여, 토마토시스템 **eXBuilder6** UI 프레임워크의 핵심 데이터 컴포넌트(`DataMap`, `DataSet`, `Grid`)에 자동으로 데이터를 추출 및 바인딩해 주는 프론트엔드 기반의 지능형 AI 공통 모듈입니다.

별도의 백엔드(Java/Spring) 연동 없이, 브라우저 단에서 Google Generative AI(Gemini)와 직접 통신하여 혁신적인 제로 백엔드(Zero-Backend) PoC 및 실무 연동을 구현했습니다.

---

## ✨ 핵심 기능 (Key Features)

* **🧠 동적 스키마 생성 (Dynamic Schema Generation)**
  * 하드코딩된 프롬프트 없이, eXBuilder6 화면에 정의된 컴포넌트의 메타데이터(컬럼 ID, `getDataType()`, `getInfo()` 한글 설명)를 런타임에 실시간으로 읽어와 AI 추출 양식을 자동 생성합니다.
* **📦 다건 데이터(Array) 추출 및 동적 그리드 삽입**
  * "모니터 5대, 마우스 10개"와 같은 복합적인 자연어 요청을 분해하여 JSON 배열(Array) 형태로 추출합니다.
  * 그리드(`Grid`) 내 선택된 행(Row)의 위치를 추적하여 동적으로 `addRowData` 및 `insertRowData`를 수행합니다.
* **🔄 공통 코드(Code) 자동 치환 (Combo-box Support)**
  * "국민은행", "영업팀" 등 자연어 형태의 명칭을 식별하고, 사전에 정의된 DB 공통 코드(`KB_04`, `DEPT_001` 등)로 완벽하게 치환하여 데이터셋에 바인딩합니다.
* **🛡️ 할루시네이션(환각) 원천 차단**
  * 엄격한 메타 프롬프트(Meta-Prompting)와 Google SDK의 `responseSchema` 제약을 통해, 텍스트에 없는 데이터를 AI가 임의로 지어내는 현상을 100% 방지합니다.

---

## 💻 기술 스택 (Tech Stack)

| 구분 | 기술 / 스택 | 설명 |
| :--- | :--- | :--- |
| **UI Framework** | Tomato System `eXBuilder6` | 엔터프라이즈 Web UI 개발 솔루션 |
| **Language** | `JavaScript` (ESM) | Promise 기반 비동기 제어 및 동적 모듈 로드 (`import()`) |
| **AI Model** | Google `gemini-1.5-flash` / `2.0-flash` | 고속 자연어 처리 및 JSON 구조화 렌더링 |
| **AI SDK** | `@google/generative-ai` | Google 공식 Generative AI Web SDK |

---

## ⚙️ 아키텍처 및 동작 프로세스

1. **사용자 입력:** eXBuilder6 화면에서 자연어 형태의 텍스트 입력
2. **메타데이터 수집:** 타겟 `DataSet` 또는 `DataMap`의 헤더 정보(`getHeaders()`) 스캔
3. **스키마 조립:** 컬럼의 Data Type 및 한글 설명(`getInfo()`)을 결합하여 AI에게 전달할 JSON Schema 동적 생성
4. **AI API 호출 (ESM):** 로컬 스크립트 모듈로 내장된 Google AI SDK를 통해 Gemini 모델 호출
5. **JSON 파싱 및 검증:** 응답받은 정형화된 JSON 데이터를 파싱 및 배열(Array) 단위로 분리
6. **UI 바인딩:** 추출된 데이터를 eXBuilder6 데이터셋에 주입하고 화면(`redraw()`) 갱신

---

## 🚀 시작하기 (Getting Started)

### 1. SDK 로컬 내장
외부 인터넷망 통신 보안을 위해 구글 공식 SDK를 로컬 프로젝트에 내장합니다.
* `https://esm.sh/@google/generative-ai?bundle` 의 원본 코드를 다운로드
* 프로젝트 내 `/thirdparty/google_ai.js` 경로로 저장

### 2. API Key 발급 및 설정
* Google AI Studio에서 API Key 발급
* 소스코드 내 `new GoogleGenerativeAI("YOUR_API_KEY")` 부분에 적용

### 3. eXBuilder6 DataMap / DataSet 세팅 규칙
* **Type:** 숫자형 컬럼은 데이터 속성을 `number`로 지정 (AI가 자동으로 Number 타입 추출)
* **Info (논리명):** 각 컬럼의 속성창 `info` 항목에 해당 데이터의 한글 의미 기입 (예: "요청일자", "고객사명")

---

## ⚠️ 주의 사항 (Troubleshooting)

* **429 Too Many Requests (Quota Exceeded):** 무료 티어(Free Tier) 사용 시 분당/일일 요청 제한이 발생할 수 있습니다. 
  * 에러 발생 시 약 30초 대기 후 재시도하거나, 모델 버전 변경(`gemini-1.5-flash` 등)을 권장합니다.
* **ESM 호환성:** `cpr.core.ResourceLoader.loadScript()` 방식은 ESM(`export`) 문법과 충돌하므로, 반드시 브라우저 네이티브 `import()` 문법을 사용하여 모듈을 호출해야 합니다.
