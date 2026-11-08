import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DateTimePicker, type DateTimePickerProps } from "@/components/date-time-picker";

function setup(overrides: Partial<DateTimePickerProps> = {}) {
  const props: DateTimePickerProps = {
    date: "2026-11-08",
    time: "14:00",
    minDate: "2026-11-08",
    maxDate: "2026-11-13",
    minTime: "13:12",
    maxTime: "11:00",
    cityName: "Abidjan",
    tzLabel: "GMT",
    idPrefix: "abj",
    onDateChange: vi.fn(),
    onTimeChange: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(<DateTimePicker {...props} />);
  return { props, user };
}

describe("DateTimePicker", () => {
  it("affiche la date et l'heure avec des libellés accessibles en français", () => {
    setup();
    const dateButton = screen.getByRole("button", {
      name: "Date pour Abidjan : dimanche 8 novembre 2026 (heure locale, GMT)",
    });
    expect(dateButton.textContent).toContain("dim. 8 nov.");
    expect(dateButton.id).toBe("abj-date");

    const timeButton = screen.getByRole("button", {
      name: "Heure pour Abidjan : 14:00 (heure locale, GMT)",
    });
    expect(timeButton.textContent).toBe("14:00");
    expect(timeButton.id).toBe("abj-time");
  });

  it("désactive les deux boutons si disabled", () => {
    setup({ disabled: true });
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("propose les créneaux à partir de l'heure actuelle le premier jour et appelle onTimeChange", async () => {
    const { props, user } = setup();
    await user.click(screen.getByRole("button", { name: /^Heure pour Abidjan/ }));

    const grid = await screen.findByRole("group", { name: "Créneaux horaires" });
    const slots = within(grid)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(slots[0]).toBe("13:30");
    expect(slots.at(-1)).toBe("23:30");
    expect(slots).not.toContain("13:00");
    expect(within(grid).getByRole("button", { name: "14:00" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    await user.click(within(grid).getByRole("button", { name: "15:00" }));
    expect(props.onTimeChange).toHaveBeenCalledExactlyOnceWith("15:00");
  });

  it("borne les créneaux du dernier jour à l'horizon des prévisions", async () => {
    const { user } = setup({ date: "2026-11-13", time: "09:00" });
    await user.click(screen.getByRole("button", { name: /^Heure pour Abidjan/ }));
    const grid = await screen.findByRole("group", { name: "Créneaux horaires" });
    const slots = within(grid)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(slots[0]).toBe("00:00");
    expect(slots.at(-1)).toBe("11:00");
    expect(slots).toHaveLength(23);
  });

  it("le bouton « Maintenant » appelle onReset", async () => {
    const onReset = vi.fn();
    const { props, user } = setup({ onReset });
    await user.click(screen.getByRole("button", { name: /^Heure pour Abidjan/ }));
    await user.click(await screen.findByRole("button", { name: "Maintenant" }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(props.onTimeChange).not.toHaveBeenCalled();
  });

  it("sélectionne un jour du calendrier sans décalage dû au fuseau du navigateur", async () => {
    const { props, user } = setup();
    await user.click(screen.getByRole("button", { name: /^Date pour Abidjan/ }));
    const dialog = await screen.findByRole("dialog", { name: "Choisir la date pour Abidjan" });

    await user.click(within(dialog).getByRole("button", { name: /11 novembre 2026/ }));
    expect(props.onDateChange).toHaveBeenCalledExactlyOnceWith("2026-11-11");
  });

  it("le bouton « Aujourd'hui » revient au premier jour (désactivé s'il est déjà choisi)", async () => {
    const onDateChange = vi.fn();
    const { user } = setup({ date: "2026-11-10", onDateChange });
    await user.click(screen.getByRole("button", { name: /^Date pour Abidjan/ }));
    await user.click(await screen.findByRole("button", { name: "Aujourd'hui" }));
    expect(onDateChange).toHaveBeenCalledExactlyOnceWith("2026-11-08");
  });

  it("désactive « Aujourd'hui » quand la date choisie est déjà le premier jour", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /^Date pour Abidjan/ }));
    const today = await screen.findByRole("button", { name: "Aujourd'hui" });
    expect((today as HTMLButtonElement).disabled).toBe(true);
  });
});
