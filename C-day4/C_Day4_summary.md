# C 언어 Day 4 요약노트 — 파일 I/O·디버깅·종합 프로젝트

> 출처: HYUNDAI AI Insight Campus · 프로그래밍 언어(C) 4/4 · 9/10(목) 강의자료 (`C_Day4_lecture.html`)
> 함께 보기: [퀴즈 문제·정답](quiz_answers.md) · 퀴즈 풀기 페이지 [`quiz.html`](quiz.html)

> 📌 **9/14 파트 평가**: 필답(4일 워크시트 범위) + 실습(오늘 프로젝트 변형). 강의자료는 복습 퀴즈 4종을 먼저 다시 풀라고 안내합니다.

---

## 🧭 한눈에 보기 — 4일의 여섯 문장

| Day | 핵심 문장 |
|---|---|
| 1 | 컴파일은 4단계, 선언은 .h 정의는 .c, 자료형은 바이트 수와 해석 규칙, `-Wall -Wextra` 는 항상 |
| 2 | `&` 는 주소 `*` 는 값, 배열은 넘기면 포인터, 문자열은 `\0` 까지, malloc → 검사 → free |
| 3 | 구조체는 통째 복사, 비트는 `\|=` `&=~` `^=`, 매크로는 텍스트, 함수도 주소, 상태 = 인덱스 |
| 4 | **fopen → 검사 → fclose**, 텍스트는 **사람이**·바이너리는 **기계가**, 링 버퍼는 **고정 메모리**, gdb·assert·ASan 은 **버그를 일찍 터뜨린다** |
| 임베디드로 | 고정폭 타입, 바이트 조립, volatile 레지스터, 콜백, 링 버퍼, 반환값 에러 규약 |
| 다음 주 ESP32 | 바뀌는 건 `GPIO_OUT` 한 줄과 `main` 이 `loop()` 가 되는 것뿐 |

### 오늘의 두 가지 빌드
```bash
gcc -Wall -Wextra -g -O0 -o app app.c                  # 디버깅용: 최적화 끔 (gdb 가 변수를 제대로 보여줌)
gcc -Wall -Wextra -g -fsanitize=address -o app app.c   # 메모리 오류 검출용 (valgrind 보다 빠름)
```

> 오늘의 함정은 **파일이 없거나, 닫지 않거나, 다른 컴퓨터에서 안 읽히는 것**들입니다.

---

## 1교시 · 파일 열고 닫기 — FILE*, 모드, 에러

```c
FILE *fp = fopen("temps.txt", "r");     // 실패하면 NULL
if (fp == NULL) { perror("fopen temps.txt"); return 1; }   // → fopen temps.txt: No such file or directory
while (fgets(line, sizeof line, fp)) { ... }   // stdin 자리에 fp
fclose(fp);                             // 열었으면 닫는다 (malloc/free 의 짝처럼)
```
- `stdin`, `stdout`, `stderr` 도 미리 열려 있는 **`FILE *`**
- 명령줄 인자: `argv[1]` 은 첫 인자. **`argc` 검사를 빼면** 인자 없이 실행 시 `argv[1]` 이 NULL → 세그폴트

### 모드 문자열
| 모드 | 뜻 | 파일이 없으면 | 파일이 있으면 |
|---|---|---|---|
| `"r"` | 읽기 | **실패(NULL)** | 처음부터 읽음 |
| `"w"` | 쓰기 | 새로 만듦 | **내용을 지우고 시작** |
| `"a"` | 덧붙이기 | 새로 만듦 | **끝에 이어 씀** |
| `"r+"` | 읽기+쓰기 | 실패 | 처음부터 |
| `"rb"` `"wb"` `"ab"` | 바이너리 | (같음) | |

- ⚠ **가장 흔한 사고**: 로그 파일을 `"w"` 로 열어 실행할 때마다 이전 기록이 사라짐 → **로그는 `"a"`**

### ⚠ 함정: errno 는 즉시 읽는다
```c
if (!fp) {
    int err = errno;                                   // 다른 함수를 부르기 전에 저장!
    printf("errno=%d: %s\n", err, strerror(err));      // errno=2: No such file or directory
}
```
- errno 는 **전역 변수** → 그 뒤에 부른 함수(printf 포함)가 덮어쓸 수 있음 → **실패 직후** 복사
- MCU 에서는 errno 대신 **함수 반환값으로 오류를 돌려주는 규약** 사용

### ⚠ 함정: 닫지 않으면
- `fclose` 를 빠뜨리고 2000번 열기 → `fopen: Too many open files` (i=1021 에서, 한계 보통 **1024**)
- `fclose` 는 **버퍼에 남은 내용을 실제로 쓰는 시점**이기도 함

---

## 2교시 · 텍스트 쓰기와 CSV 로그

```c
fprintf(out, "%d,%.1f,%s\n", 1, 25.3, "IDLE");   // printf 와 같은 서식, 첫 인자만 다름
fputs("2,17.0,HEAT\n", out);                     // 서식 없이 문자열만
```
- **`printf(...)` = `fprintf(stdout, ...)`**
- **오류 메시지는 `fprintf(stderr, ...)`** → `./app > out.csv` 로 결과만 파일에 담아도 오류는 화면에 보임

### ⚠ 함정: 버퍼링 — 썼는데 파일이 비어 있다
- `fprintf` 는 **메모리 버퍼**(보통 4KB)에 모았다가 **버퍼가 차거나 `fflush`/`fclose` 때** 실제로 씀
- 그 사이 프로그램이 죽거나 전원이 끊기면 내용이 사라짐
- 로그가 중요하면 **줄마다 `fflush`**, 또는 `setvbuf(out, NULL, _IOLBF, 0)` 로 줄 단위 버퍼링
- 기본값: **화면(stdout)은 줄 단위, 파일은 블록 단위**

### CSV 로 쓰고 다시 읽기
```c
int parse_row(const char *line, Row *out) {          // "1,25.3,IDLE"
    char buf[64];
    snprintf(buf, sizeof buf, "%s", line);           // strtok 은 원본을 고치므로 "복사본"
    char *a = strtok(buf, ","), *b = strtok(NULL, ","), *c = strtok(NULL, ",\n");
    if (!a || !b || !c) return 0;
    char *end;
    out->seq = (int)strtol(a, &end, 10); if (end == a) return 0;
    out->t   = strtod(b, &end);          if (end == b) return 0;
    snprintf(out->state, sizeof out->state, "%s", c);
    return 1;
}
```
- 헤더 줄은 첫 `fgets` 로 건너뛰기

| | 텍스트(CSV) | 바이너리 |
|---|---|---|
| 장점 | **사람이 읽을 수 있음**, Excel·Python 이 바로 엶 | **파싱 불필요**, 정확도 손실 없음 |
| 단점 | 크기가 크고 **파싱 필요** | 다른 장치에서 안 읽힐 수 있음 |

---

## 3교시 · 바이너리 I/O — 구조체 통째로, fseek

```c
Reading r[3] = {...};                               // sizeof(Reading) = 16
FILE *fp = fopen("log.bin", "wb");
fwrite(r, sizeof r[0], 3, fp);                      // (주소, 요소 크기, 개수, 파일) — qsort 와 같은 모양
fclose(fp);

fp = fopen("log.bin", "rb");
fseek(fp, 0, SEEK_END);  long size = ftell(fp);     // 파일 크기 = 48바이트 = 3 records
fseek(fp, 1 * sizeof(Reading), SEEK_SET);           // 두 번째 레코드로 점프
fread(&x, sizeof x, 1, fp);                         // → 17.0 55 118
```
| 관용구 | 코드 |
|---|---|
| 파일 크기 재기 | `fseek(fp, 0, SEEK_END);` 뒤 `ftell(fp)` |
| n 번째 레코드로 점프 | `fseek(fp, n * sizeof(레코드), SEEK_SET)` |
| 처음으로 | `rewind(fp)` = `fseek(fp, 0, SEEK_SET)` |

- `od -A d -t x1 log.bin` 으로 바이트 확인: 25.3(double, LE) → `cd cc cc cc cc 4c 39 40`, 60 → `3c 00 00 00`

### ⚠ 함정: 다른 컴퓨터에서 안 읽힌다
- 구조체를 통째로 쓰는 것은 **같은 컴파일러·같은 CPU 에서만 안전**
- 두 원인: **패딩(정렬)** 과 **엔디안** (예: `{char; int; char}` 는 PC 12바이트, pack(1) 컴파일러 6바이트, 빅엔디안 CPU 는 바이트 뒤집힘)
- 다른 장치와 주고받는 파일은 **필드별로 정해진 순서로 바이트를 쓰고 읽는다 (직렬화)**

### 전체 읽기 — 크기를 먼저 재고 malloc
```c
fseek(fp, 0, SEEK_END); long size = ftell(fp); rewind(fp);
int n = (int)(size / sizeof(Reading));
Reading *a = malloc(n * sizeof *a);
if (!a) { fclose(fp); return NULL; }
if (fread(a, sizeof *a, n, fp) != (size_t)n) { free(a); fclose(fp); return NULL; }
```
- 바이너리는 크기를 미리 알 수 있어 realloc 루프가 필요 없음. **실패 경로마다 fclose/free 를 빠뜨리지 않기**

### 레코드 하나만 고쳐 쓰기
```c
FILE *fp = fopen(path, "r+b");                 // 읽고 쓰기, 기존 내용 유지 ("w+b" 는 파일을 지움!)
fseek(fp, idx * (long)sizeof r, SEEK_SET);
fread(&r, sizeof r, 1, fp);
r.t = new_t;
fseek(fp, idx * (long)sizeof r, SEEK_SET);     // fread 로 커서가 전진했으니 되돌아가기
fwrite(&r, sizeof r, 1, fp);
```
- 읽기와 쓰기를 번갈아 할 때는 사이에 **`fseek`/`fflush`** 가 필요 (표준 규칙)

---

## 4교시 · 링 버퍼 — 고정 메모리로 흐르는 데이터 받기

- 왜? 센서는 초당 100번, 로그는 1초에 한 번. realloc 은 MCU 에서 위험하고 배열을 당기는 건 느림 → **고정 배열을 원형으로** 쓰면 할당도 이동도 없음

```c
#define RING_CAP 4                  // 2의 거듭제곱이면 % 대신 & (CAP-1) 가능
typedef struct {
    double buf[RING_CAP];
    int head;    // 다음에 "쓸" 자리
    int tail;    // 다음에 "읽을" 자리
    int count;   // 들어 있는 개수
} Ring;

void ring_push(Ring *r, double v) {
    if (r->count == RING_CAP) {              // 가득: 가장 오래된 것 버림 (덮어쓰기 정책)
        r->tail = (r->tail + 1) % RING_CAP;
        r->count--;
    }
    r->buf[r->head] = v;
    r->head = (r->head + 1) % RING_CAP;      // 끝에서 0 으로 감김
    r->count++;
}
bool ring_pop(Ring *r, double *out) {
    if (r->count == 0) return false;
    *out = r->buf[r->tail];
    r->tail = (r->tail + 1) % RING_CAP;
    r->count--;
    return true;
}
// 순회: tail 부터 count 개 → r->buf[(r->tail + i) % RING_CAP]
```
- 입력 `25 25 25 25 37 25 25 25` → 가득 찬 뒤 37 이 들어오면 avg 28.00. Day 1 `moving_avg` 의 static 배열이 바로 이것

### 가득 찼을 때의 정책
| 정책 | 용도 |
|---|---|
| **덮어쓰기** (최신 우선) | 센서 표시 |
| **거부** (과거 보존, `return false`) | 이벤트 로그 (+경고) |

### ⚠ 함정: head == tail 은 비었나, 가득 찼나
- count 없이 head/tail 만 쓰면 **비었을 때와 가득 찼을 때 모두 `head == tail`** → 구분 불가
- 해법: ① **count 필드** ② **한 칸 비워 두기** (CAP−1 개만 저장) ③ head/tail 을 감지 않고 `%` 는 접근 시에만
- 인터럽트가 push, 메인이 pop 하는 구조에서는 count 를 양쪽이 동시에 고치면 깨짐 → ②나 ③ + head/tail 을 **`volatile`** 로

---

## 5교시 · 디버깅 — gdb, assert, sanitizer

### gdb 기본 다섯 명령 (avg.c 예제)
```c
for (int i = 1; i < n; i++) sum += a[i];   // 버그: i = 0 이어야 함 → 25.50 대신 19.50
```
| 명령 | 확인한 것 |
|---|---|
| `break average` · `run` | 의심 가는 함수 입구에서 멈추기 |
| `print n` · `print a[0]@n` | 들어온 데이터가 맞는지 (`@n` = 배열 n 개 보기) |
| `next` · `print i` | 한 줄씩 가며 변수가 예상과 다른 첫 순간 찾기 |
| `bt` | 누가 이 함수를 불렀는지 (**세그폴트 때 가장 먼저**) |
| `finish` | 함수 끝까지 돌리고 반환값 확인 |

### gdb_lab.c 로 넓힌 명령
| 실습 | 명령 | 쓰임 |
|---|---|---|
| A 둘러보기 | `list`, `break 파일:줄`, `tbreak`, `info breakpoints`, `disable`/`delete`, `start` | `start` = tbreak main + run |
| B 호출 따라가기 | `step`, `info args`, `info locals`, `finish`, `until 줄` | `next` 는 함수를 **건너뛰고**, `step` 은 함수 **안으로** |
| C 값 보기 | `print/x` `/t` `/d` `/c`, `x/16xb 주소`, `x/s`, `ptype`, `p arr[i]@n` | 메모리를 바이트 단위로 보기 |
| D 조건부 중단점 | `break 34 if c > 30`, `condition N 식`, `ignore N 횟수` | 1000번 반복 중 "이상할 때만" 멈춤 |
| E 값 감시 | `watch node.level` | **"누가 이 값을 바꿨지?"** — 중단점 위치를 모를 때 가장 강력 |
| F 스택 | `bt`, `bt N`, `frame N`, `up`, `down` | 실행이 아니라 **보는 위치만** 옮김 |
| G 실행 중 조작 | `display`, `call 함수(인자)`, `set var x = 값` | 다시 컴파일하지 않고 "고치면 맞을까?" 실험 |

- gdb_lab 의 버그 정리: 증상 3개, **원인 2개**
  1. `set_name` 이 길이 검사 없이 12글자를 `name[8]` 에 복사 → 옆 필드 `level` 을 덮음 (`0x524f534e` = "NSOR")
  2. 보정표 `GAIN[6]` 오타(10.0) → t 가 47.56
  3. flags 0x60 은 ②의 결과 (②를 고치면 저절로 사라짐)
- 화면 분할: `gdb -tui ./app` 또는 `layout src`
- 세그폴트 한 줄: `gdb -batch -ex run -ex bt ./app`
- gdb 로 변수·줄 번호를 보려면 **`-g`**, 코드 순서가 뒤바뀌지 않게 하려면 **`-O0`**

### assert — 전제 조건을 코드로
```c
#include <assert.h>
assert(n > 0 && "median of empty array");   // 위반하면 즉시 중단 + 파일:줄 출력
assert(out != NULL);
assert(r->count >= 0 && r->count <= RING_CAP);   // 불변 조건(invariant)
```
- 릴리스에서 **`-DNDEBUG`** 로 제거됨 → **부수효과 있는 식 금지** (`assert(fp = fopen(...))` 는 릴리스에서 fopen 자체가 사라짐)

### AddressSanitizer (ASan)
```bash
gcc -g -fsanitize=address san.c -o san && ./san
# ERROR: AddressSanitizer: stack-buffer-overflow ... san.c:2
```
- 배열 밖 접근, 힙 오버플로, 해제 후 사용, 누수(`ASAN_OPTIONS=detect_leaks=1`)를 **실행 시점**에 잡고 줄 번호를 줌
- 개발 중에는 켜 두고 릴리스에서 뺌 (2~3배 느림)

---

## 6교시 · 코드 품질 — 모듈 구조, 에러 규약, 테스트 타깃

### 모듈 하나 = .h(계약) + .c(구현)
```
sensor_logger/
├── frame.h / frame.c     Day 2  프레임 파싱   parse_frame()
├── ring.h  / ring.c      Day 4  링 버퍼       ring_push/pop/avg
├── fsm.h   / fsm.c       Day 3  상태 머신     fsm_step()
├── gpio.h                Day 3  핀 매크로     GPIO_SET/CLR
├── logger.h / logger.c   Day 4  파일 로깅     log_open/log_row/log_close
├── main.c                       조립만
├── test_ring.c                  단위 테스트
└── Makefile
```
- 기준 세 가지
  1. 헤더에는 **다른 모듈이 알아야 할 것만**, 구현 세부는 `.c` 의 **`static`** 으로 숨김
  2. 모듈은 **한 방향(아래로)만 의존** — `ring.c` 는 `frame.h` 를 모른다
  3. **`main.c` 에는 로직이 없다** — 조립만

### 에러 규약 — 한 프로젝트에 한 가지
| 규약 | 형태 | 예 |
|---|---|---|
| A | 성공 1 / 실패 0 | `parse_frame`, `ring_pop`, `log_open` (오늘 프로젝트) |
| B | 성공 0 / 실패 음수 에러 코드 | MCU 드라이버 스타일, ESP32 의 `esp_err_t` |
| C | 포인터 반환, 실패 NULL | `load_bin`, `malloc`, `fopen` |
- 어느 것이든 되지만 **섞지 않는 것**이 핵심

### logger 핵심
```c
lg->fp = fopen(path, "a");
fseek(lg->fp, 0, SEEK_END);
if (ftell(lg->fp) == 0) fputs("seq,temp,hum,dist,state\n", lg->fp);   // 새 파일이면 헤더
fflush(lg->fp);                                          // 줄마다 실제 기록
if (lg->fp) { fclose(lg->fp); lg->fp = NULL; }           // 두 번 닫아도 안전
```

### 단위 테스트 + Makefile 타깃
```make
test: test_ring                     # make test
	./test_ring
asan: CFLAGS += -fsanitize=address  # make asan → ASan 빌드
asan: clean logger
debug: logger                       # make debug → 죽으면 스택 출력
	gdb -batch -ex run -ex bt --args ./logger temps.txt
%.o: %.c                            # 패턴 규칙: 모든 .c → .o
	$(CC) $(CFLAGS) -c $<
.PHONY: test asan debug clean
```
| 자동 변수 | 뜻 |
|---|---|
| `$@` | 타깃 이름 |
| `$^` | 의존 파일 전체 |
| `$<` | 첫 번째 의존 파일 |
- `make test` 가 통과하지 않으면 main 을 건드리지 않는 것이 규칙

---

## 7·8교시 · 종합 프로젝트 — 센서 데이터 수집기 `logger`

```
./logger temps.txt
  → parse_frame (Day 2)
  → 링 버퍼에 push, 이동평균 (Day 4)
  → 이동평균을 상태 머신에 (Day 3)   ← 튀는 값 하나에 반응하지 않게
  → 전이가 일어나면 events.log 에 한 줄 ("a")
  → 모든 행을 readings.csv 에 ("w", 매 실행 새로)
  → 끝나면 readings.bin 에 구조체 통째로
```

| 요구 | 확인 방법 |
|---|---|
| 파일 인자가 없거나 못 열면 usage/perror 후 **종료 코드 1** | `./logger; echo $?` → 1 |
| BAD 프레임은 stderr 에 줄 번호와 함께, 계속 진행 | `2>/dev/null` 로 걸러짐 |
| **이동평균(RING_CAP=4)** 을 `fsm_step` 에 넘긴다 | 37.2 하나로 ALERT 가 되지 않음 |
| 전이 시 events.log 에 `seq,avg,from,to` 덧붙임 | 두 번 실행하면 이어짐 |
| readings.csv 는 매 실행 새로 (`"w"`) | 헤더 1줄 + 데이터 |
| readings.bin 에 Reading 배열 통째 | 크기 = rows × 16 |
| `make test` 통과, `make asan` 에러 0 | 제출 조건 |

```bash
make && ./logger temps.txt
# rows=10 bad=0 events=1
# IDLE 6 / HEAT 0 / COOL 4 / ALERT 0
cat events.log    # 7,29.75,IDLE,COOL
ls -l readings.bin   # 160 = 10 × 16
```
- Day 3 컨트롤러는 같은 입력에서 HEAT 2·ALERT 2 → **이동평균 필터가 튀는 값을 무시**한 차이
  - 장점: 오경보 없음 / 단점: 진짜 위험에 늦게 반응

**제출 체크리스트**
- [ ] `make clean && make && make test` 경고 0 · `test_ring: OK`
- [ ] `make asan && ./logger temps.txt` 에서 ASan 에러 0
- [ ] `./logger` (인자 없음) → usage + 종료 코드 1, `./logger nope.txt` → perror + 1
- [ ] events.log 는 이어지고(`"a"`), readings.csv 는 새로(`"w"`)
- [ ] readings.bin 크기 = rows × 16

---

## 📝 시험 직전 체크 — 헷갈리기 쉬운 것 모음

| 질문 | 답 |
|---|---|
| fopen 실패 시 반환값 | NULL |
| 로그 이어 쓰기 모드 / 내용을 지우는 모드 | `"a"` / `"w"` |
| errno 는 언제 읽나 | 실패 직후 (다른 함수가 덮어씀) |
| fopen 의 짝 | fclose (빠뜨리면 파일 수 한계·버퍼 미기록) |
| stdin/stdout/stderr 의 타입 | `FILE *` |
| `printf(...)` 와 같은 것 | `fprintf(stdout, ...)` |
| 오류 메시지는 어디로 | stderr |
| fprintf 내용이 실제 기록되는 때 | 버퍼가 차거나 fflush / fclose 때 |
| CSV 파싱 전에 줄을 복사하는 이유 | strtok 이 원본을 고치므로 |
| `fwrite` 인자 순서 | 주소, 요소 크기, 개수, 파일 |
| 파일 크기 관용구 | `fseek(fp, 0, SEEK_END)` + `ftell` |
| n 번째 레코드로 | `fseek(fp, n * sizeof(rec), SEEK_SET)` |
| 레코드 수정 시 여는 모드 | `"r+b"` (`"w+b"` 는 지움) |
| 바이너리가 다른 장치에서 안 읽히는 원인 | 패딩(정렬) / 엔디안 |
| 바이너리의 장점 | 파싱 불필요, 정확도 손실 없음 |
| 링 버퍼 head / tail | 다음에 쓸 자리 / 다음에 읽을 자리 |
| 인덱스를 0 으로 감는 연산 | `% RING_CAP` |
| count 없이 head/tail 만 쓰면 | 빈 것과 가득 찬 것을 구분 못 함 |
| 인터럽트 공유 head/tail 한정자 | `volatile` |
| gdb 용 컴파일 옵션 | `-g` / `-O0` |
| `next` vs `step` | 함수를 건너뜀 / 함수 안으로 |
| 세그폴트 후 첫 명령 | `bt` |
| 값을 바꾼 코드 찾기 | `watch` |
| 조건부 중단점 | `break 줄 if 조건` |
| assert 를 없애는 매크로 | `NDEBUG` |
| `-fsanitize=address` 가 잡는 시점 | 실행 시점 |
| 헤더에 넣을 것 / 숨길 것 | 다른 모듈이 알아야 할 것 / `static` |
| 모듈 의존 방향 | 한 방향 |
| 에러 규약의 핵심 | 섞지 않는 것 |
| `$@` / `$^` / `$<` | 타깃 / 의존 전체 / 첫 의존 |
| `%.o: %.c` | 패턴 규칙 |
