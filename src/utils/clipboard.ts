/**
 * 复制文本到剪贴板，包含多种降级处理
 */

export interface CopyResult {
  /** 是否复制成功 */
  success: boolean;
  /** 失败时的错误提示 */
  message?: string;
}

/**
 * 尝试将文本复制到剪贴板
 * @param text 要复制的文本
 * @param inputRef 可选的输入框引用，若提供则使用其执行复制
 */
export async function copyText(
  text: string,
  inputRef?: HTMLInputElement | null
): Promise<CopyResult> {
  // 优先使用原生异步 Clipboard API
<<<<<<< HEAD
  if ((navigator as any).clipboard && (navigator as any).clipboard.writeText) {
    try {
      await (navigator as any).clipboard.writeText(text);
=======
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
>>>>>>> pr-53
      return { success: true };
    } catch {
      // 忽略错误，转而使用 document.execCommand
    }
  }

  let input = inputRef ?? undefined;
  let cleanup = false;

  // 未传入 inputRef 时创建隐藏输入框
  if (!input) {
    input = document.createElement('input');
    input.value = text;
    input.setAttribute('aria-hidden', 'true');
<<<<<<< HEAD
    (input.style as any).position = 'fixed';
    (input.style as any).opacity = '0';
    (input.style as any).pointerEvents = 'none';
=======
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
>>>>>>> pr-53
    document.body.appendChild(input);
    cleanup = true;
  } else {
    input.value = text;
  }

  input.select();

  try {
    const ok = document.execCommand('copy');
    if (cleanup) {
      document.body.removeChild(input);
    }
    if (ok) {
      return { success: true };
    }
    return {
      success: false,
      message: '浏览器不支持自动复制，请手动复制',
    };
  } catch (err) {
    if (cleanup) {
      document.body.removeChild(input);
    }
    return {
      success: false,
      message:
        err instanceof Error
          ? `复制失败: ${err.message}`
          : '复制失败，请手动复制',
    };
  }
}
<<<<<<< HEAD

=======
>>>>>>> pr-53
