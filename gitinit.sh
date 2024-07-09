git config --global user.email "hello@gilai.net"
git config --global user.name "harubiya"


echo "# blog" >> README.md
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin git@github.com:harubiya/blog.git
git remote -v

ssh -T git@github.com
git push -u origin main
