# C 언어 Day 3 요약노트 — 구조체·비트 연산·함수 포인터

> 출처: HYUNDAI AI Insight Campus · 프로그래밍 언어(C) 3/4 · 9/9(수) 강의자료 (`C_Day3_lecture.html`)
> 함께 보기: [퀴즈 문제·정답](quiz_answers.md) · 퀴즈 풀기 페이지 [`quiz.html`](quiz.html)

> 오늘의 함정은 세그폴트가 아니라 **조용히 틀린 값이 나오는 것**들입니다 — 그래서 더 위험합니다.

---

## 🧭 한눈에 보기 — 오늘의 여섯 문장

| # | 핵심 문장 | 교시 |
|---|---|---|
| 1 | 구조체 대입은 **통째 복사**. 함수 인자는 **`const T *`** 가 기본 | 1 |
| 2 | 필드는 **자기 크기의 배수 주소**에. **큰 것부터** 놓으면 패딩이 사라진다. union 은 같은 자리를 나눠 쓴다 | 2 |
| 3 | 켜기 `\|=`, 끄기 `&= ~`, 토글 `^=`, 검사 `>> n & 1`. 필드 쓰기는 **지우고 넣는다**. 비트 연산은 **unsigned** 로 | 3·4 |
| 4 | 매크로는 **텍스트 치환** — 괄호 셋, 부수효과 금지. `volatile` 은 "**매번 진짜로 읽어라**" | 5 |
| 5 | 함수 이름은 **주소**. qsort 는 **비교 함수가 타입을 안다** | 6 |
| 6 | 콜백은 **미리 등록**, 상태 머신은 **enum 인덱스 = 핸들러 테이블** | 7 |

---

## 1교시 · 구조체 기초 — 묶고, 복사하고, 가리키기

```c
typedef struct { double t; int h; int d; } Reading;

Reading r = {25.3, 60, 120};          // 순서대로 초기화
Reading s = {.d = 150, .t = 36.9};    // 지정 초기화 (C99) — 빠진 h 는 0
Reading c = r;                        // 통째로 복사 (memcpy 와 같음) — c 를 바꿔도 r 은 그대로
Reading *p = &r;
p->h == (*p).h                        // -> 는 (*p). 의 줄임
```
- **배열은 `=` 로 복사되지 않지만 구조체는 된다** — 구조체 안의 배열까지 통째로
- Day 2 정렬의 `Reading t = a[j]; a[j] = a[j+1]; a[j+1] = t;` 가 동작한 이유

### 값으로 vs 포인터로 넘기기
| 방식 | 복사되는 것 | 원본 수정 |
|---|---|---|
| `void f(Reading r)` | 구조체 전체 (16바이트) | ❌ |
| `void f(Reading *r)` | 포인터 8바이트 | ✅ (`r->t += 1.0`) |
| `double f(const Reading *a, int n)` | 포인터 8바이트 | 읽기만 (기본형) |

- `a[i].t == (a + i)->t`

### ⚠ 함정: 구조체 비교는 `==` 로 안 된다
- `a == b` → **컴파일 에러** (`invalid operands to binary ==`)
- **필드별로 비교**하는 함수를 만든다. `memcmp` 는 보통 맞지만 **패딩 때문에 믿으면 안 됨**

---

## 2교시 · 패딩·정렬·공용체·열거형

### 정렬 규칙 두 가지
1. **각 필드는 자기 크기의 배수 주소에서 시작** (int 는 4의 배수, double 은 8의 배수)
2. **구조체 전체 크기는 가장 큰 필드 크기의 배수** (배열로 늘어놓아도 ①이 유지되도록)

| 구조체 | 기대 | 실제 | 배치 |
|---|---|---|---|
| `{ char id; int v; char f; }` (Bad) | 6 | **12** | id@0, (3 패딩), v@4, f@8, (3 패딩) |
| `{ int v; char id; char f; }` (Good) | 6 | **8** | v@0, id@4, f@5, (2 패딩) |
| `{ double t; int h; int d; }` (Reading) | 16 | **16** | |

- **같은 필드를 큰 것부터 배치하면 패딩이 사라진다**
- 필드 위치 확인: `offsetof(타입, 필드)` (`<stddef.h>`)

### 패딩을 없애는 두 방법
| 방법 | 장점 | 대가 |
|---|---|---|
| **필드 순서를 큰 것부터** | 이식성 100%, 성능 손실 없음 | 설계 시 신경 써야 함 |
| `#pragma pack(push, 1)` ... `#pragma pack(pop)` | 통신 프레임·파일 포맷과 1:1 대응 | **정렬 안 된(unaligned) 접근** → x86 은 느려지고, **일부 MCU 는 죽음** |

- 프레임을 `(Frame *)buf` 로 바로 캐스팅하는 대신 안전한 답은 **바이트 조립**

### union — 같은 메모리를 여러 타입으로
```c
typedef union { uint32_t w; uint8_t b[4]; float f; } Word;
x.w = 0x11223344;   // b[] = 44 33 22 11 (리틀 엔디안)
x.f = 1.0f;         // w = 0x3F800000 (IEEE 754)
sizeof(Word)        // 4 (가장 큰 멤버)
```
- 멤버들이 **같은 자리를 공유**, 크기는 **가장 큰 멤버**. **마지막에 쓴 멤버만 의미가 있다**
- 전형적 용도: 센서가 보낸 4바이트를 `b[]` 에 받아 `f` 로 읽기

### 비트 필드
```c
struct { uint8_t on:1, err:1, mode:2, level:4; } bits;   // 1+1+2+4 = 8비트
// raw = 0b10010101 → on=1, err=0, mode=1, level=9  (gcc 는 LSB 부터 채움)
```
- 배치가 **컴파일러마다 달라** 통신 프레임에는 쓰지 않고 마스크·시프트를 쓴다

### enum — 상태에 이름을, 그리고 개수를
```c
typedef enum { ST_IDLE, ST_HEAT, ST_COOL, ST_ALERT, ST_COUNT } State;   // 0,1,2,3,4
static const char *NAME[ST_COUNT] = {"IDLE", "HEAT", "COOL", "ALERT"};
```
- 마지막 **`ST_COUNT`** 관용구 → 상태를 추가해도 **배열 크기·루프 상한이 자동으로 맞음**
- enum 은 그냥 int (`sizeof` 4) → `st = 99` 도 컴파일됨 → switch 의 `default` 로 방어

---

## 3교시 · 비트 연산 기초 — 마스크와 시프트

### 여섯 연산자 (`a = 0b10110010` = 178)
| 식 | 결과 | 의미 |
|---|---|---|
| `a & 0x0F` | `0b00000010` | 하위 4비트만 남김 |
| `a \| 0x01` | `0b10110011` | 최하위 비트 켬 |
| `a ^ 0xFF` | `0b01001101` | 전부 반전 (XOR 1 = NOT) |
| `(uint8_t)~a` | `0b01001101` | 반전 — **캐스팅 필요** |
| `a >> 4` | `0b00001011` = 11 | 상위 니블을 아래로 |
| `a << 1` | **356** (100 아님!) | int 로 승격돼 잘리지 않음 |

- **정수 승격**: `uint8_t` 는 연산 전 int 로 바뀜 → 8비트로 자르려면 `(uint8_t)(a << 1)`. `~a` 도 `0xFFFFFF4D` 가 됨

### 네 가지 관용구 ⭐
| 하고 싶은 것 | 코드 | 이유 |
|---|---|---|
| n번 비트 **켜기** | `reg \|= (1u << n)` | OR 은 1 을 이기지 못함 |
| n번 비트 **끄기** | `reg &= ~(1u << n)` | 그 자리만 0 인 마스크와 AND |
| n번 비트 **토글** | `reg ^= (1u << n)` | XOR 1 은 반전 |
| n번 비트 **검사** | `(reg >> n) & 1` | 그 비트를 0번으로 내려서 본다 |

- **`1u`** 의 u: `1 << 31` 은 **signed 오버플로(정의되지 않음)**. 레지스터는 항상 unsigned

### 여러 비트 필드 쓰기 — 지우고 넣는다
```c
reg = (reg & ~(0xFFu << 8)) | (0xABu << 8);   // 비트 8~15 를 0xAB 로 → 0x1234AB78
(reg >> 8) & 0xFF                              // 읽기 → AB
```
- `reg |= (0xAB << 8)` 만 쓰면 기존 비트가 남아 섞임 → **먼저 지우고(AND NOT) 그 다음 넣는다(OR)**

### ⚠ 함정: 음수 시프트
```c
int8_t neg = -8;
neg >> 1            // -4   (산술 시프트: 부호 유지 — 구현 정의)
(uint8_t)neg >> 1   // 124  (논리 시프트: 0 채움)
-3 >> 1             // -2   (-1.5 가 아니라 내림)
```
- 음수 `>>` 결과는 **구현마다 다르다**. **비트 연산은 unsigned 로만**

### 니블 다루기 (`v = 0b01100101`)
```c
v >> 4                         // 상위 니블 → 0b00000110
v & 0x0F                       // 하위 니블 → 0b00000101
(uint8_t)((v << 4) | (v >> 4)) // 니블 교환 → 0b01010110
(v >> 6) & 1                   // 6번 비트 검사 → 1
```
- `v << 4` 는 int 로 승격되어 상위 비트가 남으므로 **`(uint8_t)` 캐스팅이 필요**

---

## 4교시 · 비트 연산 실전 — 레지스터·플래그·체크섬

### 가상 GPIO 매크로
```c
#define GPIO_SET(pin)    (GPIO_OUT |=  (1u << (pin)))
#define GPIO_CLR(pin)    (GPIO_OUT &= ~(1u << (pin)))
#define GPIO_TOGGLE(pin) (GPIO_OUT ^=  (1u << (pin)))
#define GPIO_READ(pin)   ((GPIO_IN >> (pin)) & 1u)

GPIO_SET(2);   // 0x00000004
GPIO_SET(4);   // 0x00000014
GPIO_CLR(2);   // 0x00000010
```
- 실제 MCU 에서는 `extern uint32_t GPIO_OUT` 대신 `#define GPIO_OUT (*(volatile uint32_t *)0x3FF44004)`

### 상태 플래그 읽기 (D = 120 = `0b0111_1000`)
```c
#define FLAG_POWER  (1u << 7)
#define FLAG_ONLINE (1u << 6)
#define FLAG_ALARM  (1u << 5)
#define FLAG_LOWBAT (1u << 4)
#define LEVEL_MASK  0x0Fu        // 하위 4비트 = 신호 세기
// → power=0 online=1 alarm=1 lowbat=1 level=8
```
- `d & FLAG_ALARM` 의 값은 0 또는 **32** (1 아님) → **`!!(x)`** 로 0/1 로 만든다. `if` 조건에는 그대로 써도 됨

### XOR 체크섬
```c
uint8_t checksum(const char *s) {          // '$' 와 '*' 사이의 XOR
    uint8_t cs = 0;
    for (; *s && *s != '*'; s++) cs ^= (uint8_t)*s;
    return cs;
}
// "T=25.3,H=60,D=120" → 2C → 프레임: "$T=25.3,H=60,D=120*2C"
// 한 글자 깨지면 → 4B ≠ 2C → 폐기
```
- NMEA(GPS) 프레임이 이 방식(`$...*hh`)
- **`a ^ b ^ b == a`** → 체크섬·토글·간단한 암호화에 쓰임

### 바이트 조립 / 분해
```c
uint16_t dist = buf[0] | (buf[1] << 8);   // 조립 (LE)
uint8_t lo = v & 0xFF;                    // 하위 바이트
uint8_t hi = (v >> 8) & 0xFF;             // 상위 바이트
uint32_t packed = (dist << 16) | hum;     // 0x012C003C
```
- `dist << 16` 은 uint16_t 가 int 로 승격되어 계산되므로 32비트에 들어간다. 더 엄격하게는 `((uint32_t)dist << 16)`

---

## 5교시 · 매크로·volatile·메모리 맵

### ⚠ 함정: 매크로는 함수가 아니라 텍스트 치환
```c
#define SQ_BAD(x)  x * x
#define SQ(x)      ((x) * (x))
#define MAX(a, b)  ((a) > (b) ? (a) : (b))

SQ_BAD(1 + 2)   // 5   (1 + 2 * 1 + 2)
SQ(1 + 2)       // 9
100 / SQ(5)     // 4   (바깥 괄호 없으면 100 / 5 * 5 = 100)
MAX(i++, 2)     // i = 3 → 결과 4, 이후 i = 5 (i++ 가 두 번 평가됨)
```
- **규칙 셋: ① 인자마다 괄호 ② 전체에 괄호 ③ 부수효과 있는 인자 금지**
- 확인: `gcc -E macro.c` 로 전처리 결과 보기
- 타입 검사도 없으니 요즘은 **`static inline` 함수**가 더 낫다

### 유용한 매크로
```c
#define CLAMP(x, lo, hi) ((x) < (lo) ? (lo) : (x) > (hi) ? (hi) : (x))
#define ARRAY_LEN(a)     (sizeof(a) / sizeof((a)[0]))   // ⚠ 포인터에 쓰면 8/4 = 2 (감쇠)
#define BIT(n)           (1u << (n))
```

### 조건부 컴파일 — 디버그 스위치
```c
#ifdef DEBUG
#  define LOG(fmt, ...) fprintf(stderr, "[%s:%d] " fmt "\n", __FILE__, __LINE__, ##__VA_ARGS__)
#else
#  define LOG(fmt, ...) ((void)0)     // 아무 코드도 남지 않음
#endif
```
- **`-DDEBUG`** = 소스 맨 위에 `#define DEBUG` 를 쓴 것과 같음
- 릴리스 빌드에서는 LOG 코드 자체가 사라져 비용 0. `#if defined(ESP32)` 처럼 플랫폼 분기에도 사용

### volatile — "밖에서 바뀔 수 있다"
- "이 변수를 읽을 때마다 **진짜 메모리를 읽어라**, 절대 **캐시·생략(최적화)하지 마라**"
- `-O2` 에서 `while (plain_flag == 0) {}` 는 무한 루프로 최적화될 수 있음
- 크기·속도 차이는 없고 **의미만 다름**
- 필요한 곳 3가지: **하드웨어 레지스터**, **인터럽트 핸들러가 바꾸는 변수**, 다른 스레드가 바꾸는 플래그 (단, 스레드 동기화는 volatile 로 부족)

### 메모리 맵 I/O
```c
#define GPIO_OUT_REG (*(volatile uint32_t *)0x3FF44004)
GPIO_OUT_REG |= (1u << 2);   // 레지스터에 쓰기 = 그 주소에 쓰기
```
- 읽는 법: 주소를 → **`volatile uint32_t` 포인터로 캐스팅** → **역참조**. 그러면 변수처럼 `|=`, `&=` 사용 가능

---

## 6교시 · 함수 포인터 — qsort 로 Day 2 회수

### 함수도 주소가 있다
```c
int (*op)(int, int);   // op 는 (int,int)를 받아 int 를 돌려주는 함수의 포인터
op = add;              // 함수 이름 = 함수 주소
op(2, 3);              // (*op)(2, 3) 과 같음

typedef int (*BinOp)(int, int);   // 복잡하면 typedef 로 이름 붙이기
```
- ⚠ 괄호를 빼면 `int *op(int, int)` = "**int 포인터를 돌려주는 함수**" — 전혀 다른 뜻

### 함수 포인터 배열 — if-else 사다리를 표로
```c
static const BinOp OPS[] = { add, sub, mul };
OPS[i](7, 3);    // 10 / 4 / 21
```
- 연산 추가 = 배열에 한 항목 → 7교시 상태 머신 테이블의 원리

### qsort
```c
qsort(배열, 요소 개수, 요소 크기, 비교 함수);

int cmp_temp(const void *a, const void *b) {
    const Reading *x = a, *y = b;              // void * → 원래 타입으로
    return (x->t > y->t) - (x->t < y->t);      // -1 / 0 / 1
}
int cmp_hum_desc(const void *a, const void *b) {   // 내림차순은 b - a
    return ((const Reading *)b)->h - ((const Reading *)a)->h;
}
int cmp_id(const void *a, const void *b) {         // 문자열은 strcmp 그대로
    return strcmp(((const Node *)a)->id, ((const Node *)b)->id);
}
```
- 매개변수가 `const void *` 인 이유: qsort 는 **요소의 타입을 모른다** → 비교 함수가 안다 (C 의 다형성)
- double 을 `x->t - y->t` 로 반환하면 반환형이 **int 라서 잘림** → **`(x > y) - (x < y)`** 사용

### ⚠ 함정: 비교 함수의 뺄셈
- `*(int *)a - *(int *)b` → `INT_MAX - (-1)` 에서 **오버플로** → 잘못된 순서
- **`(x > y) - (x < y)`** 는 모든 타입에 안전

### 함수 포인터를 인자로
```c
void apply(double *a, int n, double (*f)(double)) {
    for (int i = 0; i < n; i++) a[i] = f(a[i]);
}
apply(temps, 3, c_to_f);    // 0, 26, 100 → 32.0 78.8 212.0
```

---

## 7교시 · 콜백과 상태 머신

### 콜백 — 라이브러리가 내 함수를 부른다
```c
typedef void (*Callback)(double);
static Callback on_alert = NULL;
void register_alert(Callback cb) { on_alert = cb; }       // "이걸 불러줘"
void feed(double t) { if (t > 35.0 && on_alert) on_alert(t); }   // NULL 검사 후 호출
```
- "이 **이벤트**가 생기면 이 **함수**를 불러라"를 미리 등록
- 인터럽트 핸들러(`attachInterrupt(pin, handler)`), 타이머, 버튼 이벤트가 전부 이 패턴

### 여러 콜백 등록
```c
handlers[n_handlers++] = h;                                   // 등록
for (int i = 0; i < n_handlers; i++) handlers[i](pin);        // 전부 호출
```

### 상태 머신 — 전이표를 함수 포인터 테이블로

| 현재 상태 | 조건 | 다음 상태 | 출력(핀) |
|---|---|---|---|
| IDLE | t < 18 | HEAT | — |
| IDLE | t > 28 | COOL | — |
| HEAT | t ≥ 20 | IDLE | HEATER 켬 |
| COOL | t > 35 | ALERT | FAN 켬 |
| COOL | t ≤ 26 | IDLE | FAN 켬 |
| ALERT | t ≤ 30 | COOL | ALARM+FAN 켬 |

```c
typedef State (*Handler)(double);
static const Handler TABLE[ST_COUNT] = {
    [ST_IDLE] = on_idle, [ST_HEAT] = on_heat,      // 지정 초기화로 순서 사고 방지
    [ST_COOL] = on_cool, [ST_ALERT] = on_alert
};
State next = TABLE[st](temps[i]);   // 핵심 한 줄: 상태가 곧 인덱스
```
- 배열의 인덱스 = **현재 상태(enum 값)**, 핸들러 반환값 = **다음 상태**
- 상태 추가 = enum 한 줄 + 핸들러 한 개 + 테이블 한 항목

### ⚠ 함정: 테이블과 enum 순서가 어긋나면
- `{ on_idle, on_cool, on_heat, on_alert }` → **컴파일·실행 다 되는데** HEAT 상태에서 팬이 돌고 COOL 에서 히터가 켜짐
- **지정 초기화 `[ST_HEAT] = on_heat`** 로 막는다

---

## 8교시 · 종합 실습 — 온도 조절기 컨트롤러

**과제**: Day 2 분석기 + 오늘 배운 것. 파일 5개 이상(`main.c`, `frame.c/h`, `fsm.c/h`, `gpio.h`, `Makefile`), 경고 0개

| 단계 | 함수 / 파일 | 교시 |
|---|---|---|
| 프레임 파싱 | `parse_frame` + D 필드 플래그 해석 | 4 |
| 체크섬 검증 | `$…*hh` 형식이면 XOR 검증, 틀리면 BAD | 4 |
| 상태 머신 | `fsm_step(State, double) -> State` 테이블 | 7 |
| 레지스터 | `gpio.h` 매크로로 HEATER/FAN/ALARM 핀 | 4·5 |
| 통계 | `int visits[ST_COUNT]` 로 상태별 횟수, qsort 로 온도 상위 3 | 2·6 |
| 디버그 | `-DDEBUG` 일 때만 전이 로그 | 5 |

```c
static int cmp_temp_desc(const void *a, const void *b) {
    const Reading *x = a, *y = b;
    return (y->t > x->t) - (y->t < x->t);    // y, x 순서 = 내림차순
}
```
```bash
make && ./controller < temps.txt
# IDLE 3 / HEAT 2 / COOL 3 / ALERT 2
# top3: 36.0 33.0 31.0
# bad=0 final GPIO=0x6
make clean && make CFLAGS="-Wall -Wextra -g -DDEBUG"   # 전이 로그가 stderr 로
```

**제출 체크리스트**
- [ ] 경고 0개 · `-DDEBUG` 로 전이 로그가 stderr 에 나옴
- [ ] TABLE 이 지정 초기화(`[ST_HEAT] = on_heat`)로 되어 있음
- [ ] 핀 제어가 `GPIO_SET/CLR` 매크로로만 이루어짐 (직접 `|=` 금지)
- [ ] 상태별 체류 횟수가 `int visits[ST_COUNT]` 로 계산됨

---

## 📝 시험 직전 체크 — 헷갈리기 쉬운 것 모음

| 질문 | 답 |
|---|---|
| `p->h` 는 무엇의 줄임 | `(*p).h` |
| `Reading c = r;` | 통째 복사 |
| 구조체를 `==` 로 비교하면 | 컴파일 에러 |
| 지정 초기화에서 빠진 필드 | 0 |
| `{char; int; char}` 크기 | 12 |
| `{int; char; char}` 크기 | 8 |
| 구조체 전체 크기는 무엇의 배수 | 가장 큰 필드 크기 |
| `#pragma pack(1)` 의 대가 | 정렬 안 된 접근 → 일부 MCU 에서 죽음 |
| union 크기 | 가장 큰 멤버 크기 (같은 메모리 공유) |
| enum 끝에 `ST_COUNT` 두는 이유 | 상태 개수를 자동으로 얻기 위해 |
| n번 비트 켜기 / 끄기 / 토글 / 검사 | `\|= (1u<<n)` / `&= ~(1u<<n)` / `^= (1u<<n)` / `(x>>n)&1` |
| `a ^ 0xFF` | 반전 |
| `uint8_t a; a << 1` 의 결과 타입 | int (잘리지 않음) |
| `1u << 31` 을 쓰는 이유 | signed 오버플로(UB) 회피 |
| 음수 `>>` 결과 | 구현마다 다르다 |
| 필드 쓰기 순서 | 지우고(AND NOT) → 넣는다(OR) |
| `!!x` | 0 이 아니면 1 |
| XOR 체크섬의 성질 | `a ^ b ^ b == a` |
| `SQ(x) x*x` 에서 `SQ(1+2)` | 5 (텍스트 치환) |
| `-DDEBUG` | `#define DEBUG` 와 같음 |
| volatile 의 의미 | 최적화(캐시·생략) 금지, 매번 메모리에서 읽기 |
| `int (*op)(int,int)` 괄호를 빼면 | int 포인터를 돌려주는 함수 선언 |
| qsort 네 인자 | 배열, 요소 개수, 요소 크기, 비교 함수 |
| 비교 함수 매개변수가 `const void *` 인 이유 | qsort 가 요소 타입을 모름 |
| 상태 머신 테이블의 인덱스 / 핸들러 반환값 | 현재 상태 / 다음 상태 |
| 콜백 호출 전 검사 | NULL 검사 |
