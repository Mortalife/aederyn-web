import { expect, test } from "@playwright/test";

test("item form picks an icon from the sprite", async ({ page }) => {
  await page.goto("/items/item_flint");
  const picker = page.getByTestId("icon-picker");
  const input = picker.locator('input[name="icon"]');

  await expect(input).toHaveValue("flint-spark");
  await expect(picker.locator('[data-icon="flint-spark"]')).toHaveAttribute("aria-pressed", "true");

  await picker.getByTestId("icon-search").fill("axe");
  await expect(picker.locator("[data-icon]:visible")).not.toHaveCount(0);
  await expect(picker.locator('[data-icon="flint-spark"]')).toBeHidden();

  await picker.locator('[data-icon="stone-axe"]').click();
  await expect(input).toHaveValue("stone-axe");
  await expect(picker.locator("[data-icon-preview] use")).toHaveAttribute("href", "#icon-stone-axe");
  await expect(picker.locator('[data-icon="stone-axe"]')).toHaveAttribute("aria-pressed", "true");
  await expect(picker.locator('[data-icon="flint-spark"]')).toHaveAttribute("aria-pressed", "false");

  await picker.getByRole("button", { name: "Clear" }).click();
  await expect(input).toHaveValue("");
});
