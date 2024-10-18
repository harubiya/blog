current_date=$(date +"%Y%m%d%H")
echo $current_date


git add .
git commit -m "$current_date"
git push origin main
