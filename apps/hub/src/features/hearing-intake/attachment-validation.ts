/**
 * 添付ファイル (画像・動画・CSV・Excel) のクライアント側事前検証。
 *
 * サーバ側の真の判定は `lib/hearing-share/safe-attachment.ts` の `validateSafeAttachment`
 * (実バイトの signature 検査) が行う。ここではブラウザ申告の MIME とサイズだけを見て、
 * 明らかに対応外のファイルを「送信して初めて分かる」体験にしないための早期チェックに留める。
 *
 * 詳細画面の添付パネル (`components/screenshots-panel.tsx`) とウィザードのステージング添付
 * (作成前、シートIDが無い段階での一時保持) の両方が、この 1 箇所を正本として共有する。
 */
import {
  SAFE_ATTACHMENT_CONTENT_TYPES,
  type SafeAttachmentContentType,
} from '../../lib/hearing-share/safe-attachment.js';

/** `tenant-data/objects/route.ts` の 50MB より絞った実用上限。API 側 (`MAX_UPLOAD_BYTES`) と同じ値。 */
export const ATTACHMENT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** `<input type="file" accept="...">` に渡す許容形式。拡張子と MIME の両方を並べ、OS のファイル選択ダイアログでの絞り込みを効かせる。 */
export const ATTACHMENT_ACCEPTED_FILE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp4',
  '.mov',
  '.csv',
  '.xlsx',
  '.xls',
  ...SAFE_ATTACHMENT_CONTENT_TYPES,
].join(',');

export interface AttachmentFileRejection {
  readonly file: File;
  readonly message: string;
}

function isAcceptedContentType(contentType: string): contentType is SafeAttachmentContentType {
  const normalized = contentType.trim().toLowerCase();
  return (SAFE_ATTACHMENT_CONTENT_TYPES as readonly string[]).includes(normalized);
}

/**
 * 1 ファイルを検証する。`null` は合格。サイズ超過・非対応形式は日本語メッセージで理由を返し、
 * 呼び出し側 (ウィザード/添付パネル) がそのまま利用者へ表示できるようにする。
 */
export function validateAttachmentFile(file: File): string | null {
  if (file.size > ATTACHMENT_MAX_UPLOAD_BYTES) {
    return `「${file.name}」はサイズが25MBを超えているため追加できません。`;
  }
  if (!isAcceptedContentType(file.type)) {
    return `「${file.name}」は対応していない形式です。画像 (PNG/JPEG/WebP)・動画 (MP4/MOV)・CSV・Excel (XLSX/XLS) のいずれかを指定してください。`;
  }
  return null;
}

/** 複数ファイル (input の multiple 選択・クリップボード貼り付け) をまとめて検証し、合格分と却下分に分ける。 */
export function partitionAttachmentFiles(files: readonly File[]): {
  readonly accepted: readonly File[];
  readonly rejected: readonly AttachmentFileRejection[];
} {
  const accepted: File[] = [];
  const rejected: AttachmentFileRejection[] = [];
  for (const file of files) {
    const message = validateAttachmentFile(file);
    if (message === null) accepted.push(file);
    else rejected.push({ file, message });
  }
  return { accepted, rejected };
}
