#!/usr/bin/env bash
# Publie l'appli construite (dist/) dans la branche gh-pages, servie par GitHub Pages.
#
#   scripts/publish-pages.sh main         dist/ à la racine du site (les prévisualisations sont gardées)
#   scripts/publish-pages.sh pr 12        dist/ dans pr/12/ (prévisualisation de la PR #12)
#   scripts/publish-pages.sh remove-pr 12 supprime pr/12/
#
# Lancé par la CI (GITHUB_TOKEN et GITHUB_REPOSITORY fournis par GitHub Actions) ;
# PAGES_REMOTE remplace le dépôt cible pour un essai en local.
# La branche ne garde qu'un seul commit : elle ne grossit pas au fil des publications.
set -euo pipefail

mode=${1:?main, pr ou remove-pr}
pr=${2:-}
if [[ $mode != main && ! $pr =~ ^[0-9]+$ ]]; then
  echo "Numéro de PR attendu" >&2
  exit 1
fi

site=$(mktemp -d)
remote="${PAGES_REMOTE:-https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"
if git ls-remote --exit-code --heads "$remote" gh-pages >/dev/null; then
  git clone --quiet --depth 1 --branch gh-pages "$remote" "$site"
else
  git init --quiet --initial-branch gh-pages "$site"
  git -C "$site" remote add origin "$remote"
fi

case $mode in
  main)
    find "$site" -mindepth 1 -maxdepth 1 ! -name .git ! -name pr -exec rm -rf {} +
    cp -r dist/. "$site/"
    message="Publication de main"
    ;;
  pr)
    rm -rf "$site/pr/$pr"
    mkdir -p "$site/pr/$pr"
    cp -r dist/. "$site/pr/$pr/"
    message="Prévisualisation de la PR #$pr"
    ;;
  remove-pr)
    rm -rf "$site/pr/$pr"
    message="Retrait de la prévisualisation de la PR #$pr"
    ;;
  *)
    echo "Mode inconnu : $mode" >&2
    exit 1
    ;;
esac
# Pas de traitement Jekyll : les fichiers sont servis tels quels.
touch "$site/.nojekyll"

cd "$site"
git checkout --quiet --orphan publication
git add --all
git -c user.name='github-actions[bot]' \
  -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  commit --quiet --message "$message"
git push --quiet --force origin publication:gh-pages
echo "$message : fait."
