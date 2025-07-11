#!/bin/bash

for file in *.html; do
  if grep -q "/header.html" "$file"; then
    sed -i "s|\/header.html|\/학습노트\/inc\/hanja_header.html|g" "$file"
    echo "$file 수정됨"
  fi
done
