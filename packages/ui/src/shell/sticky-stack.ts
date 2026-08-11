/**
 * シェル内の sticky 面が共有する高さ・積層位置の契約。
 *
 * `*HeightVariable` は DOM の実測値、`*OffsetVariable` は現在のスクロール
 * コンテナで実際に空ける位置を表す。スマホは viewport がスクロールするため
 * ShellHeader の高さを空け、md 以上は本文ペインだけがスクロールするため 0 にする。
 */
export const shellHeaderSelector = '[data-hh-shell-header]';
export const stickyScreenHeaderSelector = '[data-hh-screen-header="sticky"]';

export const shellHeaderHeightVariable = '--hh-shell-header-height';
export const screenHeaderHeightVariable = '--hh-screen-header-height';
export const shellHeaderOffsetVariable = '--hh-shell-header-offset';
export const screenHeaderOffsetVariable = '--hh-screen-header-offset';

/** JS が動く前も ShellHeader と ScreenHeader が重ならないための既定高。 */
export const shellHeaderMinHeight = '56px';

/** ScreenHeader が貼り付く位置。シェル外では 0px へ安全に倒す。 */
export const screenHeaderStickyInset = `var(${shellHeaderOffsetVariable}, 0px)`;

/** FilterBar など、ScreenHeader の次に貼り付く面の位置。 */
export const screenHeaderStackEndInset = `var(${screenHeaderOffsetVariable}, calc(var(${shellHeaderOffsetVariable}, 0px) + var(${screenHeaderHeightVariable}, 0px)))`;
