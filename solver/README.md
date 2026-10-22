# 🌰 호두 문제풀이

Claude API로 **리눅스 · 회로 이론 · MCU · 임베디드** 문제를 단계별로 풀어 주는 웹 서비스입니다. 화면은 노션(Notion) 스타일입니다.

## 기능

- 문제를 입력하면 Claude(`claude-opus-5-5`)가 **실시간 스트리밍**으로 풀이합니다.
- **분야 태그**(자동 판별 / 리눅스 / 회로 이론 / MCU / 임베디드): 고른 분야에 맞춰 풀이합니다.
- **이미지 첨부**(회로도, 타이밍도, 문제 사진 등): 📎 버튼, 붙여넣기(Ctrl+V), 끌어놓기 모두 됩니다.
- **수식(KaTeX)·코드 하이라이트**: 회로 계산식과 C/셸 코드를 보기 좋게 표시하고, 코드는 복사 버튼으로 바로 복사할 수 있습니다.
- **💭 생각 과정 토글**: 풀이 전에 Claude가 생각한 내용의 요약을 펼쳐 볼 수 있습니다.
- **이어서 질문하기**: 같은 페이지에서 추가 질문을 하면 앞의 풀이를 이어서 답합니다.
- **문제 페이지 저장 · 검색**: 풀었던 문제는 브라우저(localStorage)에 페이지로 저장되고, 사이드바에서 검색(Ctrl+K)하거나 분야별로 모아 볼 수 있습니다.
- 다크 모드, 모바일 화면 지원.

## 실행 방법

```bash
cd solver
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...  # Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."
uvicorn app:app --reload --port 8000
```

브라우저에서 http://localhost:8000 을 열면 됩니다.

API 키는 https://console.anthropic.com 에서 발급받을 수 있습니다.

## 구조

```
solver/
├── app.py              # FastAPI 서버 (Claude API 호출, SSE 스트리밍)
├── requirements.txt
└── static/
    ├── index.html      # 노션 스타일 화면
    ├── style.css
    └── app.js          # 페이지/검색/스트리밍 렌더링
```

## 설정 메모

- 모델, 시스템 프롬프트(풀이 방식)는 `app.py` 상단의 `MODEL`, `SYSTEM_PROMPT`에서 바꿀 수 있습니다.
- 풀이 깊이는 `output_config={"effort": "high"}`로 설정되어 있습니다. 비용을 줄이려면 `"medium"`, 더 어려운 문제에 더 깊게 풀게 하려면 `"xhigh"`로 바꿔 보세요.
- 안전 분류기가 요청을 거절하면 서버 측 폴백(`fallbacks="default"`)으로 다른 모델이 이어서 답하도록 설정되어 있습니다.
- 저장된 페이지는 브라우저에만 있으므로, 다른 브라우저/기기와는 공유되지 않습니다.
