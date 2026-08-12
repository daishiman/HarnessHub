/**
 * 「誰としてサインインしているか」をヘッダーに出すための表示名の決め方。
 *
 * ここを純関数として切り出しているのは、フォールバックの順序が業務上の判断だから。
 * `users.name` は NOT NULL だが**空文字になり得る** — JIT provisioning (db-ports.ts の
 * `createFromOidc`) が `name: ''` で作るため、初回サインインの利用者は必ず空文字を通る。
 * NOT NULL を「値がある」と読んで `name` をそのまま出すと、氏名の位置が無言で空白になる。
 */

/** 表示名の候補。DB 上どちらも NOT NULL だが、どちらも空文字を取り得る。 */
export interface AccountNameSource {
  readonly name: string;
  readonly email: string;
}

/**
 * 表示名を決める。人が読める名前が 1 つも無ければ `undefined` を返す。
 *
 * 順序は「氏名 → メールアドレス → (無し)」。
 *
 * - **氏名**: 本人を名指しする語として最も自然。
 * - **メールアドレス**: 氏名が未取得でも、社内では誰なのかがほぼ一意に伝わる。
 *   `sub@example.invalid` のような合成アドレスは DB に入らない契約なので
 *   (db-ports.ts の `createFromOidc` が空文字で表す)、ここに来る値は実在のアドレスか空文字。
 * - **無し**: 呼び出し側は識別子 (users.id) を識別子として出す。ULID を氏名の位置に
 *   そのまま置くと「読めない名前」に見えるため、識別子は識別子の見せ方 (IdBadge) へ落とす。
 *
 * 空白だけの値も「無い」として扱う。全角空白を含めて落とすため `trim()` に任せる。
 */
export function resolveAccountDisplayName(source: AccountNameSource): string | undefined {
  const name = source.name.trim();
  if (name !== '') return name;

  const email = source.email.trim();
  if (email !== '') return email;

  return undefined;
}
