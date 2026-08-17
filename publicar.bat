git init
git remote add origin https://github.com/allanrsantiago/francyscripts.git
git add .
git commit -m "Versao 1.5.9 implentado atualizacoes silenciosas"
git branch -M main
git push -u origin main --force
git tag -f v1.5.9
git push origin v1.5.9 --force