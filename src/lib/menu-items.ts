import type { MenuItem } from "./types";

export const menuItems: MenuItem[] = [
  // Katz's Delicatessen
  { id: "katzs-1", restaurantId: "katzs", name: "Pastrami on Rye", priceEstimate: 24.95, popular: true },
  { id: "katzs-2", restaurantId: "katzs", name: "Corned Beef on Rye", priceEstimate: 24.95, popular: true },
  { id: "katzs-3", restaurantId: "katzs", name: "Reuben", priceEstimate: 26.95, popular: true },
  { id: "katzs-4", restaurantId: "katzs", name: "Matzo Ball Soup", priceEstimate: 8.95, popular: true },
  { id: "katzs-5", restaurantId: "katzs", name: "Knish", priceEstimate: 6.95, popular: false },
  { id: "katzs-6", restaurantId: "katzs", name: "Hot Dog", priceEstimate: 5.95, popular: false },

  // Joe's Pizza
  { id: "joes-1", restaurantId: "joes-pizza", name: "Plain Slice", priceEstimate: 3.5, popular: true },
  { id: "joes-2", restaurantId: "joes-pizza", name: "Sicilian Slice", priceEstimate: 4.5, popular: true },
  { id: "joes-3", restaurantId: "joes-pizza", name: "Fresh Mozzarella Slice", priceEstimate: 5.0, popular: true },
  { id: "joes-4", restaurantId: "joes-pizza", name: "Two Slices + Drink", priceEstimate: 9.5, popular: true },
  { id: "joes-5", restaurantId: "joes-pizza", name: "Whole Pie Plain", priceEstimate: 28.0, popular: false },

  // Russ & Daughters
  { id: "russ-1", restaurantId: "russ-daughters", name: "Classic Bagel & Lox", priceEstimate: 18.0, popular: true },
  { id: "russ-2", restaurantId: "russ-daughters", name: "Whitefish Salad on Bagel", priceEstimate: 16.0, popular: true },
  { id: "russ-3", restaurantId: "russ-daughters", name: "Super Heebster", priceEstimate: 21.0, popular: true },
  { id: "russ-4", restaurantId: "russ-daughters", name: "Chopped Liver on Rye", priceEstimate: 14.0, popular: true },
  { id: "russ-5", restaurantId: "russ-daughters", name: "Borscht", priceEstimate: 9.0, popular: false },
  { id: "russ-6", restaurantId: "russ-daughters", name: "Babka Chocolate", priceEstimate: 16.0, popular: false },
];

export function getMenuItemsByRestaurant(restaurantId: string): MenuItem[] {
  return menuItems.filter((m) => m.restaurantId === restaurantId);
}
