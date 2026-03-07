import type { Seller } from "./types";

export const sellers: Seller[] = [
  {
    id: "seller-katzs-1",
    restaurantId: "katzs",
    firstName: "Marco",
    lastInitial: "T",
    positionInLine: 3,
    waitEstimate: "~8 min",
    trustScore: 92,
    completedOrders: 47,
    fee: 5.0,
    menuFlexibility: "full",
    status: "available",
    joinedAt: "2026-03-07T11:22:00Z",
  },
  {
    id: "seller-katzs-2",
    restaurantId: "katzs",
    firstName: "Dee",
    lastInitial: "R",
    positionInLine: 7,
    waitEstimate: "~18 min",
    trustScore: 78,
    completedOrders: 12,
    fee: 3.5,
    menuFlexibility: "popular-only",
    status: "available",
    joinedAt: "2026-03-07T11:35:00Z",
  },
  {
    id: "seller-joes-1",
    restaurantId: "joes-pizza",
    firstName: "Nico",
    lastInitial: "V",
    positionInLine: 2,
    waitEstimate: "~5 min",
    trustScore: 88,
    completedOrders: 31,
    fee: 3.0,
    menuFlexibility: "full",
    status: "available",
    joinedAt: "2026-03-07T12:01:00Z",
  },
  {
    id: "seller-russ-1",
    restaurantId: "russ-daughters",
    firstName: "Sasha",
    lastInitial: "K",
    positionInLine: 5,
    waitEstimate: "~12 min",
    trustScore: 95,
    completedOrders: 63,
    fee: 4.5,
    menuFlexibility: "full",
    status: "available",
    joinedAt: "2026-03-07T10:48:00Z",
  },
];

export function getSellersByRestaurant(restaurantId: string): Seller[] {
  return sellers.filter((s) => s.restaurantId === restaurantId);
}
