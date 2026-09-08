import { describe, expect, it } from "vitest";
import { cloneBuilderModule, defaultHomepageModules, withDefaults } from "../lib/modules";

describe("homepage builder content", () => {
  it("builds the public page entirely from sections, columns and individual widgets", () => {
    const modules = defaultHomepageModules();
    expect(modules.every((module) => module.type === "columns")).toBe(true);
    const widgets = modules.flatMap((module) => withDefaults("columns", module.data).columns.flat());
    expect(widgets.some((widget) => widget.type === "portfolio")).toBe(true);
    expect(widgets.some((widget) => widget.type === "booking")).toBe(true);
    expect(widgets.some((widget) => widget.type === "heading")).toBe(true);
    expect(widgets.some((widget) => widget.type === "image")).toBe(true);
  });

  it("duplicates a section deeply and regenerates nested widget identifiers", () => {
    const original = defaultHomepageModules()[0];
    const clone = cloneBuilderModule(original);
    expect(clone.id).not.toBe(original.id);
    const originalWidgets = withDefaults("columns", original.data).columns.flat();
    const clonedWidgets = withDefaults("columns", clone.data).columns.flat();
    expect(clonedWidgets).toHaveLength(originalWidgets.length);
    expect(clonedWidgets.map((widget) => widget.id)).not.toEqual(originalWidgets.map((widget) => widget.id));
    clonedWidgets[0].data.text = "Zmiana tylko w kopii";
    expect(originalWidgets[0].data.text).not.toBe("Zmiana tylko w kopii");
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
