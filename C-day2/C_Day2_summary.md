# C 언어 Day 2 요약노트 — 포인터·배열·문자열·동적 메모리

> 출처: HYUNDAI AI Insight Campus · 프로그래밍 언어(C) 2/4 · 9/8(화) 강의자료 (`C_Day2_lecture.html`)
> 함께 보기: [퀴즈 문제·정답](quiz_answers.md) · 퀴즈 풀기 페이지 [`quiz.html`](quiz.html)

---

## 🧭 한눈에 보기 — 오늘의 여섯 문장

| # | 핵심 문장 | 교시 |
|---|---|---|
| 1 | `&` 는 **주소**, `*` 는 그 주소의 **값**. 원본을 바꾸려면 **주소를 넘긴다** | 1 |
| 2 | `p + 1` 은 **`sizeof(*p)` 바이트** 이동. 포인터 뺄셈은 **요소 개수** | 2 |
| 3 | 배열은 함수에 넘기는 순간 **포인터가 된다** — **길이를 같이 넘겨라** | 3 |
| 4 | 배열 밖에 쓰면 컴파일러는 **막지 않는다**. 옆 변수가 조용히 바뀐다 | 4·5 |
| 5 | 문자열은 **`'\0'` 까지**. `char[]` 는 수정 가능, `char *` 리터럴은 **읽기 전용**. `fgets`·`snprintf`·`strtol` 을 쓴다 | 5·6 |
| 6 | **malloc → NULL 검사 → 사용 → free**. 누가 free 하는지 적어라. **valgrind** 로 확인 | 7 |

### 오늘의 컴파일·디버깅 명령

```bash
gcc -Wall -Wextra -g -o 프로그램이름 소스파일.c && ./프로그램이름   # -g : 세그폴트 위치를 찾기 위해
gdb -batch -ex run -ex bt ./프로그램이름 2>&1 | tail -5            # 세그폴트 난 줄 찾기
valgrind --leak-check=full ./프로그램이름                          # 메모리 누수·잘못된 접근 찾기
```

---

## 1교시 · 포인터 기초 — Day 1의 빚 갚기

**핵심**
```c
int x = 5;
int *p = &x;     // p 는 "x 의 주소"를 담는다
*p = 42;         // p 를 통해 x 를 바꾼다 → x == 42
```
- `&x` = x 의 **주소**, `*p` = p 가 가리키는 곳의 **값**
- `int *p` 는 "**`*p` 하면 int 가 나온다**"로 읽기. p 자체는 **8바이트**(64비트), `*p` 는 int **4바이트**
- 주소 출력: `printf("%p", (void *)p)` — 값은 실행마다 다름

### 원본을 바꾸려면 주소를 넘긴다
```c
void inc_wrong(int x)  { x++; }        // 복사본만 바뀜 → 원본 그대로
void inc_right(int *p) { (*p)++; }     // 원본이 바뀜
void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

inc_right(&x);  swap(&x, &y);
```
- Day 1 숫자 야구의 `judge(ans, g, &s, &b)` 가 두 값을 돌려줄 수 있었던 이유
- **반환값은 성공/실패, 결과는 포인터로** — `scanf`, `strtol` 같은 C 라이브러리의 흔한 모양

### ⚠ 함정
| 코드 | 결과 | 설명 |
|---|---|---|
| `int *p; *p = 10;` | **Segmentation fault** | 초기화 안 된 포인터 = 쓰레기 주소. `-Wuninitialized` 경고 |
| `*p++` | 값을 쓴 뒤 **p 를 다음 칸으로** | 후위 `++` 가 `*` 보다 우선 → `*(p++)` |
| `(*p)++` | **가리키는 값**을 1 증가 | 괄호 필수 |

- 포인터는 반드시 `&변수`, 배열, malloc 결과, 또는 **`NULL`** 로 초기화. NULL 은 `if (p == NULL)` 로 검사 가능

---

## 2교시 · 포인터 산술과 const

### p + 1 은 1바이트가 아니다
- **`p + n` 은 `n * sizeof(*p)` 바이트 이동**

| 포인터 타입 | `+1` 이동 거리 |
|---|---|
| `char *` | 1바이트 |
| `int *` | 4바이트 |
| `double *` | 8바이트 |

- `*(p + 2)` == `*(arr + 2)` == `arr[2]`
- **포인터 뺄셈 = 요소 개수**: `&arr[4] - &arr[0]` → **4** (바이트 수 아님)
- 같은 메모리 6바이트를 `uint16_t *` 로 재면 3, `uint8_t *` 로 재면 6

### 바이트 배열 → uint16_t (리틀 엔디안)
```c
uint8_t buf[4] = {0x2C, 0x01, 0x3C, 0x00};
uint16_t *w = (uint16_t *)buf;          // 방법 1: 캐스팅 → 300 60 (정렬이 맞을 때만)
uint16_t dist = buf[0] | (buf[1] << 8); // 방법 2: 바이트 조립 → 300 (이식성 100%, 임베디드 권장)
```
- 정렬(alignment)이 맞지 않는 주소를 `uint32_t *` 로 캐스팅하면 **일부 MCU 에서는 죽는다**

### const 는 오른쪽에서 왼쪽으로 읽는다
| 선언 | 읽는 법 | `*p = 9` | `p = &b` |
|---|---|---|---|
| `const int *p1` | p1 은 **const int 를 가리킨다** | ❌ | ✅ |
| `int *const p2` | p2 는 int 를 가리키는 **const 포인터** | ✅ | ❌ |
| `const int *const p3` | 둘 다 const | ❌ | ❌ |

- 함수 인자에 `const int *a` → "이 함수는 배열을 **읽기만** 한다"는 약속 + 컴파일러 검사

---

## 3교시 · 배열과 포인터

### arr[i] 는 *(arr + i)
```c
int arr[5] = {10, 20, 30, 40, 50};
arr[2] == *(arr + 2) == 2[arr]               // 셋 다 30 (2[arr] 는 이해만, 쓰지 말 것)
arr == &arr[0]                               // 같은 주소
sizeof(arr)                  // 20 (5 × 4)
sizeof(arr) / sizeof(arr[0]) // 5  ← 요소 개수 관용구
```

### ⚠ 함정: 함수 안에서 sizeof(arr) 는 8
```c
void show(int arr[]) {          // 사실은 int *arr
    sizeof(arr);                // 8 (포인터 크기!)
}
int sum(const int *a, int n);   // 그래서 길이는 따로 받는다
```
- 배열을 함수에 넘기면 **첫 요소의 주소 하나만** 전달 = **감쇠(decay)** → 길이 정보가 **사라진다**
- 경고: `'sizeof' on array function parameter 'arr' will return size of 'int *'`
- 그래서 C 라이브러리는 `fwrite(buf, size, n, fp)` 처럼 (배열, 길이)를 함께 받는다

### 2차원 배열 — 행 우선, 한 덩어리
```c
int m[2][3] = {{1,2,3},{4,5,6}};
sizeof(m)                    // 24
&m[1][0] - &m[0][0]          // 12바이트 (한 행 = 3 × 4)
```
- `m[i][j]` 주소 = 시작 + **(i × 열수 + j) × 4** → 함수에 넘길 때 **열 수를 알려야** 함: `int m[][3]`

---

## 4교시 · 정렬과 검색

### 버블 정렬 (swap 재사용)
```c
for (int i = 0; i < n - 1; i++)
    for (int j = 0; j < n - 1 - i; j++)       // 뒤쪽 i 개는 이미 자리 잡음
        if (a[j] > a[j + 1]) swap(&a[j], &a[j + 1]);
```
- `{26,25,37,25,24}` → `24 25 25 26 37` (7 swaps)
- `-1` 을 빼면 `a[j+1]` 이 `a[n]` 을 읽음 → **배열 밖 (off-by-one)**

### 이진 검색 — 정렬돼 있어야 한다
```c
int lo = 0, hi = n - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;   // (lo+hi)/2 는 정수 오버플로 가능
    if (a[mid] == key) return mid;
    if (a[mid] < key) lo = mid + 1; else hi = mid - 1;
}
return -1;                           // "없음" = -1 (유효 인덱스와 안 겹침)
```

### ⚠ 함정: 배열 밖은 조용히 남의 것을 덮는다
```c
struct Dev { char name[8]; int level; };
strcpy(d->name, "ESP32-SENSOR");   // 13글자 → 8칸 넘침
// level = 1380930382 (0x524F534E = "NSOR") ← 넘친 글자가 옆 필드로
```
- 배열 밖에 써도 **컴파일 에러는 나지 않는다** (경고는 날 수 있음)
- 스택이면 glibc 가 `*** stack smashing detected ***` 로 잡기도 하지만, **MCU 에는 그런 보호가 없다**

### 중앙값
```c
if (n % 2 == 1) return a[n / 2];
return (a[n / 2 - 1] + a[n / 2]) / 2.0;   // / 2 로 쓰면 정수 나눗셈 함정 (25.5 → 25.0)
```

---

## 5교시 · 문자열 — char 배열과 널 종료

### "ABC" 는 4바이트
```c
char  s1[] = "ABC";   // 스택에 {'A','B','C','\0'} 복사 — 수정 가능
char *s2   = "ABC";   // 읽기 전용 리터럴을 가리키는 포인터

sizeof(s1)   // 4 (널 포함)
sizeof(s2)   // 8 (포인터 크기)
strlen(s1)   // 3 (널 전까지)
s1[0] = 'X'; // OK → "XBC"
s2[0] = 'X'; // Segmentation fault (리터럴은 읽기 전용 영역)
```
- 리터럴은 **`const char *`** 로 선언 → 수정 시도를 **컴파일 에러**로 바꿀 수 있다

### 라이브러리 함수 직접 구현
```c
size_t my_strlen(const char *s) { const char *p = s; while (*p) p++; return p - s; }
char *my_strcpy(char *d, const char *s) { char *r = d; while ((*d++ = *s++) != '\0') {} return r; }
int my_strcmp(const char *a, const char *b) {
    while (*a && *a == *b) { a++; b++; }
    return (unsigned char)*a - (unsigned char)*b;   // 0 이면 같음
}
```
- **`strcmp` 가 0 이면 같다** → `if (strcmp(a, b))` 는 "**다르면**"이라는 뜻 (자주 틀림)

### 문자열에서 값 찾기
| 함수 | 역할 |
|---|---|
| `strstr(s, "T=")` | 부분 문자열이 시작하는 위치 |
| `strchr(s, '*')` | 문자 위치 |
| `atof`, `atoi` | 숫자 변환. 숫자 아닌 곳에서 **조용히 멈춤** → 실패를 알 수 없음 |

### ⚠ 함정: 8칸에 13글자
```c
char buf[8];
strcpy(buf, "ESP32-SENSOR");   // 14바이트를 8칸에
// 경고 → 실행은 됨 → 종료 직전 *** stack smashing detected ***
```
- 입력이 사용자에게서 오면 **보안 취약점(buffer overflow)**

### 문자열 뒤집기
```c
char *a = s, *b = s + strlen(s) - 1;   // 마지막 글자 ('\0' 앞)
while (a < b) { char t = *a; *a = *b; *b = t; a++; b--; }
```

---

## 6교시 · 안전한 문자열 처리와 파싱

### fgets — scanf("%s") 를 버리는 이유
```c
char line[32];
if (fgets(line, sizeof line, stdin) == NULL) return 1;   // EOF/오류
line[strcspn(line, "\n")] = '\0';                         // 끝의 개행 제거
```
- `fgets(buf, n, stdin)` 은 **최대 n−1 글자 + 널**, 줄 끝의 **`\n` 도 버퍼에 남김**
- `scanf("%s", buf)` 는 버퍼 크기를 모름 → 오버플로 위험. `fgets` 는 **잘리기만 하고 죽지 않음**

### ⚠ 함정: strncpy 는 널을 보장하지 않는다
```c
strncpy(a, "ABCDEFG", 4);                  // ABCD — '\0' 없음!
snprintf(b, sizeof b, "%s", "ABCDEFG");    // ABC — 크기 안에서 자르고 항상 '\0'
```
- 잘라서 복사할 때는 **`snprintf(dst, sizeof dst, "%s", src)`** 를 습관으로

### strtok 과 strtol
```c
char line[] = "$T=25.3,H=60,D=120*";     // strtok 은 원본을 고치므로 "배열"이어야 함
char *tok = strtok(line + 1, ",");       // 첫 토큰
while (tok) { /* [T=25.3] [H=60] [D=120*] */ tok = strtok(NULL, ","); }  // 다음은 NULL 로

char *end;
long v = strtol("120*", &end, 10);       // 120, end → "*"  (숫자가 끝난 곳)
// strtol("abc", &end, 10) → end == 시작 위치 → 실패
```
- `strtok` 은 구분자 자리에 **`'\0'` 을 써 넣는다** → 원본이 **바뀐다**, 문자열 리터럴에는 못 씀
- `strtol(s, &end, 10)` 에서 **`end == s` 이면 숫자를 하나도 못 읽어 실패**. 앞의 공백은 건너뜀

### parse_frame — 센서 프레임 파싱
```c
static int get_num(const char *src, const char *key, double *val) {
    const char *p = strstr(src, key);
    if (!p) return 0;
    char *end;
    *val = strtod(p + strlen(key), &end);
    return end != p + strlen(key);          // 숫자가 하나도 없으면 실패
}
int parse_frame(const char *line, Reading *out) {
    if (line[0] != '$' || strchr(line, '*') == NULL) return 0;
    double t, h, d;
    if (!get_num(line, "T=", &t) || !get_num(line, "H=", &h) || !get_num(line, "D=", &d)) return 0;
    out->t = t; out->h = (int)h; out->d = (int)d;
    return 1;
}
```
- `static` 함수 = 파일 밖에서 안 보임 (Day 1 7교시)
- **out 은 성공했을 때만 채운다** — 실패 시 반쯤 채워진 구조체를 남기지 않는 것이 규칙
- 불량 예: `$` 없음, 필드(D) 없음, 숫자 아님(`T=abc`), `*` 없음 → 모두 BAD

---

## 7교시 · 동적 메모리 — malloc/free

### 힙을 써야 하는 두 경우
1. **함수가 끝나도 살아 있어야** 하는 데이터 (스택 배열 주소를 반환하면 죽은 메모리)
2. **크기를 실행 중에** 정해야 할 때

### 기본 패턴
```c
int *a = malloc(n * sizeof(int));
if (a == NULL) return NULL;    // 항상 검사 (MCU 에서는 정말 실패함)
/* 사용 */
free(a);                       // 다 썼으면 돌려준다
a = NULL;                      // 습관: 해제 후 NULL → 해제 후 사용 방지
```
- **소유권 규칙**: 누가 free 하는지 함수 주석에 적는다 ("반환값은 호출자가 free")

### realloc — tmp 관용구
```c
if (n == cap) {
    cap *= 2;                                   // 두 배씩 키우기
    int *tmp = realloc(a, cap * sizeof(int));
    if (!tmp) { free(a); return 1; }            // 실패해도 원본은 살아 있다
    a = tmp;
}
```
- `a = realloc(a, ...)` 로 바로 받으면 실패 시 **원본 주소를 잃어 누수**

### valgrind 메시지
| 실수 | valgrind 메시지 |
|---|---|
| free 안 함 (누수) | `definitely lost: 40 bytes in 1 blocks` |
| free 후 사용 | `Invalid write of size 4 ... free'd` |
| 이중 해제 | `Invalid free() / delete / delete[]` |

### my_strdup
```c
size_t n = strlen(s) + 1;   // '\0' 자리! (+1 빼면 Invalid write of size 1)
char *d = malloc(n);
if (d == NULL) return NULL;
memcpy(d, s, n);
return d;                   // 호출자가 free
```

---

## 8교시 · 종합 실습 — 센서 로그 분석기

**과제**: 표준 입력으로 센서 프레임을 한 줄씩 받아 통계. 파일 4개(`main.c`, `frame.c`, `frame.h`, `Makefile`), **경고 0개, valgrind 누수 0**

| 단계 | 함수 | 쓰이는 개념 |
|---|---|---|
| 읽기 | `fgets` 루프 | 안전 입력, `\n` 제거 |
| 파싱 | `parse_frame(line, &r)` | 실패 시 줄 번호와 함께 BAD 출력 후 계속 |
| 누적 | `Reading *log`, realloc 두 배 | tmp 관용구 |
| 정렬 | 온도 기준 버블 정렬 | 구조체 통째로 swap (`Reading t = a[j]; ...`) |
| 통계 | 최솟값·최댓값·중앙값·평균, ALERT(35℃ 초과) 개수 | |
| 해제 | `free(log)` | |

```bash
make && ./analyzer < log.txt
# BAD line 4: T=25.1,H=60,D=120*
# BAD line 6: $T=abc,H=60,D=120*
# min=24.8 max=37.2 median=26.0 avg=29.88 alert=2
# n=5 bad=2
```

**제출 체크리스트**
- [ ] `make clean && make` 성공, 경고 0개
- [ ] BAD 줄이 있어도 죽지 않고 끝까지 처리
- [ ] 입력 100줄(cap 을 여러 번 넘김)에서도 정상
- [ ] valgrind — `definitely lost: 0 bytes`, `ERROR SUMMARY: 0`

---

## 📝 시험 직전 체크 — 헷갈리기 쉬운 것 모음

| 질문 | 답 |
|---|---|
| `&x` / `*p` | x 의 주소 / p 가 가리키는 값 |
| 64비트에서 `sizeof(int *)` | 8 |
| 함수가 호출자의 변수를 바꾸려면 | 주소를 넘긴다 |
| 초기화 안 된 포인터 역참조 | 세그폴트 |
| `*p++` 는 | `*(p++)` |
| `int *p` 에서 `p + 1` / `double *q` 에서 `q + 1` | 4바이트 / 8바이트 |
| `&arr[4] - &arr[0]` | 4 (요소 개수) |
| `const int *p` 는 무엇을 못 바꾸나 | 가리키는 값 |
| `int *const p` 는 무엇을 못 바꾸나 | 포인터 자체 |
| `arr[i]` 와 같은 식 | `*(arr + i)` |
| 함수 매개변수 `int arr[]` 의 실제 타입 | `int *` |
| 요소 개수 관용구 | `sizeof(arr) / sizeof(arr[0])` |
| `int m[2][3]` 에서 `m[1][0]` 오프셋 | 12바이트 |
| 이진 검색의 전제 | 정렬 |
| `lo + (hi - lo) / 2` 를 쓰는 이유 | 정수 오버플로 방지 |
| 배열 밖에 쓰면 컴파일 에러? | 나지 않는다 |
| `"ABC"` 바이트 수 / `strlen` | 4 / 3 |
| `char s[]` vs `char *s = "..."` | 스택 복사본(수정 가능) / 읽기 전용 리터럴 |
| `strcmp` 가 같을 때 반환값 | 0 |
| `strncpy` 의 문제 / 대안 | `'\0'` 미보장 / `snprintf` |
| `strtok` 이 원본에 하는 일 | 구분자를 `'\0'` 으로 바꿈 |
| `strtol` 에서 `end == s` | 숫자를 하나도 못 읽음 (실패) |
| `realloc` 결과를 tmp 로 받는 이유 | 실패 시 원본 주소를 잃지 않으려고 |
| valgrind `definitely lost` | 메모리 누수 |
