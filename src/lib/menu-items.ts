import type { MenuItem } from "./types";

export const menuItems: MenuItem[] = [
  // Katz's Delicatessen
  { id: "katzs-1", restaurantId: "katzs", name: "Pastrami on Rye", price: 24.95, popular: true },
  { id: "katzs-2", restaurantId: "katzs", name: "Corned Beef on Rye", price: 24.95, popular: true },
  { id: "katzs-3", restaurantId: "katzs", name: "Reuben", price: 26.95, popular: true },
  { id: "katzs-4", restaurantId: "katzs", name: "Matzo Ball Soup", price: 8.95, popular: true },
  { id: "katzs-5", restaurantId: "katzs", name: "Knish", price: 6.95, popular: false },
  { id: "katzs-6", restaurantId: "katzs", name: "Hot Dog", price: 5.95, popular: false },

  // Joe's Pizza
  { id: "joes-1", restaurantId: "joes-pizza", name: "Plain Slice", price: 3.5, popular: true },
  { id: "joes-2", restaurantId: "joes-pizza", name: "Sicilian Slice", price: 4.5, popular: true },
  { id: "joes-3", restaurantId: "joes-pizza", name: "Fresh Mozzarella Slice", price: 5.0, popular: true },
  { id: "joes-4", restaurantId: "joes-pizza", name: "Two Slices + Drink", price: 9.5, popular: true },
  { id: "joes-5", restaurantId: "joes-pizza", name: "Whole Pie Plain", price: 28.0, popular: false },

  // Russ & Daughters
  { id: "russ-1", restaurantId: "russ-daughters", name: "Classic Bagel & Lox", price: 18.0, popular: true },
  { id: "russ-2", restaurantId: "russ-daughters", name: "Whitefish Salad on Bagel", price: 16.0, popular: true },
  { id: "russ-3", restaurantId: "russ-daughters", name: "Super Heebster", price: 21.0, popular: true },
  { id: "russ-4", restaurantId: "russ-daughters", name: "Chopped Liver on Rye", price: 14.0, popular: true },
  { id: "russ-5", restaurantId: "russ-daughters", name: "Borscht", price: 9.0, popular: false },
  { id: "russ-6", restaurantId: "russ-daughters", name: "Babka Chocolate", price: 16.0, popular: false },
];

export function getMenuItemsByRestaurant(restaurantId: string): MenuItem[] {
  return menuItems.filter((m) => m.restaurantId === restaurantId);
}
