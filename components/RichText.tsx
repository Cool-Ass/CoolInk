/**
 * Renders CMS page content authored as plain text in the admin panel:
 * blank lines separate paragraphs, single line breaks become <br />.
 * Intentionally simple (no markdown/HTML parsing) so admin-authored
 * content can never inject markup.
 */
export default function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  if (!paragraphs.length) return null;

  return (
    <div className="flex flex-col gap-5">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-ink-grey">
          {paragraph.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
