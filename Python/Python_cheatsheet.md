# Python 4일 컨닝페이퍼 (오픈북용)

> 출처: HYUNDAI AI Insight Campus · 프로그래밍 언어(Python) Day 1~4 강의 노트북 (Colab)
> Day 1 Colab·기초 문법 · Day 2 자료구조·함수·예외 · Day 3 클래스·파일·JSON · Day 4 NumPy·Matplotlib·pandas·제너레이터
> 맨 뒤 [부록](#부록--괄호-넣기-정답-모음)에 노트북의 **괄호 넣기 정답 전부**와 Day 1 퀴즈 10문항 정답이 있습니다.

---

## 0. 한 장 요약 — 매일 "오늘의 여섯 문장"

| Day | 핵심 |
|---|---|
| **1** | 셀 실행 순서가 변수를 만든다 · `!` 셸, `%` 매직 · 변수는 **이름표** · float 오차 → `math.isclose` · `bool("0")` 은 True · 비트: 읽기 `&` 설정 `\|` 해제 `& ~` 토글 `^` 자르기 `& 0xFF` · if는 **처음 참인 블록 하나만** · range는 stop 미포함 · 반복 else는 break 없이 끝날 때 · 문자열은 **불변**, 슬라이스는 관대·인덱스는 엄격 |
| **2** | `b = a` 는 복사가 아니라 이름표 · `sort()` 는 None, `sorted()` 는 새 리스트 · 딕셔너리는 해시로 직행, 없는 키는 `.get()` · 함수 호출 = 스택 프레임, return 없으면 None · 컴프리헨션은 **for → if → 식** 순서로 읽기 · 예외는 구체적으로 잡고 깨진 줄은 세고 continue |
| **3** | 클래스는 설계도, 인스턴스는 데이터, self 는 "지금 이 인스턴스" · 조회는 인스턴스 → 클래스, 자식 `__init__` 첫 줄은 `super()` · `"w"` 는 지우고 `"a"` 는 잇는다, with 가 close 보장 · `dump/load` 는 파일, `dumps/loads` 는 문자열 · 인스턴스는 `to_dict` 로 저장, `from_dict`(classmethod) 로 복원 · readline 은 개행에서 자를 뿐 |
| **4** | 배열 연산 = 반복문이 C 내부로 → 빠름 · NumPy 슬라이스는 **뷰**, 조건은 **마스크** · 그래프는 주장, 제목은 근거, **savefig 는 show 앞에** · DataFrame = list of dict 의 완성형 · groupby **분할→집계→결합** · 스트림은 제너레이터, 한 번 소모되면 끝 |

---

# Day 1 · Colab 환경과 Python 기초

## 1-1. Colab
| 기호/기능 | 뜻 | 예 |
|---|---|---|
| `!명령` | **셸(리눅스)** 명령 | `!ls /content`, `!python hello.py`, `!cat 파일` |
| `%명령` | **라인 매직** | `%timeit sum(range(1_000_000))` |
| `%%명령` | **셀 매직** (셀 전체에 적용) | `%%writefile hello.py` → 셀을 **실행하지 않고 파일로 저장** |
| `[5]` | 이 셀이 **5번째로 실행**됨 | |
| `#@param` | 폼 입력 (`input()` 대신) | `pin = 3  #@param {type:"slider", min:0, max:7}` |
| `Shift+Enter` | 셀 실행 | 마지막 줄 값은 print 없이 출력 |

- **셀 실행 순서가 커널의 변수를 만든다** — 런타임 재시작 시 코드는 **남고** 변수는 **사라진다**
- `/content` 는 세션이 끝나면 **사라짐**, `/content/drive/MyDrive` 는 **유지**
```python
from google.colab import drive
drive.mount('/content/drive')
```

## 1-2. 변수와 자료형
- **변수는 상자가 아니라 이름표**: `b = a` → 같은 객체에 이름표 하나 더. `a = 20` → a 만 새 객체로 이동 (`id()` 로 확인)

| 타입 | 예 | 특징 |
|---|---|---|
| `int` | `512`, `0b1010`, `0o17`, `0xFF`, `1_000_000` | **자릿수 제한 없음** (`2**100` OK, C int32 와 다름) |
| `float` | `3.3`, `1e-3`, `float("inf")` | IEEE 754 **오차 있음** |
| `bool` | `True`, `False` | int 의 일종 (`True + True == 2`) |
| `str` | `"ESP32"` | 불변 |
| `None` | `None` | 값 없음 |

### float 오차
```python
0.1 + 0.2            # 0.30000000000000004
0.1 + 0.2 == 0.3     # False  ← 0.1, 0.2 가 2진수로 정확히 표현되지 않음
math.isclose(0.1 + 0.2, 0.3)   # True  ← 오차 허용 비교
```

### 형변환
| 식 | 결과 | 비고 |
|---|---|---|
| `int("42")`, `float("3.14")` | 42, 3.14 | |
| `int("3.5")` | **ValueError** | → `int(float("3.5"))` = 3 |
| `int(3.99)` / `int(-3.99)` | 3 / -3 | **버림** (0 쪽으로) |
| `round(3.99)` | 4 | 반올림 |
| `int(True)`, `float(False)` | 1, 0.0 | |
| `bool(0)`, `bool("")`, `bool([])`, `bool(None)` | 전부 False | |
| `bool("0")`, `bool("False")`, `bool(" ")`, `bool([0])` | 전부 **True** | 문자열은 내용이 아니라 **비어 있는지**만 봄 |

### 산술 결과 자료형
| 식 | 결과 | 타입 |
|---|---|---|
| `7 / 2` | 3.5 | **항상 float** |
| `7 // 2` | 3 | int // int → int |
| `7.0 // 2` | 3.0 | float 섞이면 float |
| `7 % 2` | 1 | |
| `-7 // 2` | **-4** | 몫은 내림 (음의 무한대 쪽) |
| `-7 % 2` | 1 | |
| `17 / 5`, `17 // 5`, `17 % 5` | 3.4, 3, 2 | `divmod(17, 5)` → (3, 2) |
| `(2 ** 3) ** 2` | 64 | `**` 는 **오른쪽부터**: `2 ** 3 ** 2` = 512 |

### f-string 형식 (`v=1.6516`, `n=4773`)
| 서식 | 결과 | 뜻 |
|---|---|---|
| `{v:.2f}` | `1.65` | 소수점 2자리 |
| `{v:8.1f}` | `     1.7` | 폭 8, 소수점 1자리 |
| `{n:>8}` `{n:<8}` `{n:^8}` | 오른쪽/왼쪽/가운데 정렬 | |
| `{n:08d}` | `00004773` | 0 채움 |
| `{n:,}` | `4,773` | 천 단위 구분 |
| `{n:b}` / `{n:016b}` | `1001010100101` / `0001001010100101` | 2진수 / 16자리 |
| `{n:o}` / `{n:06o}` | `11245` / `011245` | 8진수 |
| `{n:x}` / `{n:#x}` | `12a5` / `0x12a5` | 16진수 / 0x 접두 |
| `{n:#06X}` | `0X12A5` | 대문자, 0X 포함 총 6자리 |
| `{0.4567:.1%}` | `45.7%` | 퍼센트 |
| `{name!r}` | `'ESP32'` | repr |
| `{200:#x}` | `0xc8` | (Day 1 퀴즈) |
| `{n:0{width}b}` | 중첩 서식 | width 자리 2진수 |

## 1-3. 연산자와 비트 연산
- 비교 연쇄: `20 <= temp < 30`
- **단축 평가**: `len(samples) > 0 and samples[0] > 30` → 앞이 False 면 뒤는 실행 안 함
- **`and` vs `&`**: `0 and 3` → 0 (마지막 평가값), `6 & 3` → 2 (비트 AND), `6 and 3` → 3

### 비트 연산 (`a = 0b1100_1010`)
| 식 | 결과 | 쓰임 |
|---|---|---|
| `a & 0x0F` | `00001010` | 하위 4비트만 |
| `a \| 0x0F` | `11001111` | |
| `a ^ 0xFF` | `00110101` | 반전 |
| `(a << 1) & 0xFF` | `10010100` | 8비트로 자름 |
| `a >> 2` | `00110010` | |
| `~a` | **-203** (음수!) | Python 정수 비트 폭이 **무한**이라서 |
| `~a & 0xFF` | `00110101` | **8비트로 자르려면 `& 0xFF`** |

### 비트 마스크 4패턴 ⭐
| 동작 | 코드 |
|---|---|
| **읽기** | `PORT & BTN` / `bool(status & (1 << 2))` / `(n >> i) & 1` |
| **설정** | `PORT \|= LED` |
| **해제** | `PORT &= ~LED & 0xFF` (8비트 레지스터) |
| **토글** | `PORT ^= LED` |

```python
LED = 1 << 3                              # 3번 핀
PINS = (1<<0) | (1<<2) | (1<<4) | (1<<6)  # 여러 핀: 0b01010101 = 0x55
high = (value >> 8) & 0xFF                # 16비트 분리 (0x12A5 → 0x12)
low  = value & 0xFF                       #               → 0xA5
joined = (high << 8) | low                # 결합
(0xA5 & 0xF0) >> 4                        # 상위 4비트 → 0xa
is_pow2 = n > 0 and (n & (n - 1)) == 0    # 2의 거듭제곱 판별 (비트가 하나만 켜짐)
```
- `x << 3` = **8배**, `x >> 1` = **2로 나눈 몫**
- 2의 보수: `-5 & 0xFF` → `11111011`, `-5 & 0xFFFF` → `1111111111111011`

## 1-4. 조건문
```python
if temp < 0:      status = "FREEZE"
elif temp < 20:   status = "COLD"     # temp >= 0 은 위에서 이미 걸러졌으므로 안 써도 됨
elif temp < 30:   status = "NORMAL"
elif temp < 40:   status = "WARM"     # temp = 30 → WARM
else:             status = "ALERT"
```
- 위에서부터 검사해 **처음 참인 블록 하나만** 실행
- 거짓으로 평가: `0`, `0.0`, `""`, `[]`, `None` / 참: `"0"`, `" "`, `[0]`, `-1`
- 포함: `status in ("WARM", "ALERT")`, `"CAM" in "ESP32-CAM"`
- 조건 표현식: `led = "ON" if temp > 30 else "OFF"`
- 윤년: `(year % 4 == 0 and year % 100 != 0) or year % 400 == 0`
- 흔한 오류: `if x = 5:` → **SyntaxError** (비교는 `==`), 들여쓰기 불일치 → **IndentationError**

## 1-5. 반복문
| 식 | 결과 |
|---|---|
| `range(5)` | 0~4 |
| `range(2, 8)` | 2~7 |
| `range(0, 256, 64)` | 0, 64, 128, 192 (**256 미포함**) |
| `range(10, 0, -3)` | 10, 7, 4, 1 |
| `range(2, 10, 3)` | 2, 5, 8 |

- `continue`: 이번 회전 나머지 건너뛰고 **다음** 회전 / `break`: 반복을 **즉시** 끝냄
- **반복문의 `else`**: **break 없이** 끝났을 때만 실행
- `enumerate(seq, start=1)` → (번호, 값) / `zip(a, b)` → **짧은 쪽에서 멈춤**
```python
for i, (t, h) in enumerate(zip(temps, humids), start=1): ...
for r in range(1, 10):
    for c in range(1, 10):
        print(f"{r*c:3d}", end="")
    print()
```
- while 안에 조건을 거짓으로 만드는 코드가 없으면 **무한 루프** (Colab ■ 로 중지)
- `from tqdm import tqdm` → `for step in tqdm(range(10)):` 진행 막대

## 1-6. 문자열
```python
s = "ESP32-CAM"
s[0], s[-1]        # 'E', 'M'
s[2:5], s[:3]      # 'P32', 'ESP'
s[-3:], s[::2]     # 'CAM', 'EP2CM'
s[::-1], s[1:-1]   # 'MAC-23PSE', 'SP32-CA'
s[10:20]           # ''  ← 범위 초과 슬라이스는 빈 문자열 (오류 없음)
s[10]              # IndexError  ← 범위 초과 인덱스
"$ABC*"[1:-1]      # 'ABC'
```
- **불변**: `s[0] = "e"` → **TypeError**. 메서드는 새 문자열을 돌려주므로 **다시 대입** (`s = s.strip()`)
- 리스트는 `a[0] = 10` 가능, 튜플·문자열은 불가

| 메서드 | 결과 (`line = "T=25.3,H=60,D=120"`) |
|---|---|
| `line.split(",")` | `['T=25.3', 'H=60', 'D=120']` |
| `line.find("H=")` | 7 (없으면 -1) |
| `startswith("T=")`, `endswith("*")` | True, False |
| `count("=")`, `upper()`, `replace("=", ":")` | |
| `"-".join(["AA","BB"])` | `'AA-BB'` |
| `strip()` / `lower()` | **양 끝** 공백 제거 / 소문자 |
| `splitlines()` | 줄 단위 리스트 |
| `"25.3".isdigit()` | **False** (`.` 때문) |
| `int("EE", 16)` | 238 (16진수 해석) |

- `repr(raw)` 로 `\r\n` 같은 보이지 않는 문자 확인
- `"T=25.3".split("=")[1]` → `'25.3'` (**str**) → 계산하려면 `float()`

### 프레임 파싱 패턴
```python
frame = "$T=25.3,H=60,D=120*"
if frame.startswith("$") and frame.endswith("*"):
    body = frame[1:-1]
    for field in body.split(","):
        key, value = field.split("=")
        ...
```

---

# Day 2 · 자료구조와 함수

## 2-1. 리스트와 튜플 — 참조와 복사
```python
a = [1, 2, 3]; b = a; b.append(4)   # a 도 [1,2,3,4] — a is b → True
c = a.copy()   # 또는 a[:], list(a) — 겉 리스트만 새로 (얕은 복사)
import copy
deep = copy.deepcopy(outer)         # 안쪽까지 완전 독립
```
- **얕은 복사**: 안쪽 리스트는 여전히 공유 → `shallow[0].append(30)` 하면 원본도 바뀜
- ⚠ `[[0]*3]*2` 는 같은 안쪽 리스트를 두 번 참조 → `[[0]*3 for _ in range(2)]` 사용

| | 반환값 | 원본 |
|---|---|---|
| `sorted(nums)` | **새 리스트** | 유지 |
| `nums.sort()` | **None** | 정렬됨 (`a = a.sort()` 함정!) |

```python
top3 = sorted(temps, reverse=True)[:3]
name, pin = ("LED", 3)        # 언패킹
a, b = b, a                   # 스왑
mn, *rest = sorted([3, 1, 2]) # mn=1, rest=[2, 3]
a[1:3] = [9, 9, 9]            # 슬라이스 대입 (리스트만, 길이 변할 수 있음)
```
- 튜플의 '불변' = 칸에 담긴 **참조**가 불변 (안쪽 리스트 내용은 바뀔 수 있음)

## 2-2. 딕셔너리와 집합
```python
pins = {"LED": 3, "BTN": 5}
pins["BUZZ"] = 6          # 추가
pins["LED"] = 4           # 같은 키 = 덮어쓰기 (키는 중복 불가)
del pins["BTN"]
pins["SERVO"]             # KeyError
pins.get("SERVO")         # None
pins.get("SERVO", -1)     # 기본값 -1
"SERVO" in pins           # False
for name, pin in pins.items(): ...
NODES["ESP32-01"]["readings"][0]["T"]   # 중첩: 대괄호 하나 = 한 층
```
- 조회가 빠른 이유: 키를 **해시**해 버킷으로 바로 감
- 리스트는 해시 불가 → 키 불가 / **튜플**은 키 가능

| 집합 연산 | 뜻 |
|---|---|
| `a \| b` | 합집합 |
| `a & b` | 교집합 |
| `a - b` | 차집합 (A 에만) |
| `a ^ b` | 대칭차 |
| `set([7,7,7,3])` | 중복 제거 → `{3, 7}` |
- 집합은 **중복 불허, 순서 없음**

## 2-3. 함수
```python
def adc_to_volt(raw, vref=3.3, bits=10):     # 기본값
    """docstring"""
    return raw / (2**bits - 1) * vref
adc_to_volt(512, vref=5.0)                    # 키워드 인자

def stats(*values):                           # *args → 튜플
    return min(values), max(values), sum(values)/len(values)   # 다중 반환 = 튜플
lo, hi, avg = stats(22.1, 23.4, 31.2)
# **kwargs → 딕셔너리
```
- **return 이 없으면 None** (print 와 return 은 다름)
- 함수 호출 시 **스택 프레임** 생성, return 과 함께 소멸
- 함수 안에서 대입하면 전역이 아니라 **지역 변수**가 생김 → 바꾸려면 반환값으로
- ⚠ **가변 기본값 함정**: 기본 리스트는 정의 때 1회 생성 → 호출 간 공유·누적
```python
def bad_log(v, acc=[]): ...      # bad_log(1), bad_log(2) → [1] [1, 2]
def safe_log(v, acc=None):
    if acc is None:
        acc = []
```

## 2-4. 람다·컴프리헨션
```python
sorted(records, key=lambda r: r["T"], reverse=True)
max(records, key=lambda r: r["T"])["id"]    # max 는 '값'이 아니라 원소(레코드) 자체를 반환
[round(r / 1023 * 3.3, 2) for r in raws]    # 리스트 컴프리헨션
[t for t in temps if t > 35]                # 조건 필터
{nid: len(nd["readings"]) for nid, nd in NODES.items()}    # dict 컴프리헨션
{r["id"]: r["T"] for r in records if r["T"] > 30}
list(map(lambda t: t + 0.5, temps))         # map/filter 는 이터레이터 → list() 필요
```
- 컴프리헨션 실행 순서: **for → if → 맨 앞의 식**. 원본을 바꾸지 않고 **새 리스트** 생성

## 2-5. 모듈·표준 라이브러리
```python
%%writefile sensors.py        # 셀을 실행하지 않고 파일로 저장
import sensors; sensors.judge(25.3)
from sensors import parse_field
import importlib; importlib.reload(sensors)   # 수정 반영 (import 는 캐시 재사용)

if __name__ == "__main__":    # 직접 실행: __name__ == "__main__" / import: 모듈 이름
    ...
from collections import Counter
Counter(["NORMAL", "ALERT", "NORMAL"])        # 등급별 개수
from datetime import datetime
datetime.now().strftime("%Y-%m-%d %H:%M:%S")
```

## 2-6. 예외 처리
```python
try:
    t = float(line[1:-1].split(",")[0].split("=")[1])
except ValueError as e:
    print("파싱 실패", e)
else:
    print("성공했을 때만")
finally:
    print("항상 실행 — 자원 정리")
```
| 예외 | 원인 예 |
|---|---|
| `ValueError` | `int("")`, `float("2S.3")`, `int("3.5")` |
| `KeyError` | `{"a":1}["b"]` |
| `IndexError` | `[1,2][10]` |
| `TypeError` | 문자열 수정, `json.dumps(인스턴스)` |
| `AttributeError` | 없는 속성 |
| `FileNotFoundError` | 없는 파일 열기 |
| `ZeroDivisionError` | 0 으로 나누기 |
| `KeyboardInterrupt` | Ctrl-C |
| `json.JSONDecodeError` | 깨진 JSON |

```python
class FrameError(Exception):    # 사용자 정의 예외
    pass
raise FrameError("손상 프레임")   # raise = 오류 상황을 알리는 문
except (FrameError, ValueError) as e:   # 여러 예외 한 번에
    bad += 1; continue                   # 깨진 줄은 세고 계속
err_counts[type(e).__name__] += 1        # 예외 종류별 집계
```
- except 는 **구체적인** 예외로 좁게 (오타 같은 버그가 숨지 않게)
- 잡히지 않은 예외는 **스택**을 거슬러 호출한 곳으로 **전파**
- 재시도: `for attempt in range(1,4): try: result = f(); break  except ValueError: ...`

---

# Day 3 · 클래스·파일·시스템 연동

## 3-1. 클래스
```python
class SensorReading:
    ALERT_T = 35                          # 클래스 변수 (설계도에 한 부, 모두 공유)
    def __init__(self, node_id, t, h=0, d=0):
        self.node_id = node_id            # 인스턴스 속성
        self.t = t
    def __repr__(self):                   # print(r) 시 보이는 모습
        return f"Reading({self.node_id}, T={self.t})"
    def is_alert(self):
        return self.t > self.ALERT_T

r1 = SensorReading("ESP32-01", 25.3, 60, 120)
r1.is_alert()  ==  SensorReading.is_alert(r1)    # 완전히 같은 호출
```
- 클래스 = **설계도**, 인스턴스 = 찍어낸 실제 **데이터**. 인스턴스 속성은 서로 독립
- `self` 는 키워드가 아니라 **첫 매개변수의 관례적 이름**
- 없는 속성 `r1.tmp` → **AttributeError** (dict 의 KeyError 보다 친절)
- `__repr__` 없으면 `<object at 0x...>`
- 속성 조회 순서: **인스턴스 → 클래스**. `SensorReading.ALERT_T = 30` 하면 모든 인스턴스에 전파
- ⚠ 클래스 변수로 리스트를 두면 모든 인스턴스가 **공유** → 위험

## 3-2. 상속
```python
class CalibratedReading(SensorReading):
    def __init__(self, node_id, t, offset):
        super().__init__(node_id, t)      # 부모 초기화 먼저! (빠뜨리면 self.t 없음 → AttributeError)
        self.offset = offset
    def is_alert(self):                    # 오버라이드 — 탐색이 자식에서 멈춤
        return (self.t + self.offset) > self.ALERT_T
```
- 메서드 탐색: **자식 → 부모** (`__repr__` 은 부모 것을 찾아 실행)

## 3-3. to_dict / from_dict (classmethod)
```python
    def to_dict(self):
        return {"id": self.node_id, "T": self.t, "H": self.h, "D": self.d}
    @classmethod
    def from_dict(cls, d):                 # cls = 설계도 (인스턴스가 없을 때 만들기)
        return cls(d["id"], d["T"], d["H"], d["D"])
r2 = SensorReading.from_dict(r.to_dict())
```

## 3-4. 파일 입출력
| 모드 | 뜻 |
|---|---|
| `"r"` | 읽기 (기본) |
| `"w"` | 쓰기 — **여는 순간 기존 내용을 지움** |
| `"a"` | 이어쓰기 |

```python
with open("log.txt", "a", encoding="utf-8") as f:   # with → 블록 끝나면 자동 close
    f.write(line + "\n")                             # write 는 개행 자동 안 붙임
with open("log.txt", encoding="utf-8") as f:
    for line in f:                                   # 줄 끝에 \n 붙어 있음 → strip()
        print(line.strip())
f.read(), f.readlines()
try:
    with open(path) as f: ...
except FileNotFoundError:
    lines = []                                       # 첫 실행이면 정상 상황
```
- close 안 되면 **버퍼**에 남은 내용이 디스크에 안 내려갈 수 있음

## 3-5. JSON 과 CSV
| 함수 | 대상 |
|---|---|
| `json.dump(obj, f)` / `json.load(f)` | **파일** |
| `json.dumps(obj)` / `json.loads(s)` | **문자열** (s 가 붙으면 string) |

```python
json.dump(data, f, indent=2, ensure_ascii=False)   # ensure_ascii=False → 한글 그대로
json.dumps({"loc": "정문"})                         # {"loc": "정문"}
back = json.loads(s)                                # 타입이 돌아옴 (26.4 → float)
json.dumps(인스턴스)                                 # TypeError → to_dict 로 변환 후 저장
```
- JSON 이 아는 타입: **dict / list / str / 숫자 / bool / None**
```python
import csv
with open("readings.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "T", "H", "D"])
```
- 사람·엑셀용 표 → **CSV** / 프로그램 왕복·중첩 구조 → **JSON**

## 3-6. 시스템 연동
```python
os.makedirs("data", exist_ok=True)
from pathlib import Path
p = Path("data") / "log.txt"          # 경로는 / 연산자로
p.write_text("T=25.3\n", encoding="utf-8"); p.exists()
os.listdir("data"); os.path.exists("x"); os.remove("x")
import subprocess, sys
r = subprocess.run([sys.executable, "-c", "print(6*7)"], capture_output=True, text=True)
r.stdout.strip(), r.returncode        # '42', 0  ← 노트북 !명령 의 .py 버전
```
- `ser.readline()` 은 프레임 기호가 아니라 **개행(\n)** 에서 자름 → `$…*` 검증 필수
- timeout 빈 줄은 오류 아님 → `if not line.strip(): continue`
- Ctrl-C 는 `except KeyboardInterrupt: break` 로 안전 종료
- 예외는 **대처할 수 있는 곳**에서 잡는다

---

# Day 4 · NumPy·Matplotlib·pandas·제너레이터

## 4-1. NumPy 기초
```python
import numpy as np
a = np.array([512, 723, 1023])
a.shape, a.dtype, a.ndim       # (3,) int64 1   ← 배열 받으면 shape 부터
M = np.arange(12).reshape(3, 4)   # (3, 4)
np.round(RAWS / 1023 * 3.3, 2)    # 반복문 없이 전체 변환 (벡터 연산)
c * 9/5 + 32                      # 섭씨 → 화씨
```
| 식 | 결과 |
|---|---|
| `[1, 2] * 2` | `[1, 2, 1, 2]` (리스트: **이어 붙이기**) |
| `np.array([1, 2]) * 2` | `[2 4]` (배열: **원소별 곱**) |
| `(2,3) + (3,)` | 작은 쪽이 **늘어나** 모양을 맞춤 (**브로드캐스팅**) |
| `(3,) + (4,)` | **ValueError** (모양 불일치) |
- 빠른 이유: 반복문이 **C 내부**로 들어감

## 4-2. NumPy 활용
```python
b = a[2:5]; b[0] = 999       # ⚠ 슬라이스는 뷰(참조) → a 도 바뀜!
c = a[2:5].copy()            # 독립 사본
mask = BT > 35               # 불리언 마스크
BT[mask]                     # True 자리만 골라내기
BT[BN == "ESP32-02"].mean()  # 마스크 + 통계
(BT > 35).sum()              # 건수 (True = 1)
BT.argmax(), BT.max()        # 최댓값의 위치(인덱스), 값
M2.mean(axis=1)              # axis=1: 열이 사라짐 → 행별(일별) 평균
M2.mean(axis=0)              # axis=0: 행이 사라짐 → 열별(회차별) 평균
np.where(mask)[0]            # True 인 인덱스들
```
- axis = **사라지는 방향**
- 이미지 = H×W 숫자 배열 (`IMG.shape` = (60, 80)), 컬러는 (H, W, 3). `IMG[::-1]` 상하 반전, `IMG * 0.5` 어둡게

## 4-3. Matplotlib
```python
import matplotlib.pyplot as plt
plt.figure(figsize=(8, 3.5))
plt.plot(BT, marker="o", label="T")
plt.axhline(35, color="red", linestyle="--", label="ALERT 35C")   # 기준선
plt.scatter(np.where(mask)[0], BT[mask], color="red", zorder=3)   # ALERT 점
plt.hist(BT, bins=12)                                             # 히스토그램
plt.title("..."); plt.xlabel("..."); plt.ylabel("..."); plt.grid(True); plt.legend()
plt.savefig("out/x.png", dpi=150)    # ⚠ show 앞에! (뒤에 하면 0바이트)
plt.show()
fig, ax = plt.subplots(1, 3, figsize=(10, 2.6))   # 여러 칸
ax[0].imshow(IMG, cmap="gray")
```
- 읽히는 그래프 4요소: **title / xlabel / ylabel / grid** (+범례)
- 제목에 `'3 nodes, 264 readings'` 처럼 → 그래프는 주장, 제목은 **근거**
- 준실시간 갱신: `from IPython.display import clear_output` → `clear_output(wait=True)` 후 다시 그리기

## 4-4. pandas
```python
import pandas as pd
df = pd.DataFrame(RECORDS)       # list of dict → 표 (행=레코드, 열=필드)
df.head(); df.info(); df.describe()   # 3종 세트 (info 로 dtype 확인!)
df["T"].mean()                   # 열 선택 → 통계
df["alert"] = df["T"] > 35       # 새 열
df[df["alert"]]                  # 불리언 필터 (NumPy 마스크와 같은 문법)
df.sort_values("T", ascending=False).head(3)
df.groupby("node")["T"].agg(["mean", "max", "count"]).round(2)   # 분할→집계→결합
for node, group in df.groupby("node"): ...
df.to_csv("out/x.csv", index=False)   # index=False — 유령 열 방지
back = pd.read_csv("out/x.csv")
df2["T"].isna().sum(); df2.dropna()   # 결측 세기 / 제거
t2.rolling(5).mean()                  # 이동 평균
sub.reset_index(drop=True)
pd.read_csv(io.StringIO(raw))         # 문자열에서 읽기
```
- `df["T"] > 35` 가 전부 False → T 의 dtype 이 **문자열(object)** 일 가능성 → `df.info()`

## 4-5. 제너레이터·이터레이터
```python
dict(zip(nodes, avgs))           # 쌍 → dict
m = map(str, [1, 2])
list(m)   # ['1', '2']
list(m)   # []  ← 이터레이터는 한 번 소모되면 끝

def read_frames(path):           # yield 가 있으면 호출 시 제너레이터
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                yield parse_frame(line)   # 값을 내놓고 멈췄다가 다음 요청에 이어서
            except (FrameError, ValueError):
                continue
frames = read_frames("data/stream_boot.txt")   # 아직 안 돌았음 (type: generator)
next(frames)                     # 첫 건
sum(1 for _ in frames)           # 나머지 개수 — 리스트 없이
sum(t for _, t, _, _ in read_frames(path)) / 26   # 제너레이터 표현식 (대괄호 없음)
```
- 최대 장점: **리스트를 만들지 않아** 100만 줄도 메모리 걱정 없음
- `f"{'node':10s}{'avg_T':>8s}"` / `f"{26.433:8.2f}"` → 폭·정렬로 표 맞추기

## 4-6. 미니 프로젝트 핵심 (collect)
```python
def collect(path):
    records, good, bad, skip = [], 0, 0, 0
    for line in open(path, encoding="utf-8"):
        if not line.strip():
            skip += 1; continue
        try:
            nid, t, h, d = parse_frame(line)
        except (FrameError, ValueError):
            bad += 1; continue
        records.append({"node": nid, "T": t, "H": h, "D": d}); good += 1
    return records, good, bad, skip      # stream_day4: 266 23 11
```

---

# 부록 · 괄호 넣기 정답 모음

### Day 1
| 번호 | 정답 |
|---|---|
| 1-3 | ① 셸(리눅스) / 매직(노트북) ② 5 ③ 남고 / 사라진다 ④ 사라지고 / 남는다 |
| 2-5 | ① 이름표 ② ValueError / 3 ③ 3 / 4 ④ True / 비어 있는지(길이) ⑤ float / int |
| 3-5 | ① `&` / `\|` / `^` ② 무한(제한 없음) / `& 0xFF` ③ 8 / 2 ④ 0x12 / 0xA5 |
| 4-5 | ① 처음 / 하나 ② 걸러졌기(제외됐기) ③ 0 / None ④ WARM |
| 5-6 | ① 192 / 포함되지 않는다 ② break ③ 다음 / 즉시 ④ 짧은 ⑤ 무한 루프 |
| 6-6 | ① "ABC" ② "" (빈 문자열) / IndexError ③ 양 끝 ④ str / float() ⑤ 불변 / 다시 대입(`s = s.strip()`) |

### Day 1 퀴즈 10문항 (8-Q)
1. `7 // 2` → 3 (int), `7 / 2` → 3.5 (float)
2. 0.1 과 0.2 가 2진수로 정확히 표현되지 않아 오차가 생기기 때문
3. `f"{200:#x}"` → `0xc8`
4. `x & ~(1 << 5)` (8비트로 자르려면 `& 0xFF`)
5. 2의 거듭제곱
6. `range(2, 10, 3)` → `2 5 8`
7. while 의 else: break 없이 조건이 거짓이 되어 반복이 끝났을 때
8. `'25.3'`, str
9. `'ABC'`
10. `h = int("H=60".split("=")[1]); print("습함" if h >= 60 else "건조")`

### Day 2
| 번호 | 정답 |
|---|---|
| 1-4 | ① 복사 / 이름표(참조) ② None ③ 참조 ④ deepcopy |
| 2-4 | ① 해시(hash) ② KeyError / None ③ 튜플 ④ 중복 / 순서 |
| 3-4 | ① 스택 프레임 ② 튜플 / 딕셔너리 ③ 지역(로컬) ④ None |
| 4-4 | ① for / 식 ② 원소(레코드) ③ 이터레이터 ④ 새 리스트 |
| 5-3 | ① 파일로 저장 ② 캐시 / reload ③ `"__main__"` ④ Counter |
| 6-4 | ① 구체적인 ② 항상 ③ 스택 / 전파 ④ 알리(보고하) |

### Day 3
| 번호 | 정답 |
|---|---|
| 1-3 | ① 설계도 / 데이터 ② r1 ③ 첫 매개변수 ④ AttributeError |
| 2-3 | ① 인스턴스 / 클래스 ② 오버라이드 ③ 부모 ④ 공유 |
| 3-3 | ① 지운다 ② close ③ 버퍼 ④ strip() |
| 4-3 | ① 파일 / 문자열 ② float ③ TypeError ④ CSV / JSON |
| 5-2 | ① 개행(\n) ② continue ③ subprocess ④ KeyboardInterrupt |
| 6-3 | ① to_dict() ② classmethod / cls ③ 정상 시나리오 ④ 대처할 수 있는 |

### Day 4
| 번호 | 정답 |
|---|---|
| 1-3 | ① shape ② 이어 붙이기 / 원소별 곱 ③ 늘어나 ④ ValueError |
| 2-2 | ① 뷰(참조) ② 1 ③ 위치(인덱스) ④ 사라지는 |
| 3-2 | ① grid(격자) ② axhline ③ savefig ④ 근거 |
| 4-3 | ① 레코드 / 필드 ② 불리언 마스크 ③ 분할 ④ 문자열(object) |
| 5-2 | ① yield ② 멈췄다가 ③ 리스트 ④ 아무것도 나오지 않는다 ⑤ 소수점 |
