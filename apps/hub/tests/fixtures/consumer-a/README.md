# consumer-a fixture

共通層の **第 2 consumer 系統**（test-design.md §2.2）。

- `apps/hub/src/**` とは独立した消費者として、共通層を **public API（package 名）経由でのみ** 利用する。
- 相対 path で `packages/*` を直接参照してはならない。参照した時点で HF-A4-CONTRACT-00x は fail 扱いになる。
- ここに共通層の再実装（同じ責務の関数・schema の作り直し）を置いてはならない。fixture の役割は「同一実装を指していること」の証明であって、代替実装の提供ではない。
