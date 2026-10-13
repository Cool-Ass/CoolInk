import { createHash } from "node:crypto";
export type SignaturePoint = [number, number];
export type SignatureStrokes = SignaturePoint[][];
export function validateSignature(value: unknown): SignatureStrokes {
  if (!Array.isArray(value) || !value.length || value.length > 64) throw Error("Złóż podpis odręczny.");
  let count = 0;
  const strokes = value.map(stroke => {
    if (!Array.isArray(stroke) || stroke.length < 2) throw Error("Złóż czytelny podpis odręczny.");
    return stroke.map(point => {
      if (++count > 2000 || !Array.isArray(point) || point.length !== 2 || point.some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)) throw Error("Nieprawidłowy zapis podpisu.");
      return [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))] as SignaturePoint;
    });
  });
  if (count < 3 || new Set(strokes.flat().map(point => point.join(","))).size < 3) throw Error("Złóż czytelny podpis odręczny.");
  return strokes;
}
export type SignedSnapshot = { documentId: string; title: string; version: number; content: string; answers: Record<string, unknown>; fieldLabels?: Record<string, string>; clientName: string; appointmentId: string; startsAt: string; projectTitle: string };
export function signatureDigest(snapshot: string, signature: string, acceptedAt: Date) { return createHash("sha256").update(snapshot + "\n" + signature + "\n" + acceptedAt.toISOString()).digest("hex"); }
