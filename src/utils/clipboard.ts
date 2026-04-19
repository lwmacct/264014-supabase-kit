export async function copyText(text: string) {
  if (!navigator.clipboard) {
    throw new Error("当前环境不支持复制。");
  }

  await navigator.clipboard.writeText(text);
}
