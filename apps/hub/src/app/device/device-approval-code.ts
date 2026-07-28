/** user_code の表示・送信前正規化。最終的な契約検証は承認APIのZod schemaが担う。 */

const USER_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

export function normalizeUserCodeInput(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, '');
}

export function isValidUserCodeInput(value: string): boolean {
  return USER_CODE_PATTERN.test(normalizeUserCodeInput(value));
}
