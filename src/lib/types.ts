export interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisine: string[];
  activeSellers: number;
  waitEstimate: string;
}
