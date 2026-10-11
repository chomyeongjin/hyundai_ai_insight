# C 언어 Day 1 요약노트 — C 기초와 컴파일 과정

> 출처: HYUNDAI AI Insight Campus · 프로그래밍 언어(C) 1/4 · 9/7(월) 강의자료 (`C_Day1_lecture.html`)
> 함께 보기: [퀴즈 문제·정답](quiz_answers.md) · 퀴즈 풀기 페이지 [`quiz.html`](quiz.html)

---

## 🧭 한눈에 보기 — 오늘의 여섯 문장

| # | 핵심 문장 | 교시 |
|---|---|---|
| 1 | 컴파일은 **전처리 → 컴파일 → 어셈블 → 링크**. `undefined reference` 는 **링크 에러**다 | 2 |
| 2 | **선언은 .h, 정의는 .c**. 헤더 가드로 재정의를 막고, Makefile 의존성에 **헤더도 적는다** | 3 |
| 3 | 자료형 = **바이트 수 + 해석 규칙**. 넘치면 잘리고, 같은 비트도 signed/unsigned 로 다르게 읽힌다 | 4 |
| 4 | int 와 unsigned 를 섞으면 **int 가 unsigned 로 변환**된다. `-1 < 1u` 는 **거짓** | 5 |
| 5 | `=`/`==`, `&`/`&&`, 시프트 괄호, switch 의 `break` — 네 함정은 전부 `-Wall -Wextra` 가 잡는다 | 6 |
| 6 | 인자는 **값 복사**, 지역 변수는 **스택**, static 은 **데이터 영역**. 재귀는 깊이를 알 때만 | 7 |

### 기본 컴파일 명령

```bash
gcc -Wall -Wextra -o 프로그램이름 소스파일.c && ./프로그램이름
```

| 옵션 | 뜻 |
|---|---|
| `-Wall -Wextra` | 흔한 실수를 경고로 알려줌 (하루 종일 켜 둠) |
| `-o 이름` | 출력 파일 이름 (없으면 `a.out`) |
| `-g` | gdb 디버깅 정보 |
| `-O0` / `-O2` | 최적화 끔 / 켬 (`-Os` = 크기 우선) |
| `-E` / `-S` / `-c` | 전처리 / 어셈블리 / 오브젝트까지만 하고 멈춤 |
| `-lm` | 수학 라이브러리(libm) 링크 (`math.h` 사용 시) |

---

## 1교시 · 개발환경과 첫 컴파일

**핵심**
- `gcc hello.c` → 이름을 안 주면 **`a.out`** 생성. `gcc hello.c -o hello` 로 이름 지정
- **컴파일과 실행은 다른 일**: 소스를 고치면 **다시 컴파일**해야 결과가 바뀐다 (Python과 다른 점)
- `main` 의 반환값 = **프로세스 종료 코드**. 셸에서 **`$?`** 로 확인. **0 = 정상**, 0이 아니면 비정상
  ```bash
  ./exitcode; echo "종료 코드: $?"   # return 7 → 종료 코드: 7
  ```
  셸 스크립트·Makefile·systemd 가 이 값으로 성공/실패를 판단한다
- `int main(void)` 의 `void` = **인자를 받지 않음**

**⚠ 함정: 헤더를 빼면**
- `#include <stdio.h>` 없이 `printf` → `error: implicit declaration of function 'printf'`
- 헤더는 "이런 함수가 있다"는 **선언**을 담는다. 선언 없이는 인자·반환 타입을 검사할 수 없음

---

## 2교시 · 빌드 과정 해부

### 빌드 4단계

```
hello.c ─①전처리(-E)→ hello.i ─②컴파일(-S)→ hello.s ─③어셈블(-c)→ hello.o ─④링크→ hello
```

| 단계 | 명령 | 하는 일 | 산출물 |
|---|---|---|---|
| ① 전처리 | `gcc -E hello.c -o hello.i` | `#include`, `#define` 을 풀어 씀 | `.i` |
| ② 컴파일 | `gcc -S hello.i -o hello.s` | C → 어셈블리 | `.s` |
| ③ 어셈블 | `gcc -c hello.s -o hello.o` | 어셈블리 → 기계어(오브젝트) | `.o` |
| ④ 링크 | `gcc hello.o -o hello` | 오브젝트 + libc → 실행파일 | 실행파일 |

**기억할 포인트**
- 6줄 `hello.c` → 약 800줄 `hello.i`: `#include` 는 그 파일을 **그 자리에 통째로 붙여넣기**
- 서식 없이 `\n` 으로 끝나는 `printf` → 컴파일러가 **`puts`** 로 바꿈 (컴파일러는 코드를 "그대로" 번역하지 않는다)
- `nm hello.o` 결과
  - `U puts` → **U = undefined**, 아직 미해결. **링크 단계**에서 해결됨
  - `T main` → **T = text(코드)**, 여기서 정의됨
- `-O0` 는 디버깅하기 쉽게 그대로, `-O2` 는 프레임 포인터 생략 등으로 코드가 짧아짐. 임베디드 릴리스는 `-O2` 또는 `-Os`

**⚠ 함정: 링크 에러**
```c
int read_sensor(void);   // 선언만 있고 정의가 없음
```
- `gcc -c` (어셈블까지)는 **성공** → 링크에서 `undefined reference to 'read_sensor'`
- 의미: **정의를 어느 .o 에서도 못 찾았다**
- 단골 원인: 함수 이름 오타 · `.c` 파일 빠뜨림 · 라이브러리 옵션(`-lm`) 누락

---

## 3교시 · 헤더/소스 분리와 Makefile

### 선언(.h) vs 정의(.c)

| 파일 | 담는 것 | 예 |
|---|---|---|
| `sensor.h` | **선언** — 무엇이 있는지 | `typedef struct {...} Reading;`, `int is_alert(Reading r);` |
| `sensor.c` | **정의** — 실제 본문 | `int is_alert(Reading r) { return r.t > 35.0; }` |
| `main.c` | 사용 | `#include "sensor.h"` |

- `"sensor.h"` (따옴표) = **현재 폴더 먼저** 찾음 / `<stdio.h>` (꺾쇠) = **시스템 경로**만
- 빌드: `gcc -Wall -Wextra main.c sensor.c -o app`

### 헤더 가드

```c
#ifndef SENSOR_H     // 가드 이름은 "파일명_H" 대문자가 관례
#define SENSOR_H
/* ... 선언들 ... */
#endif
```
- 같은 헤더가 **두 번 include 돼도** 에러가 나지 않게 막아 줌
- **⚠ 함정**: 가드를 지우고 두 번 include → `redefinition of 'struct <anonymous>'`, `conflicting types for 'Reading'`
  - 함수 **선언**은 여러 번 나와도 OK, **구조체·typedef 정의**는 한 번만 허용

### Makefile

```make
CC     = gcc
CFLAGS = -Wall -Wextra -O2

app: main.o sensor.o
	$(CC) $(CFLAGS) -o app main.o sensor.o
main.o: main.c sensor.h
	$(CC) $(CFLAGS) -c main.c
sensor.o: sensor.c sensor.h
	$(CC) $(CFLAGS) -c sensor.c
clean:
	rm -f *.o app
```

- 규칙 형식: `타깃: 의존파일` → 다음 줄 명령. **명령 줄 앞은 반드시 탭(Tab)**
- 의존 파일이 타깃보다 **새로우면(수정 시각 비교)** 명령 실행 → 바뀐 것만 다시 빌드

| 동작 | 다시 만들어지는 것 |
|---|---|
| `make` 두 번째 | 없음 (`'app' is up to date.`) |
| `touch sensor.c` | `sensor.o`, `app` |
| `touch sensor.h` | `main.o`, `sensor.o`, `app` (둘 다 sensor.h 에 의존) |

- **헤더를 의존성에 안 적으면** → 헤더를 고쳐도 오래된 `.o` 가 링크되는 "분명 고쳤는데 안 바뀌는" 버그
- 경고 읽기: `main.c:5:9: warning: unused variable 'unused' [-Wunused-variable]` → **파일:줄:열 — 종류 — [옵션 이름]**. 제출 조건은 **경고 0개**

---

## 4교시 · 자료형과 메모리 표현

### 자료형 크기 (x86-64 Linux)

| 타입 | 크기(바이트) | 비고 |
|---|---|---|
| `char` | 1 | |
| `short` | 2 | |
| `int` | 4 | |
| `long` | 8 | **Windows 에서는 4** |
| `float` / `double` | 4 / 8 | |
| `uint8_t` / `int32_t` | 1 / 4 | `stdint.h` 고정폭 타입 |
| `int *` | 8 | **32비트 MCU(ESP32)에서는 4** |

- 플랫폼마다 크기가 다르므로 **임베디드는 `stdint.h` 고정폭 타입**(`uint8_t`, `int32_t` …) 사용
- `sizeof` 결과 출력 서식은 **`%zu`** (`size_t` 용)

### 범위

| 타입 | 범위 |
|---|---|
| `uint8_t` | 0 ~ 255 |
| `int8_t` | −128 ~ 127 |
| `uint16_t` | 0 ~ 65535 |

### 리틀 엔디안
```c
int v = 0x11223344;   // 메모리: 44 33 22 11
```
- **낮은 주소에 낮은 바이트(LSB)**. 메모리 덤프·시리얼 바이트가 "거꾸로" 보이는 이유
- 네트워크 바이트 순서(**빅 엔디안**)와 반대 → 통신 프로토콜에서 항상 확인

### ⚠ 함정: 넘치면 잘린다
```c
uint8_t a = 250; a += 10;      // 260 - 256 = 4      (wrap-around)
int8_t  b = 127; b++;          // -128               (signed 오버플로 = 정의되지 않은 동작!)
unsigned char c = 300;         // 0x12C → 하위 바이트 0x2C = 44
```
- **signed 오버플로는 C 표준상 정의되지 않은 동작(UB)** → 실제 코드에서 절대 의존 금지
- `uint8_t a = 255; a++;` → **0**

### 같은 비트, 다른 해석 (2의 보수)
```c
unsigned char u = 200;   // 11001000 → 200
signed char   s = u;     // 같은 비트 → -56  (= 200 - 256)
```

### 타입 고르기 예 (센서 프레임)
```c
uint16_t distance_mm;  // 0~4000 → 255 초과, 음수 없음
int8_t   temp_c;       // -40~125 → 음수 필요, 125 ≤ 127
uint8_t  humidity;     // 0~100
// sizeof(Frame) = 4. 순서를 int8_t, uint16_t, uint8_t 로 바꾸면 6 (정렬/패딩 — Day 3)
```

---

## 5교시 · 형변환·오버플로·실수 정밀도

### ⚠ 함정: signed ↔ unsigned 비교
```c
-1 < 1              // 1 (참)
-1 < 1u             // 0 (거짓!)
-1 < sizeof(int)    // 0 (거짓!)
(unsigned)-1        // 4294967295
```
- int 와 unsigned int 를 비교하면 **int 쪽이 unsigned 로 변환** → −1(0xFFFFFFFF)이 4294967295 가 됨
- `sizeof` 결과는 **`size_t`(부호 없음)** → 배열 길이와 음수 인덱스 비교에서 자주 터짐
- `-Wextra` 의 **`-Wsign-compare`** 가 잡아 줌

### 정수 승격
```c
char c = 'A';
sizeof(c)      // 1
sizeof(c + 1)  // 4   ← 연산하는 순간 int 로 승격
c + 1          // 'B' (66)
```
- **int 보다 작은 타입은 연산에 들어가면 int 로 승격**. `uint8_t a += 10` 도 int 로 계산 후 8비트로 잘라 넣음

### ⚠ 함정: 정수 나눗셈
| 식 | 결과 | 이유 |
|---|---|---|
| `7 / 2` | 3 | 정수 나눗셈, 버림 |
| `7 / 2.0` | 3.5 | 한쪽만 실수여도 실수 연산 |
| `7 % 2` | 1 | 나머지 |
| `26 * 9 / 5 + 32` | 78.0 | 234/5 = 46 에서 이미 잘림 |
| `26 * 9.0 / 5 + 32` | 78.8 | 정상 |

- 평균 구하기: `(double)sum / 4` 또는 `sum / 4.0` ✅ / **`(double)(sum / 4)` ❌** (이미 잘린 뒤 변환)
- c = 25 일 때는 둘 다 77.0 으로 **우연히 맞음** → 테스트 값 하나로 안심 금지

### 실수 비교
```c
double a = 0.1 + 0.2;
a == 0.3                  // 0 (a = 0.30000000000000004441)
fabs(a - 0.3) < 1e-9      // 1 ← 오차 범위로 비교
(int)3.99                 // 3 ← 캐스팅은 버림 (반올림 아님)
```
- `math.h` 사용 시 **`-lm`** 필요. 빼면 `undefined reference to 'fabs'` (링크 에러)

---

## 6교시 · 연산자와 제어문

### ⚠ 함정 셋 (모두 `-Wall` 이 경고)
| 코드 | 결과 | 설명 |
|---|---|---|
| `if (x = 5)` | 항상 참 | **대입**이다 (비교는 `==`) |
| `a & b` (2, 4) | 0 | **비트** AND |
| `a && b` (2, 4) | 1 | **논리** AND |
| `1 << 3 + 1` | 16 | **`+` 가 `<<` 보다 우선** → `1 << 4` |
| `(1 << 3) + 1` | 9 | 시프트에는 **항상 괄호** |

### switch fall-through
```c
int level = 2;
switch (level) {
    case 1:  printf("FREEZE ");
    case 2:  printf("COLD ");          // break 없음 → 아래로 계속
    case 3:  printf("NORMAL "); break;
    case 4:  printf("WARM ");
    default: printf("ALERT ");
}
// 출력: COLD NORMAL
```
- **case 는 블록이 아니라 점프 목적지**. `break` 를 만날 때까지 아래로 굴러간다 (**fall-through**)
- level=1 → `FREEZE COLD NORMAL`, level=4 → `WARM ALERT`, level=9 → `ALERT`
- `-Wextra` 경고: `this statement may fall through [-Wimplicit-fallthrough=]`
  - 의도적이면 `// fall through` 주석 → 경고 사라짐
  - `case 'y': case 'Y':` 처럼 **빈 case 는 경고 없음**
- switch 안의 `break` 는 **switch 만** 빠져나옴. 중첩 루프의 `break` 도 **가장 안쪽 루프 하나만**

### 반복문
- **do-while**: 일단 한 번은 실행 (메뉴 루프에 적합)
  ```c
  do { /* 메뉴 */ } while (sel != 0);
  ```
- 소수 판별: `for (int i = 2; i * i <= n; i++)` → **√n 까지만** 검사
- `continue`: 이번 반복을 건너뛰고 다음으로
- `const char *level(double t)` → "문자열을 돌려준다"로 읽기 (포인터는 Day 2)

---

## 7교시 · 함수와 스코프

### 값 전달 (call by value)
```c
void inc(int x) { x++; }   // 복사본만 바뀜
int a = 5; inc(a);          // a 는 여전히 5
```
- C 의 인자는 **값(복사본)** 이 전달 → 원본은 **바뀌지 않는다**. 원본을 바꾸려면 **주소**를 넘긴다 (Day 2 포인터)

### 메모리 영역
| 종류 | 저장 위치 | 수명 |
|---|---|---|
| 지역 변수 | **스택** | 함수 호출 동안 (프레임과 함께 생성·소멸) |
| static 변수 / 전역 변수 | **데이터 영역** | 프로그램 끝까지 |

### 재귀와 스택 프레임 — `fact(3)`
```
fact(3) 진입
  fact(2) 진입
    fact(1) 진입
  fact(2) → 2
fact(3) → 6
```
- 들어갈 때 3→2→1, 돌아올 때 1→2→3 — **LIFO** (가장 먼저 반환되는 것은 `fact(1)`)

### static 의 두 가지 뜻
1. **함수 안 static**: 첫 호출에 한 번만 초기화, **호출 사이에 값 유지**
   ```c
   int next_id(void) { static int id = 0; return ++id; }   // 1, 2, 3, ...
   ```
2. **파일 범위(함수/전역) static**: **이 파일 밖에서 보이지 않음** (internal linkage) → 다른 .c 와 이름 충돌 방지

### ⚠ 함정: 인자 평가 순서는 정해져 있지 않다
```c
printf("%d %d %d\n", next_id(), next_id(), next_id());   // gcc → 3 2 1
```
- C 표준은 순서를 정하지 않음 (gcc 는 오른쪽부터) → **부수효과 있는 호출을 한 식에 여러 번 넣지 말 것**, 변수에 먼저 받기

### 재귀의 한계
- `depth(10000000)` → **Segmentation fault (스택 오버플로)**
- PC 스택 ≈ 8MB, **ESP32 태스크 스택은 수 KB** → 임베디드에서 재귀는 깊이를 확실히 알 때만

### 이동평균 필터 (static 활용)
```c
double moving_avg(double x) {
    static double buf[4] = {0};
    static int idx = 0;
    static double sum = 0;
    sum -= buf[idx]; buf[idx] = x; sum += x;
    idx = (idx + 1) % 4;       // 0,1,2,3,0,...
    return sum / 4;
}
```
- `static` 이 없으면 매번 0으로 초기화 → 평균이 아니라 `x/4` 가 나옴

---

## 8교시 · 종합 실습 — 숫자 야구

**과제**: 서로 다른 세 자리 숫자 맞히기. 파일 4개(`main.c`, `game.c`, `game.h`, `Makefile`), `-Wall -Wextra` 경고 0개

| 함수 | 역할 | 쓰이는 개념 |
|---|---|---|
| `gen_answer(int ans[3])` | 중복 없는 0~9 세 개 생성 (`srand(time(NULL))` 은 main 에서 **한 번**) | 배열, 반복문, `rand() % 10` |
| `read_guess(int g[3])` | 입력 성공 1 / 실패 0 | `scanf` 반환값 검사, 입력 버퍼 비우기 |
| `is_valid(const int g[3])` | 0~9 이고 서로 다른지 | 이중 for |
| `judge(..., int *s, int *b)` | 자리·숫자 같으면 S, 숫자만 같으면 B | 이중 for, 포인터 인자 |
| `print_result(s, b, tries)` | `"1S 2B"`, 3S 면 시도 횟수 출력 | printf 서식 |

**핵심 코드 조각**
```c
// 입력 실패 시 남은 입력 버리기
if (scanf("%d %d %d", &g[0], &g[1], &g[2]) != 3) {
    int c; while ((c = getchar()) != '\n' && c != EOF) {}
    return 0;
}
// judge 안
if (i == j) (*strike)++;   // ⚠ *strike++ 는 포인터를 먼저 옮김!
else        (*ball)++;
```

**제출 체크리스트**
- [ ] `make clean && make` 가 처음부터 성공
- [ ] `-Wall -Wextra` 경고 0개
- [ ] `"12"`, `"abc"`, `"1 1 2"` 입력에서 죽지 않고 다시 묻는다

---

## 📝 시험 직전 체크 — 헷갈리기 쉬운 것 모음

| 질문 | 답 |
|---|---|
| `-o` 없이 gcc 출력 파일 | `a.out` |
| 종료 코드 확인 | `echo $?` (0 = 정상) |
| 전처리 / 어셈블리 / 오브젝트까지 멈춤 옵션 | `-E` / `-S` / `-c` |
| 전처리 결과 확장자 | `.i` |
| `nm` 의 `U` / `T` | 미해결(undefined) / 코드(text)에 정의됨 |
| `undefined reference` 는 어느 단계? | **링크** (정의를 못 찾음) |
| 서식 없는 `printf("...\n")` 은? | `puts` 로 바뀜 |
| `"x.h"` vs `<x.h>` | 현재 폴더 먼저 / 시스템 경로만 |
| Makefile 명령 앞 | **탭** |
| make 가 비교하는 것 | 수정 시각(타임스탬프) |
| `0x11223344` 리틀 엔디안 첫 바이트 | `0x44` |
| `uint8_t 255 + 1` | 0 |
| `int8_t 127 + 1` | −128 (단, UB) |
| 300 → `unsigned char` | 44 |
| 200 → `signed char` | −56 |
| `-1 < 1u` | 0 (거짓) |
| `sizeof(c + 1)` (c 는 char) | 4 |
| `(int)3.99` | 3 |
| `0.1 + 0.2 == 0.3` | 0 (거짓) → `fabs(a-b) < 1e-9` |
| `1 << 3 + 1` | 16 |
| `2 & 4` / `2 && 4` | 0 / 1 |
| 지역 변수 / static 저장 위치 | 스택 / 데이터 영역 |
| 인자 평가 순서 | 정해져 있지 않음 (gcc 는 오른쪽부터) |
