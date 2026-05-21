// AI-generated text-аас энгийн bold formatting гаргаж, DOMPurify-ээр sanitize хийнэ.
// LLM-аас XSS payload орох эрсдэл байгаа учраас.
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["strong", "em", "b", "i", "br"];

export function safeFormatLine(text: string): string {
  // Тэмдэгт орлуулах: **bold** → <strong>bold</strong>
  const withBold = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Sanitize — зөвхөн зөвшөөрөгдсөн tag үлдээнэ
  return DOMPurify.sanitize(withBold, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });
}
