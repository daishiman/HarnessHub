'use client';

/**
 * 一覧の絞り込み条件を、画面を離れて戻ってきたときに復元する。
 *
 * 置き場所に sessionStorage を選んだのは、覚えていてほしい範囲が
 * 「いまの作業の続き」だけだから。localStorage にすると翌日開いたときにも
 * 前回の条件が残り、「1 件しか出てこない」という誤解の原因になる。
 * タブを閉じれば消える sessionStorage なら、作業を中断して詳細画面へ行き、
 * 戻ってきたときだけ条件が残る。
 *
 * 復元は描画後 (useEffect) に行う。初期 state で sessionStorage を読むと、
 * サーバー側で描いた HTML と手元で描き直した HTML が食い違って hydration が壊れる。
 * その代わり最初の 1 瞬だけ条件が空になるので、復元が済むまで問い合わせを
 * 待たせるための `restored` を返す。呼び出し側はこれを見てから読み込む。
 */
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

/** 絞り込み欄の記憶に使うキー。画面ごとに分ける (一覧が違えば条件の意味も違う)。 */
export const FILTER_STORAGE_KEYS = {
  sheets: 'harness-hub:filters:sheets',
  docs: 'harness-hub:filters:docs',
  feedback: 'harness-hub:filters:feedback',
} as const;

export interface RememberedFilters<TFilters> {
  /** 問い合わせに使う確定済みの条件。 */
  readonly filters: TFilters;
  /** 入力中の条件。「絞り込む」を押すまで問い合わせには使わない。 */
  readonly draft: TFilters;
  readonly setDraft: Dispatch<SetStateAction<TFilters>>;
  /** 入力中の条件を確定し、同時に覚えさせる。 */
  readonly apply: (next: TFilters) => void;
  /** 復元の判定が済んだか。false の間は問い合わせを始めない。 */
  readonly restored: boolean;
}

/**
 * 覚えていた条件を読み出す。
 *
 * 初期値に無いキーは捨て、文字列でない値は初期値のままにする。
 * 絞り込み欄の構成は改修で変わるため、前の版で保存された形をそのまま信じると、
 * 存在しない条件で問い合わせて「0 件」になる事故が起きる。
 */
function restoreFilters<TFilters extends object>(storageKey: string, initial: TFilters): TFilters | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return null;
    const saved = parsed as Record<string, unknown>;
    const next: Record<string, unknown> = { ...(initial as Record<string, unknown>) };
    for (const key of Object.keys(initial)) {
      const value = saved[key];
      if (typeof value === 'string') next[key] = value;
    }
    return next as TFilters;
  } catch {
    // 保存領域が使えない設定 (プライベートモード等) でも一覧は動かす。覚えないだけ
    return null;
  }
}

function saveFilters(storageKey: string, filters: object): void {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(filters));
  } catch {
    // 同上。覚えられなくても操作は成立させる
  }
}

/**
 * @param skipRestore URL などで条件が指定されて開いた場合に true。
 *   ヘッダーの検索から来たときに前回の条件を上書きで復元すると、
 *   検索したはずの語が消えて別の結果が出る。指定して開いた条件を常に優先する。
 */
export function useRememberedFilters<TFilters extends object>(
  storageKey: string,
  initial: TFilters,
  skipRestore = false,
): RememberedFilters<TFilters> {
  const [draft, setDraft] = useState<TFilters>(initial);
  const [filters, setFilters] = useState<TFilters>(initial);
  const [restored, setRestored] = useState(false);
  // 初期値は描画のたびに作り直される可能性がある。ref に退避して復元を 1 回だけにする
  // (毎回走らせると、入力中の条件を保存済みの条件で上書きしてしまう)
  const initialRef = useRef(initial);

  useEffect(() => {
    if (skipRestore) {
      setRestored(true);
      return;
    }
    const saved = restoreFilters(storageKey, initialRef.current);
    if (saved !== null) {
      setDraft(saved);
      setFilters(saved);
    }
    setRestored(true);
  }, [skipRestore, storageKey]);

  const apply = useCallback(
    (next: TFilters): void => {
      setFilters(next);
      setDraft(next);
      saveFilters(storageKey, next);
    },
    [storageKey],
  );

  return { filters, draft, setDraft, apply, restored };
}
