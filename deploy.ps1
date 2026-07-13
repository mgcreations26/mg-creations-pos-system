git init
git add .
git commit -m "PWA Release Snapshot"
git remote remove origin 2>$null
git remote add origin https://github.com/mgcreations26/mg-creations-pos-system.git
git branch -M main
git push -u origin main