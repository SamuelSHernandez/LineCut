import type { Restaurant } from "./types";

export const restaurants: Restaurant[] = [
  {
    id: "katzs",
    name: "Katz's Delicatessen",
    address: "205 E Houston St",
    lat: 40.7223,
    lng: -73.9874,
    cuisine: ["Deli", "Sandwich"],
    activeSellers: 2,
    waitEstimate: "~25 min",
  },
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    address: "7 Carmine St",
    lat: 40.7308,
    lng: -74.0021,
    cuisine: ["Pizza"],
    activeSellers: 1,
    waitEstimate: "~12 min",
  },
  {
    id: "russ-daughters",
    name: "Russ & Daughters",
    address: "179 E Houston St",
    lat: 40.7222,
    lng: -73.9882,
    cuisine: ["Deli", "Bagels"],
    activeSellers: 1,
    waitEstimate: "~15 min",
  },
];
