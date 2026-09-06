import { describe, expect, it } from "vitest";
import { defaultHomepageModules, withDefaults } from "../lib/modules";

describe("homepage builder content", () => {
  it("includes the editable booking calendar in a new homepage", () => {
    const modules = defaultHomepageModules();
    expect(modules.filter((module) => module.type === "booking")).toHaveLength(1);
  });

  it("backfills newly editable fields without overwriting saved copy", () => {
    const hero = withDefaults("hero", { heading1: "Mój własny nagłówek" });
    expect(hero.heading1).toBe("Mój własny nagłówek");
    expect(hero.primaryBtnHref).toBe("#kalendarz");
    expect(hero.portraitAlt).toBeTruthy();

    const contact = withDefaults("contact", { formTitle: "Napisz do mnie" });
    expect(contact.formTitle).toBe("Napisz do mnie");
    expect(contact.formSubmitLabel).toBeTruthy();
  });
});
