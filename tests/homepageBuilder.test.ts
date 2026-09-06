import { describe, expect, it } from "vitest";
import { defaultHomepageModules, withDefaults } from "../lib/modules";

describe("homepage builder content", () => {
  it("includes the editable booking calendar inside contact without a duplicate", () => {
    const modules = defaultHomepageModules();
    expect(modules.filter((module) => module.type === "booking")).toHaveLength(0);
    const contact = modules.find((module) => module.type === "contact");
    expect(withDefaults("contact", contact?.data).booking.calendarLabel).toBeTruthy();
  });

  it("backfills newly editable fields without overwriting saved copy", () => {
    const hero = withDefaults("hero", { heading1: "Mój własny nagłówek" });
    expect(hero.heading1).toBe("Mój własny nagłówek");
    expect(hero.primaryBtnHref).toBe("#kalendarz");
    expect(hero.portraitAlt).toBeTruthy();

    const contact = withDefaults("contact", { formTitle: "Napisz do mnie" });
    expect(contact.formTitle).toBe("Napisz do mnie");
    expect(contact.formSubmitLabel).toBeTruthy();
    expect(contact.booking.bookingButtonLabel).toBeTruthy();
    expect(contact.booking.consultationLabel).toBe("KONSULTACJA");
    expect(contact.booking.consultationButtonLabel).toBe("UMÓW KONSULTACJĘ");

    const partiallySavedContact = withDefaults("contact", { booking: { freeLabel: "DOSTĘPNY" } });
    expect(partiallySavedContact.booking.freeLabel).toBe("DOSTĘPNY");
    expect(partiallySavedContact.booking.consultationLabel).toBe("KONSULTACJA");
  });
});
