import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { sanitizeRichText } from "@/lib/richText";
import { signatureDigest, validateSignature, type SignedSnapshot } from "@/lib/sessionSignature";
export async function signedDocumentPdf(record: { snapshot: string; signature: string; digest: string; acceptedAt: Date }) {
  if (signatureDigest(record.snapshot, record.signature, record.acceptedAt) !== record.digest) throw Error("SIGNATURE_INTEGRITY_FAILED");
  const snapshot: SignedSnapshot = JSON.parse(record.snapshot), strokes = validateSignature(JSON.parse(record.signature));
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit); pdf.setTitle(snapshot.title); pdf.setCreationDate(record.acceptedAt); pdf.setModificationDate(record.acceptedAt);
  const font = await pdf.embedFont(await readFile(join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf")), { subset: true });
  const supported = new Set(font.getCharacterSet());
  const clean = (text: string) => Array.from(text.replace(/[\u0000-\u0008\u000B-\u001F]/g, "")).map(char => supported.has(char.codePointAt(0)!) ? char : ` [U+${char.codePointAt(0)!.toString(16)}] `).join("");
  let page = pdf.addPage([595, 842]), y = 794;
  const line = (text: string, size = 10) => {
    const words = clean(text).split(/\s+/); let buffer = "";
    for (const word of words) {
      // Split oversized tokens as well as ordinary words.
      const parts: string[] = []; let partBuffer = "";
      for (const char of word) { if (partBuffer && font.widthOfTextAtSize(partBuffer + char, size) > 495) { parts.push(partBuffer); partBuffer = ""; } partBuffer += char; }
      parts.push(partBuffer);
      for (const part of parts) {
        if (buffer && font.widthOfTextAtSize(buffer + " " + part, size) > 495) { if (y < 60) { page = pdf.addPage([595, 842]); y = 794; } page.drawText(buffer, { x: 50, y, font, size }); y -= size + 5; buffer = part; } else buffer += (buffer ? " " : "") + part;
      }
    }
    if (y < 60) { page = pdf.addPage([595, 842]); y = 794; }
    page.drawText(buffer || " ", { x: 50, y, font, size }); y -= size + 7;
  };
  line(snapshot.title, 17); line(`Wersja ${snapshot.version} · ${snapshot.clientName}`); line(`Projekt: ${snapshot.projectTitle}`); line(`Sesja: ${new Date(snapshot.startsAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}`); line(`Akceptacja: ${record.acceptedAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}`);
  const content = sanitizeRichText(snapshot.content).replace(/<\/(p|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, name: string) => ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[name]!).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => { const value = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code); return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : ""; });
  for (const paragraph of content.split("\n")) line(paragraph);
  line("Odpowiedzi formularza:"); for (const [key, value] of Object.entries(snapshot.answers)) line(`${snapshot.fieldLabels?.[key] ?? key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  if (y < 235) { page = pdf.addPage([595, 842]); y = 794; }
  line("Podpis odręczny (nie jest podpisem kwalifikowanym):"); const top = y;
  for (const stroke of strokes) for (let index = 1; index < stroke.length; index++) page.drawLine({ start: { x: 50 + stroke[index - 1][0] * 450, y: top - stroke[index - 1][1] * 130 }, end: { x: 50 + stroke[index][0] * 450, y: top - stroke[index][1] * 130 }, thickness: 1.4, color: rgb(0, 0, 0) });
  y -= 160; line(`SHA-256: ${record.digest}`, 8);
  return pdf.save();
}
