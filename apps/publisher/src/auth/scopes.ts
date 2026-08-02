/**
 * サブコマンドごとの最小 scope (AD-4 帰結・AD-6)。
 * 一括で全 scope を要求せず、コマンドが実際に必要とするものだけを device flow へ渡す。
 */
import type { PublisherTokenScope } from '@harness-hub/schemas';

const PUBLISH_COMMAND_SCOPES: readonly PublisherTokenScope[] = ['publish:write'];
const FEEDBACK_COMMAND_SCOPES: readonly PublisherTokenScope[] = ['feedback:write'];

export function scopesForCommand(command: 'publish' | 'feedback'): readonly PublisherTokenScope[] {
  return command === 'publish' ? PUBLISH_COMMAND_SCOPES : FEEDBACK_COMMAND_SCOPES;
}
