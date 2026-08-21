import NewPageForm from "@/components/admin/NewPageForm";

export default function NewPagePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">STRONY</p>
        <h1 className="font-display text-3xl text-ink-white">Nowa strona</h1>
        <p className="mt-2 max-w-md text-[13px] text-ink-grey">
          Podaj tytuł i adres URL — moduły (Hero, Galeria, CTA…) dodasz w następnym kroku, w
          wizualnym edytorze.
        </p>
      </div>
      <NewPageForm />
    </div>
  );
}
