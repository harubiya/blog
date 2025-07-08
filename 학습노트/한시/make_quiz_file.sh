#!/bin/bash

# 출력 파일 이름
output_file="한시퀴즈용.html~"

# 임시 파일
temp_file="$(mktemp)"

# 첫 줄 삽입
echo "<!--#include virtual='/header.html'-->" > "$output_file"

# find로 trash 디렉토리를 제외하고 *.html 파일 검색
find . -type d -name trash -prune -o -type f -name '*.html' -print | while read -r file; do
    grep '^=' "$file"
done >> "$output_file"

# 마지막 줄 삽입
echo "<!--#include virtual='/학습노트/inc/hanja_footer.html'-->" >> "$output_file"
