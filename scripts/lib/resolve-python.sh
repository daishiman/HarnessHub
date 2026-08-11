# shellcheck shell=bash
# resolve-python.sh — CI 等価チェックが使う python3 を「依存を import できるか」で選ぶ SSOT。
#
# 背景 (HarnessHub-sl6o):
#   git hook (.githooks/pre-push) はログインシェルの rc ファイルを読まないため、手動実行時と
#   PATH が異なる。手元では rc が miniconda3/pyenv を PATH 前置するので jsonschema 入りの
#   python3 が選ばれるが、hook 文脈では /opt/homebrew/bin/python3 (jsonschema 無し) が選ばれ、
#   validate-plugin-packages.py の package-contract schema 検証だけが blocking FAIL になっていた。
#   「hook と手動で同じ python を解決する」ためには PATH 順ではなく **依存充足** で選ぶ必要がある。
#
# 方針:
#   - 候補を決められた優先順で列挙し、各候補で実際に import を試す (宣言ではなく実測)。
#   - required を満たす候補が 1 つも無ければ **fail-closed**。どの候補をどの理由で棄却したかを
#     全件列挙して落とす。無言 skip / 無言 fallback の経路は作らない。
#   - 決定した interpreter は一時 dir 内の `python3` symlink として PATH 前置する。
#     literal `python3` を呼ぶ既存行・子プロセス (make / bash スクリプト) にも同じ解決結果が
#     伝播し、かつ python3 以外のコマンドを shadow しない。
#
# 使い方:
#   . scripts/lib/resolve-python.sh
#   hh_resolve_python3 --required jsonschema --preferred yaml   # 解決結果を stdout へ
#   hh_shim_python3 "$resolved"                                  # PATH 前置 (HH_PYTHON も export)
#
# 環境変数:
#   HH_PYTHON             最優先候補として扱う interpreter。ただし required を満たさなければ
#                         他候補と同じく棄却される (fail-closed を迂回する手段にはならない)。
#   HH_PYTHON_CANDIDATES  ':' 区切りで候補集合を上書きする (テスト用の seam)。
#                         これも import 実測を通るので gate の緩和にはならない。

# 候補 interpreter を優先順で 1 行 1 件出力する。
hh_python_candidates() {
  if [ -n "${HH_PYTHON_CANDIDATES:-}" ]; then
    printf '%s\n' "$HH_PYTHON_CANDIDATES" | tr ':' '\n' | grep -v '^$'
    return 0
  fi

  # 1) 明示指定
  [ -n "${HH_PYTHON:-}" ] && printf '%s\n' "$HH_PYTHON"

  # 2) PATH 上の python3 を前から全件 (hook 文脈でも手動でも同じ列挙になる)
  printf '%s\n' "${PATH:-}" | tr ':' '\n' | while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    [ -x "$dir/python3" ] && printf '%s\n' "$dir/python3"
  done

  # 3) PATH に無くても存在しがちな既知の場所 (hook 文脈で PATH から落ちる代表格)
  for fixed in \
    "${HOME:-}/miniconda3/bin/python3" \
    "${HOME:-}/.pyenv/shims/python3" \
    /usr/local/bin/python3 \
    /opt/homebrew/bin/python3 \
    /usr/bin/python3; do
    [ -n "$fixed" ] && [ -x "$fixed" ] && printf '%s\n' "$fixed"
  done
}

# 候補が modules を全て import できるか実測する。0=可 / 1=不可。
hh_python_can_import() {
  cand="$1"; shift
  for mod in "$@"; do
    [ -n "$mod" ] || continue
    "$cand" -c "import $mod" >/dev/null 2>&1 || return 1
  done
  return 0
}

# required を満たす python3 を選び stdout へ出す。無ければ棄却理由を列挙して 1 を返す。
#   hh_resolve_python3 [--required "a b"] [--preferred "c d"]
# preferred は「満たす候補が居ればそちらを優先する」だけで、必須ではない。
hh_resolve_python3() {
  _req="jsonschema"
  _pref=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --required)  _req="$2";  shift 2 ;;
      --preferred) _pref="$2"; shift 2 ;;
      *) printf 'hh_resolve_python3: 不明な引数: %s\n' "$1" >&2; return 2 ;;
    esac
  done

  _seen=""
  _best=""      # required のみ満たす最初の候補
  _rejects=""

  while IFS= read -r cand; do
    [ -n "$cand" ] || continue
    if [ ! -x "$cand" ]; then
      _rejects="${_rejects}  - ${cand}: 実行可能ファイルではない
"
      continue
    fi
    # 同一 interpreter の重複 (symlink / shim) は sys.executable で畳む
    real="$("$cand" -c 'import sys; print(sys.executable)' 2>/dev/null)"
    if [ -z "$real" ]; then
      _rejects="${_rejects}  - ${cand}: python として起動できない
"
      continue
    fi
    case ":${_seen}:" in
      *":${real}:"*) continue ;;
    esac
    _seen="${_seen}:${real}"

    if ! hh_python_can_import "$cand" $_req; then
      _missing=""
      for mod in $_req; do
        hh_python_can_import "$cand" "$mod" || _missing="${_missing}${_missing:+, }${mod}"
      done
      _ver="$("$cand" -c 'import sys; print(sys.version.split()[0])' 2>/dev/null)"
      _rejects="${_rejects}  - ${real} (${_ver}): 必須 module を import できない: ${_missing}
"
      continue
    fi

    if [ -z "$_best" ]; then
      _best="$real"
    fi
    if [ -z "$_pref" ] || hh_python_can_import "$cand" $_pref; then
      printf '%s\n' "$real"
      return 0
    fi
  done <<EOF
$(hh_python_candidates)
EOF

  if [ -n "$_best" ]; then
    # preferred は満たせなかったが required は満たす。fail させず、降格した事実だけ告げる。
    printf '[resolve-python] 推奨 module (%s) を満たす python3 が無いため required のみで決定: %s\n' \
      "$_pref" "$_best" >&2
    printf '%s\n' "$_best"
    return 0
  fi

  {
    printf '[resolve-python] 必須 module (%s) を import できる python3 が見つかりません。\n' "$_req"
    printf '検査した候補と棄却理由:\n'
    printf '%s' "$_rejects"
    printf '対処: 依存を入れた python3 を用意してください。\n'
    printf '  python3 -m pip install -r requirements-dev.txt\n'
    printf '  もしくは HH_PYTHON=/path/to/python3 を指定 (指定しても import 実測は迂回できません)\n'
  } >&2
  return 1
}

# 解決済み interpreter を `python3` として PATH 前置する。
# 一時 dir に symlink を 1 本だけ置くので python3 以外のコマンドは shadow しない。
hh_shim_python3() {
  _resolved="$1"
  [ -x "$_resolved" ] || { printf '[resolve-python] shim 対象が実行できません: %s\n' "$_resolved" >&2; return 1; }
  HH_PYTHON_SHIM_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hh-python-shim.XXXXXX")" || return 1
  ln -s "$_resolved" "$HH_PYTHON_SHIM_DIR/python3" || return 1
  PATH="$HH_PYTHON_SHIM_DIR:$PATH"
  HH_PYTHON="$_resolved"
  export PATH HH_PYTHON HH_PYTHON_SHIM_DIR
}
