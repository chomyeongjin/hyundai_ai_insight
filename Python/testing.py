def count_over(values, limit=30.0):
    # values 중 limit 보다 큰 값의 개수를 돌려준다.
    # TODO: 한 줄로 return (5단계 컴프리헨션 + len 활용)
    
    return (v.len for v in values if v > limit)



print("[7단계] 결과 :", count_over(temps), count_over(temps, limit=28.0))
print("[7단계] 기대값: 2 3")


