"""호두 문제풀이 - Claude 기반 리눅스/회로이론/MCU/임베디드 문제풀이 서비스."""

import json
from pathlib import Path
from typing import Any, Literal

import anthropic
from fastapi import FastAPI
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

MODEL = "claude-opus-5-5"
STATIC_DIR = Path(__file__).parent / "static"

# 시스템 프롬프트는 대화 중 절대 바꾸지 않는다 (프롬프트 캐시 + thinking 블록 유효성 유지).
# 분야 정보는 매 질문의 user 메시지 안에 넣는다.
SYSTEM_PROMPT = """당신은 '호두'라는 이름의 공학 문제풀이 튜터입니다. 리눅스, 회로 이론, MCU(마이크로컨트롤러), 임베디드 시스템 분야의 문제를 풀어 줍니다.

답변 원칙:
- 한국어로, 정중한 존댓말을 사용합니다.
- 먼저 문제에서 주어진 것과 구하는 것을 짧게 정리한 뒤, 단계별로 풀이합니다.
- 계산 문제는 사용한 공식과 대입 과정을 모두 보여 주고, 단위를 빠뜨리지 않습니다. 수식은 LaTeX($...$, $$...$$)로 씁니다.
- 리눅스 문제는 실제로 실행 가능한 명령어/스크립트를 코드 블록으로 제시하고, 각 옵션의 의미를 설명합니다.
- MCU/임베디드 문제는 레지스터, 클럭, 인터럽트, 메모리 맵 등 하드웨어 관점의 근거를 함께 설명하고, 코드는 C 코드 블록으로 제시합니다.
- 회로 문제는 KVL/KCL, 테브난/노턴 등 어떤 기법을 왜 쓰는지 밝힙니다.
- 마지막에 '## 정답' 섹션에 최종 답을 한눈에 보이게 정리합니다.
- 문제 조건이 모호하거나 정보가 부족하면, 가정한 내용을 '가정'이라고 명시합니다. 확실하지 않은 내용은 추측이라고 밝힙니다.
- 제조사/칩마다 다른 내용(레지스터 이름, 비트 위치 등)은 어떤 칩 기준인지 밝히고, 데이터시트 확인을 권합니다."""

CATEGORY_LABELS = {
    "auto": "자동 판별",
    "linux": "리눅스",
    "circuit": "회로 이론",
    "mcu": "MCU",
    "embedded": "임베디드",
}

client = anthropic.AsyncAnthropic()
app = FastAPI(title="호두 문제풀이")


class Message(BaseModel):
    role: Literal["user", "assistant"]
    # user: 텍스트/이미지 블록 목록, assistant: 이전 응답의 content 블록을 그대로 (thinking 포함)
    content: list[dict[str, Any]]


class SolveRequest(BaseModel):
    category: str = "auto"
    messages: list[Message]


def sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/api/categories")
async def categories() -> dict[str, str]:
    return CATEGORY_LABELS


@app.post("/api/solve")
async def solve(req: SolveRequest) -> StreamingResponse:
    messages = [m.model_dump() for m in req.messages]

    async def generate():
        try:
            async with client.beta.messages.stream(
                model=MODEL,
                max_tokens=64000,
                system=SYSTEM_PROMPT,
                messages=messages,
                thinking={"type": "adaptive", "display": "summarized"},
                output_config={"effort": "high"},
                cache_control={"type": "ephemeral"},
                # 안전 분류기가 거절하면 서버에서 권장 모델로 자동 재시도
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        block_type = event.content_block.type
                        if block_type == "thinking":
                            yield sse("status", "thinking")
                        elif block_type == "text":
                            yield sse("status", "writing")
                        elif block_type == "fallback":
                            yield sse("status", "fallback")
                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield sse("text", event.delta.text)
                        elif event.delta.type == "thinking_delta":
                            yield sse("thinking", event.delta.thinking)
                final = await stream.get_final_message()

            if final.stop_reason == "refusal":
                yield sse("error", "이 질문에는 답변을 드릴 수 없습니다. 질문을 바꿔서 다시 시도해 주세요.")
                return

            # 다음 질문 때 그대로 돌려보낼 수 있도록 응답 블록 전체(thinking 포함)를 전달
            yield sse("done", {
                "content": [b.to_dict() for b in final.content],
                "stop_reason": final.stop_reason,
                "usage": {
                    "input_tokens": final.usage.input_tokens,
                    "output_tokens": final.usage.output_tokens,
                },
            })
        except anthropic.AuthenticationError:
            yield sse("error", "API 키가 올바르지 않습니다. ANTHROPIC_API_KEY를 확인해 주세요.")
        except anthropic.RateLimitError:
            yield sse("error", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
        except anthropic.BadRequestError as e:
            yield sse("error", f"잘못된 요청입니다: {e.message}")
        except anthropic.APIStatusError as e:
            yield sse("error", f"API 오류({e.status_code}): {e.message}")
        except anthropic.APIConnectionError:
            yield sse("error", "Claude API에 연결할 수 없습니다. 네트워크를 확인해 주세요.")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
