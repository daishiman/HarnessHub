# P07 受入判定記録

対象: `HarnessHub-3sjj.7`。ローカル受入は **PASS**、本番到達実測は P13 に残る。

| acceptance | 判定 | 根拠 |
| --- | --- | --- |
| 既定着地は `/sheets` | PASS | T-LANDING-01、signin page test |
| 外部 redirect を防ぐ | PASS | T-LANDING-02 |
| 認証済み `/` は redirect | PASS | T-ROOT-01 |
| browser route は tenant scope で通る | PASS | T-SCOPE-01 |
| header/session 不一致を拒否 | PASS | T-SCOPE-02 |
| scope 入力なしを拒否 | PASS | T-SCOPE-03 |
| 非所属 workspace を採用しない | PASS | T-WORKSPACE-01 |
| redirect が認可を迂回しない | PASS | 相対 path 限定と既存 `authorize()` 境界の組合せ検査 |

根拠コマンドと実測数は [test-run-record.md](./test-run-record.md) を参照する。
