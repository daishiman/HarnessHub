// DMDB-T08 (型テスト): リポジトリ関数が RepositoryContext を第 1 引数に要求し、
// 省略・空スコープがコンパイルエラー/実行時エラーになることを tsc で検証する。
// このファイルは実行されない (tsconfig の typecheck 対象にのみ含まれる)。

import type { ScopedCrudRepo } from '../../repository/crud';
import type { UsersRepo } from '../../repository/users';
import { createRepositoryContext } from '../../src/context';

export function typeLevelChecks(repo: ScopedCrudRepo, users: UsersRepo): void {
  // @ts-expect-error RepositoryContext を省略した呼出しはコンパイルエラー (tenant scope 強制)
  void repo.findById('some-id');

  // @ts-expect-error 文字列を context の代わりに渡せない
  void users.decryptSalary('tenant-a', 'user-1');

  // @ts-expect-error tenantId 無しで RepositoryContext を構築できない
  void createRepositoryContext({});
}
