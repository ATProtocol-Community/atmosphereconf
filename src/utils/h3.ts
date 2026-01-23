import { latLngToCell } from "h3-js";

export function latLonToH3(lat: number, lon: number, resolution: number = 5): string {
  return latLngToCell(lat, lon, resolution);
}
