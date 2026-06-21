async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand when clipboard API is blocked.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export type ShareUrlResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareUrl(options: {
  url: string;
  title: string;
}): Promise<ShareUrlResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: options.title, url: options.url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const copied = await copyTextToClipboard(options.url);
  return copied ? "copied" : "failed";
}
