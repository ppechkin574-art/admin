export interface TextPart {
  type: "text" | "latex" | "image" | "video";
  content: string;
  originalContent?: string;
}

const LATEX_REGEX = /(r["'][\s\S]*?["'])/;
const MEDIA_IN_BRACES_REGEX = /(\{[^{}]*https?:\/\/[^}]+\})/;

export const extractPureLatex = (text: string): string => {
  const regex = /(r["'][\s\S]*?["'])/;
  const match = regex.exec(text);
  return match ? match[1].substring(2, match[1].length - 1) : text;
};

export const extractPureUrl = (text: string): string => {
  const match = MEDIA_IN_BRACES_REGEX.exec(text);
  if (!match) return text;

  const content = match[0];
  return content.substring(1, content.length - 1).trim();
};

export const getMediaType = (url: string): "image" | "video" | null => {
  if (!url) return null;

  const urlLower = url.toLowerCase().trim();

  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
  ];
  const isImage = imageExtensions.some((ext) => urlLower.endsWith(ext));

  if (isImage) return "image";

  const videoExtensions = [
    ".mp4",
    ".avi",
    ".mov",
    ".webm",
    ".flv",
    ".wmv",
    ".mkv",
  ];
  const isVideo = videoExtensions.some((ext) => urlLower.endsWith(ext));

  if (isVideo) return "video";

  return null;
};

export const isLatexWrapped = (text: string): boolean => {
  return LATEX_REGEX.test(text);
};

export const isUrlInBraces = (text: string): boolean => {
  return MEDIA_IN_BRACES_REGEX.test(text);
};

export const parseTextWithFormulasAndMedia = (text: string): TextPart[] => {
  if (!text || typeof text !== "string")
    return [{ type: "text", content: "", originalContent: "" }];

  let processedText = text;

  const parts: TextPart[] = [];
  let currentIndex = 0;

  const latexPattern = /(r\\?["'][\s\S]*?\\?["'])/;
  const mediaPattern = /(\{[^{}]*https?:\/\/[^}]+\})/;
  const combinedPattern = new RegExp(
    `${latexPattern.source}|${mediaPattern.source}`,
    "gi",
  );

  let match;
  const matches: Array<{
    type: string;
    content: string;
    start: number;
    end: number;
  }> = [];

  while ((match = combinedPattern.exec(processedText)) !== null) {
    const matchedText = match[0];

    if (
      matchedText.startsWith("r") &&
      (matchedText[1] === '"' ||
        matchedText[1] === "'" ||
        matchedText[1] === "\\")
    )
      matches.push({
        type: "latex",
        content: matchedText,
        start: match.index,
        end: match.index + matchedText.length,
      });
    else if (matchedText.startsWith("{") && matchedText.endsWith("}"))
      matches.push({
        type: "media",
        content: matchedText,
        start: match.index,
        end: match.index + matchedText.length,
      });
  }

  matches.sort((a, b) => a.start - b.start);

  for (const match of matches) {
    if (match.start > currentIndex) {
      const beforeText = processedText.substring(currentIndex, match.start);
      if (beforeText.trim())
        parts.push({
          type: "text",
          content: beforeText,
          originalContent: beforeText,
        });
    }

    if (match.type === "latex") {
      let latexContent = match.content;
      if (latexContent.startsWith('r\\"') || latexContent.startsWith("r\\'"))
        latexContent = latexContent.substring(3, latexContent.length - 2);
      else if (latexContent.startsWith('r"') || latexContent.startsWith("r'"))
        latexContent = latexContent.substring(2, latexContent.length - 1);

      parts.push({
        type: "latex",
        content: latexContent,
        originalContent: match.content,
      });
    } else if (match.type === "media") {
      const url = match.content.substring(1, match.content.length - 1).trim();
      const mediaType = getMediaType(url);

      if (mediaType)
        parts.push({
          type: mediaType,
          content: url,
          originalContent: match.content,
        });
      else
        parts.push({
          type: "text",
          content: match.content,
          originalContent: match.content,
        });
    }

    currentIndex = match.end;
  }

  if (currentIndex < processedText.length) {
    const remainingText = processedText.substring(currentIndex);
    if (remainingText.trim())
      parts.push({
        type: "text",
        content: remainingText,
        originalContent: remainingText,
      });
  }

  if (parts.length === 0 && processedText.trim())
    parts.push({
      type: "text",
      content: processedText,
      originalContent: processedText,
    });

  return parts;
};

export const containsLatex = (text: string): boolean => {
  if (!text) return false;
  const latexRegex = /(r\\?["'][\s\S]*?\\?["'])/;
  return latexRegex.test(text);
};

export const containsMedia = (text: string): boolean => {
  if (!text) return false;

  const mediaRegex = /(\{[^{}]*https?:\/\/[^}]+\})/;
  const escapedText = text.replace(/\\"/g, '"').replace(/\\'/g, "'");

  return mediaRegex.test(escapedText);
};

export const extractMediaUrls = (
  text: string,
): Array<{ url: string; type: "image" | "video" }> => {
  const urls: Array<{ url: string; type: "image" | "video" }> = [];

  if (!text) return urls;

  const mediaRegex = new RegExp(MEDIA_IN_BRACES_REGEX);
  let match: RegExpExecArray | null;
  mediaRegex.lastIndex = 0;

  while ((match = mediaRegex.exec(text)) !== null) {
    const mediaContent = match[0];
    const url = mediaContent.substring(1, mediaContent.length - 1).trim();
    const mediaType = getMediaType(url);
    if (mediaType) urls.push({ url, type: mediaType });
  }

  return urls;
};

export const formatForInput = (text: string): string => {
  return text;
};

export const formatForPreview = (text: string): string => {
  if (!text) return "";

  let result = text;

  result = result.replace(MEDIA_IN_BRACES_REGEX, (match) => {
    const url = match.substring(1, match.length - 1).trim();
    return url;
  });

  result = result.replace(LATEX_REGEX, (match) => {
    return match.substring(2, match.length - 1);
  });

  return result;
};

export const renderTextPreview = (text: string): string => {
  const parts = parseTextWithFormulasAndMedia(text);
  return parts
    .map((part) => {
      switch (part.type) {
        case "latex":
          return `[LaTeX формула]`;
        case "image":
          return `[Изображение]`;
        case "video":
          return `[Видео]`;
        default:
          return part.content;
      }
    })
    .join("");
};
