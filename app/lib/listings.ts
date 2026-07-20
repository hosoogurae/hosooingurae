import { complexes, type Complex } from "../data/complexes";
import { listings, type Listing } from "../data/listings";

export interface ListingWithComplex extends Listing {
  complex: Complex;
}

export function getComplexById(complexId: string): Complex | undefined {
  return complexes.find((complex) => complex.id === complexId);
}

function attachComplex(listing: Listing): ListingWithComplex | undefined {
  const complex = getComplexById(listing.complexId);
  return complex ? { ...listing, complex } : undefined;
}

export function getAllListings(): ListingWithComplex[] {
  return listings
    .map(attachComplex)
    .filter((listing): listing is ListingWithComplex => listing !== undefined);
}

export function getFeaturedListings(): ListingWithComplex[] {
  return getAllListings().filter((listing) => listing.isFeatured);
}

export function getListingById(id: string): ListingWithComplex | undefined {
  const listing = listings.find((item) => item.id === id);
  return listing ? attachComplex(listing) : undefined;
}

export function getListingsByComplexId(complexId: string): ListingWithComplex[] {
  return getAllListings().filter((listing) => listing.complexId === complexId);
}
