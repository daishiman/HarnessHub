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
  users: 'harness-hub:filters:users',
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

/* ------------------------------------------------------------------ *
 * URL query を正本にする絞り込み (feat-card-list-shell 受入条件 3/4)
 * ------------------------------------------------------------------ */

/**
 * 絞り込み条件を **URL query だけ**から復元する。
 *
 * sessionStorage 版 (`useRememberedFilters`) との違いは「誰が正本か」。
 * 記憶に置くと、同じ URL を共有しても相手には別の結果が出て、再読込でも条件が
 * 勝手に戻る。URL に置けば、共有・再読込・戻る/進むの 3 つが同じ 1 つの規則で揃う。
 *
 * 覚えておくのは表示形式 (カード/表) だけにする。表示形式は「見え方の好み」で、
 * 何件出るかを変えないので、共有した相手の結果を左右しない (`useRememberedViewMode`)。
 *
 * 条件の確定は `history.pushState` で履歴に 1 段積む。`replaceState` にすると
 * 「絞り込む前に戻る」ができなくなる。
 */
export interface UrlFilters<TFilters> {
  readonly filters: TFilters;
  readonly draft: TFilters;
  readonly setDraft: Dispatch<SetStateAction<TFilters>>;
  readonly apply: (next: TFilters) => void;
  readonly restored: boolean;
}

/** URL query から絞り込み条件を組み立てる。指定が無いキーは初期値のまま。 */
function readFiltersFromUrl<TFilters extends Record<string, string>>(
  initial: TFilters,
  paramName: Readonly<Record<keyof TFilters & string, string>>,
): TFilters {
  const params = new URLSearchParams(window.location.search);
  const next: Record<string, string> = { ...initial };
  for (const key of Object.keys(initial)) {
    const raw = params.get(paramName[key] ?? key);
    if (raw !== null) next[key] = raw;
  }
  return next as TFilters;
}

export function useUrlFilters<TFilters extends Record<string, string>>(
  initial: TFilters,
  paramName: Readonly<Record<keyof TFilters & string, string>>,
): UrlFilters<TFilters> {
  const [draft, setDraft] = useState<TFilters>(initial);
  const [filters, setFilters] = useState<TFilters>(initial);
  const [restored, setRestored] = useState(false);
  const initialRef = useRef(initial);
  const paramNameRef = useRef(paramName);

  useEffect(() => {
    const sync = (): void => {
      const fromUrl = readFiltersFromUrl(initialRef.current, paramNameRef.current);
      setFilters(fromUrl);
      setDraft(fromUrl);
    };
    sync();
    setRestored(true);
    // 戻る/進むでも同じ規則で読み直す。これが無いと URL だけが変わって一覧が取り残される
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const apply = useCallback((next: TFilters): void => {
    setFilters(next);
    setDraft(next);
    const params = new URLSearchParams(window.location.search);
    for (const key of Object.keys(initialRef.current)) {
      const param = paramNameRef.current[key] ?? key;
      const value = next[key] ?? '';
      // 既定値と同じものは URL へ書かない。共有する URL が短く読めるものになるのと、
      // 「条件が付いているか」を URL の見た目だけで判断できるようにするため。
      if (value === '' || value === initialRef.current[key]) params.delete(param);
      else params.set(param, value);
    }
    const search = params.toString();
    window.history.pushState(null, '', `${window.location.pathname}${search === '' ? '' : `?${search}`}`);
  }, []);

  return { filters, draft, setDraft, apply, restored };
}

/** 一覧の表示形式。カードを既定にする (1 件を読み切れる形が既定という判断)。 */
export type ListViewMode = 'cards' | 'table';

export const VIEW_MODE_STORAGE_KEYS = {
  sheets: 'harness-hub:view-mode:sheets',
  docs: 'harness-hub:view-mode:docs',
  catalog: 'harness-hub:view-mode:catalog',
} as const;

/**
 * 表示形式だけを sessionStorage で覚える。
 *
 * 絞り込みと違って URL には載せない。載せると、共有した URL に自分の見え方の好みが
 * 混ざり、相手の画面まで変わってしまう。逆にここで絞り込みを覚えないことで、
 * 「URL の条件が記憶に上書きされる」という取り違えが構造的に起きなくなる。
 */
export function useRememberedViewMode(storageKey: string): readonly [ListViewMode, (next: ListViewMode) => void] {
  const [viewMode, setViewMode] = useState<ListViewMode>('cards');

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved === 'cards' || saved === 'table') setViewMode(saved);
    } catch {
      // 保存領域が使えなくても一覧は動かす。覚えないだけ
    }
  }, [storageKey]);

  const update = useCallback(
    (next: ListViewMode): void => {
      setViewMode(next);
      try {
        window.sessionStorage.setItem(storageKey, next);
      } catch {
        // 同上
      }
    },
    [storageKey],
  );

  return [viewMode, update] as const;
}
