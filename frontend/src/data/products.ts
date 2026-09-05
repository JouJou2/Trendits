  export const LEBANON_ZONES = [
    'Beirut',
    'Mount Lebanon',
    'North Lebanon',
    'Akkar',
    'Beqaa',
    'Baalbek-Hermel',
    'South Lebanon',
    'Nabatieh',
  ];

  // One row of the size matrix — a product can have several sizes, each with
  // its own stock and an optional price override.
  export interface ProductVariant {
    id: string;
    size?: string;
    price?: number | null; // overrides the base product price when set
    stock: number;
    sku?: string;
  }

  export interface ProductType {
    id: string | number;
    categoryId: string;
    vendorId?: string;
    title: string;
    brand: string;
    price: number;
    oldPrice: number | null;
    rating: number;
    reviews: number;
    image: string;
    badgeLeft?: string;
    badgeRight?: string;
    name?: string;              // ← add
  sku?: string;               // ← add
  tags?: string[];
    images: string[];
    colors?: string[];
    sizes?: string[];
    sizeOptions?: string[];
    variants?: ProductVariant[];
    // Colors are handled as separate, linked products rather than an in-product
    // axis — each color gets its own price/stock/photos and shows up in grids
    // on its own. These two fields tie a family of color products together.
    variantGroupId?: string;
    variantColor?: string;
    description: string;
    specs: Record<string, string>;
    stock?: number;
    featured?: boolean;
    feePercentage?: number;
    createdAt?: string;
    updatedAt?: string;
  }

  export const variantId = (size?: string) => size || '_';

export const getDisplayPrice = (price: number, feePercentage?: number) => {
  if (!feePercentage || feePercentage <= 0) return price;
  return price * (1 + feePercentage / 100);
};

export interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  image: string;
  bannerImage: string;
  description: string;
  location: string;
  joinedDate: string;
  totalProducts: number;
  ownerName?: string;
  status?: 'active' | 'pending' | 'suspended';
  commissionRate?: number;
  productCount?: number;
  totalSales?: number;
  orderCount?: number;
  verified?: boolean;
  featured?: boolean;
  deliveryDays?: number;
}

// Demo/mock catalog data was removed — the storefront now reads exclusively
// from Firestore. These empty arrays remain only so any lingering import
// resolves; nothing should depend on them.
export const vendors: Vendor[] = [];

export const allProducts: ProductType[] = [];
