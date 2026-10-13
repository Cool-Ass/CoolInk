import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { signatureDigest, validateSignature } from "@/lib/sessionSignature";
import { signedDocumentPdf } from "@/lib/signedDocumentPdf";
describe("session signatures", () => {
  it.each([null, [], [[[0, 0]]], [[[0, 0], [1, 1]]], [[[0, 0], [1, 1], [NaN, 0]]], [[[0, 0], [1, 1], [2, 0]]], Array.from({ length: 65 }, () => [[0, 0], [1, 1]])])("rejects invalid or empty strokes %j", value => { expect(() => validateSignature(value)).toThrow(); });
  it("normalizes and bounds recorded points", () => { expect(validateSignature([[[0, 0], [.1234567, .5], [1, 1]]])[0][1]).toEqual([.12346, .5]); expect(() => validateSignature([Array.from({ length: 2001 }, (_, i) => [i / 2001, .5])])).toThrow(); });
  it("binds the digest to the exact content, signature and time", () => { const at = new Date(0), digest = signatureDigest("snapshot", "strokes", at); expect(signatureDigest("other", "strokes", at)).not.toBe(digest); expect(signatureDigest("snapshot", "different", at)).not.toBe(digest); expect(signatureDigest("snapshot", "strokes", new Date(1))).not.toBe(digest); });
  it("archives Polish Unicode, long tokens and multi-page content with the original version", async () => {
    const snapshot = JSON.stringify({ title: "Zgoda — zażółć gęślą jaźń", clientName: "Łukasz Żółć", projectTitle: "Tatuaż", version: 3, startsAt: new Date(0).toISOString(), answers: { health: "Tak" }, fieldLabels: { health: "Odpowiedź" }, content: "<p>" + "W".repeat(400) + "</p>" + "<p>Treść archiwalna.</p>".repeat(200) });
    const signature = JSON.stringify([[[.1, .1], [.2, .3], [.4, .2]]]), acceptedAt = new Date(0);
    const record = { snapshot, signature, acceptedAt, digest: signatureDigest(snapshot, signature, acceptedAt) };
    const bytes = await signedDocumentPdf(record), pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2); expect(pdf.getTitle()).toBe("Zgoda — zażółć gęślą jaźń"); expect(bytes.length).toBeGreaterThan(1000);
    await expect(signedDocumentPdf({ ...record, snapshot: snapshot + " " })).rejects.toThrow("SIGNATURE_INTEGRITY_FAILED");
  });
});
