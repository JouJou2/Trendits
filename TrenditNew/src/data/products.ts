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
  
  images: string[];
  colors?: string[];
  sizes?: string[];
  description: string;
  specs: Record<string, string>;
  stock?: number;
  featured?: boolean;
  feePercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

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
  featured?: boolean;
}

export const vendors: Vendor[] = [
  {
    id: 'beirut-tech',
    name: 'Beirut Tech',
    category: 'Electronics & Gadget',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&q=80',
    description: 'Beirut Tech is your premier destination for the latest in electronics and gadgets in Lebanon. We pride ourselves on offering authentic products with official warranties.',
    location: 'Beirut, Lebanon',
    joinedDate: 'Jan 2022',
    totalProducts: 45
  },
  {
    id: 'cedar-style',
    name: 'Cedar Style',
    category: 'Fashion Boutique',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80',
    description: 'Modern fashion inspired by Lebanese heritage. Cedar Style brings you curated collections from local and international designers.',
    location: 'Jounieh, Lebanon',
    joinedDate: 'Mar 2022',
    totalProducts: 120
  },
  {
    id: 'fresh-market',
    name: 'Fresh Market',
    category: 'Organic Grocery',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1574321024216-652a3920976a?w=1200&q=80',
    description: 'Farm-to-table freshness delivered to your door. We partner with local Lebanese farmers to bring you the best organic produce available.',
    location: 'Mount Lebanon',
    joinedDate: 'June 2021',
    totalProducts: 85
  },
  {
    id: 'trendit-home',
    name: 'Trendit Home',
    category: 'Home & Living',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1581539250439-c96689b514dd?w=200&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80',
    description: 'Transform your space with Trendit Home. We offer a curated selection of modern furniture and decor for every room.',
    location: 'Tripoli, Lebanon',
    joinedDate: 'May 2022',
    totalProducts: 65
  },
  {
    id: 'glam-beauty',
    name: 'Glam Beauty',
    category: 'Cosmetics & Beauty',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1596462285805-9730d1ef3381?w=1200&q=80',
    description: 'Discover your inner glow with Glam Beauty. We bring you the finest international beauty brands and local skincare secrets.',
    location: 'Beirut, Lebanon',
    joinedDate: 'Feb 2022',
    totalProducts: 90
  }
];

export const allProducts: ProductType[] = [
  // Electronics
  { 
    id: 1, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Wireless Headphones', brand: 'Sony', price: 49.99, oldPrice: 69.99, rating: 4.5, reviews: 120, 
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', badgeLeft: '25%', badgeRight: 'New',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80'],
    colors: ['Black', 'Silver', 'Navy'],
    description: 'Immerse yourself in music with these high-fidelity wireless headphones featuring active noise cancellation and 30-hour battery life.',
    specs: { 'Form Factor': 'Over Ear', 'Connectivity': 'Bluetooth 5.2', 'Battery': '30 Hours', 'Weight': '250g' }
  },
  { 
    id: 2, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Samsung Galaxy S22', brand: 'Samsung', price: 799, oldPrice: null, rating: 4, reviews: 22, 
    image: 'https://images.unsplash.com/photo-1610945265064-3234dac5532d?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1610945265064-3234dac5532d?w=800&q=80', 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80'],
    colors: ['Phantom Black', 'White', 'Green'],
    description: 'Capture the night with cinematic 8K video and the most advanced pro-grade camera in a smartphone. Features a super-smooth 120Hz display.',
    specs: { 'Screen': '6.1" AMOLED', 'Storage': '128GB', 'RAM': '8GB', 'Processor': 'Snapdragon 8 Gen 1' }
  },
  { 
    id: 3, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Apple MacBook Air', brand: 'Apple', price: 999, oldPrice: null, rating: 5, reviews: 85, 
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80'],
    colors: ['Space Gray', 'Silver', 'Gold'],
    description: 'The thinnest, lightest notebook from Apple, completely transformed by the M1 chip. CPU speeds up to 3.5x faster.',
    specs: { 'Chip': 'Apple M1', 'RAM': '8GB Unified', 'Storage': '256GB SSD', 'Display': '13.3" Retina' }
  },
  { 
    id: 4, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Smartwatch Series 7', brand: 'Apple', price: 729, oldPrice: null, rating: 4.5, reviews: 45, 
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80', 'https://images.unsplash.com/photo-1434493789847-2f02b0c2628da?w=800&q=80'],
    colors: ['Midnight', 'Starlight', 'Green', 'Blue'],
    description: 'The largest, most advanced Always-On Retina display yet makes everything you do with your Apple Watch Series 7 bigger and better.',
    specs: { 'Case Size': '45mm', 'Connectivity': 'GPS + Cellular', 'Water Resistance': '50 meters' }
  },
  { 
    id: 5, categoryId: 'electronics', vendorId: 'beirut-tech', title: '4K Smart TV 55"', brand: 'LG', price: 799, oldPrice: 999, rating: 4, reviews: 310, 
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80', badgeLeft: '20%',
    images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80'],
    description: 'Enjoy intense color and fine detail with true 4K resolution on this stunning 55-inch smart display.',
    specs: { 'Size': '55 inches', 'Resolution': '4K UHD (3840 x 2160)', 'Refresh Rate': '120Hz', 'Smart OS': 'webOS' }
  },
  { 
    id: 6, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Sony Noise Cancelling', brand: 'Sony', price: 199, oldPrice: null, rating: 4.5, reviews: 89, 
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80'],
    colors: ['Black', 'Silver'],
    description: 'Leading noise cancellation performance so you can focus strictly on your high-res audio.',
    specs: { 'Type': 'Over Ear', 'Noise Cancelling': 'Active', 'Battery': '35 Hours' }
  },
  { 
    id: 7, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Portable Bluetooth Speaker', brand: 'JBL', price: 99, oldPrice: 149, rating: 4, reviews: 500, 
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80'],
    colors: ['Blue', 'Black', 'Red'],
    description: 'Rugged, waterproof, and powerful. Take your music anywhere with this compact massive-sound speaker.',
    specs: { 'Water Resistance': 'IPX7', 'Battery Playtime': '12 Hours', 'Output Power': '20W RMS' }
  },
  { 
    id: 8, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Wireless Earbuds', brand: 'SoundCore', price: 89, oldPrice: null, rating: 4.5, reviews: 236, 
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80'],
    colors: ['White', 'Black'],
    description: 'Crystal-clear calls and booming bass in a tiny, pocket-friendly package.',
    specs: { 'Fit': 'In-Ear', 'Battery': '8 Hours (32 with case)', 'Microphones': '4 Mics for calls' }
  },

  // Fashion
  { 
    id: 9, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Classic Denim Jacket', brand: 'Levi\'s', price: 59.99, oldPrice: null, rating: 4, reviews: 84, 
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80', badgeRight: 'Trending',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Blue Wash', 'Black', 'Light Blue'],
    description: 'The ultimate wardrobe essential. Our classic denim jacket is designed for comfort and rugged style.',
    specs: { 'Material': '100% Cotton Base', 'Care': 'Machine Wash Cold', 'Fit': 'Standard Fit' }
  },
  { 
    id: 10, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Casual White T-Shirt', brand: 'H&M', price: 19.99, oldPrice: 24.99, rating: 4.5, reviews: 200, 
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', badgeLeft: 'Sale',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['White', 'Black', 'Gray', 'Navy'],
    description: 'Premium organic cotton t-shirt with a perfectly tailored fit to serve as the foundation of any outfit.',
    specs: { 'Material': '100% Organic Cotton', 'Neckline': 'Crew Neck', 'Sleeve': 'Short Sleeve' }
  },
  { 
    id: 11, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Elegant High Heels', brand: 'Steve Madden', price: 89.00, oldPrice: null, rating: 5, reviews: 45, 
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80'],
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['Red', 'Black', 'Nude'],
    description: 'Command the room in these stunning stiletto heels, featuring a comfortable padded insole and genuine leather.',
    specs: { 'Material': 'Genuine Leather', 'Heel Height': '4.5 inches', 'Sole': 'Rubber' }
  },
  { 
    id: 12, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Vintage Sunglasses', brand: 'Ray-Ban', price: 34.00, oldPrice: null, rating: 4.5, reviews: 112, 
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80', badgeLeft: '15%',
    images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80'],
    colors: ['Gold/Green', 'Silver/Black'],
    description: 'Retro-inspired frames providing 100% UV protection and timeless effortless style.',
    specs: { 'Frame Material': 'Metal', 'Lens Technology': 'Polarized', 'UV Protection': '100% UVA/UVB' }
  },

  // Home & Living
  { 
    id: 13, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Modern Gray Sofa', brand: 'IKEA', price: 499, oldPrice: 599, rating: 4.5, reviews: 30, 
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80', badgeLeft: '10%',
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'],
    colors: ['Gray', 'Charcoal', 'Beige'],
    description: 'Transform your living room with this sleek mid-century modern sofa tailored in premium stain-resistant fabric.',
    specs: { 'Dimensions': '84"W x 35"D x 34"H', 'Material': 'Polyester Blend', 'Seating Capacity': '3' }
  },
  { 
    id: 14, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Minimalist Floor Lamp', brand: 'HomeGoods', price: 89, oldPrice: null, rating: 4, reviews: 15, 
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80'],
    colors: ['Black', 'Brass', 'White'],
    description: 'An elegant lighting solution that tucks perfectly behind a sofa or illuminates a dark reading corner.',
    specs: { 'Height': '64 inches', 'Bulb Type': 'LED included', 'Material': 'Steel' }
  },
  { 
    id: 15, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Ceramic Flower Vase', brand: 'West Elm', price: 29.99, oldPrice: null, rating: 5, reviews: 88, 
    image: 'https://images.unsplash.com/photo-1497752531616-c3afd9760a11?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1497752531616-c3afd9760a11?w=800&q=80'],
    description: 'Handcrafted ceramic vase with a minimal matte finish, perfect for dried pampas or fresh bouquets.',
    specs: { 'Material': '100% Stoneware', 'Dimensions': '10" Height, 4" Diameter', 'Care': 'Hand wash only' }
  },
  { 
    id: 16, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Geometric Throw Pillow', brand: 'Target', price: 19.50, oldPrice: 25.00, rating: 4, reviews: 120, 
    image: 'https://images.unsplash.com/photo-1583847268964-b28ce8f25f97?w=500&q=80', badgeRight: 'New',
    images: ['https://images.unsplash.com/photo-1583847268964-b28ce8f25f97?w=800&q=80'],
    colors: ['Yellow/White', 'Navy/White'],
    description: 'Add a pop of color to any space with this soft, plush geometric throw pillow. Insert included.',
    specs: { 'Dimensions': '18" x 18"', 'Cover Material': 'Cotton Canvas', 'Fill': '100% Polyester' }
  },

  // Groceries
  { 
    id: 17, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Fresh Organic Apples', brand: 'Local Farm', price: 4.99, oldPrice: null, rating: 4.5, reviews: 54, 
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&q=80'],
    description: 'Crisp, sweet, and locally sourced organic apples. Perfect for snacking, baking, or juicing.',
    specs: { 'Weight': '1 kg bag', 'Origin': 'Lebanon Farm', 'Type': 'Red Delicious/Gala Mix' }
  },
  { 
    id: 18, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Artisan Sourdough Bread', brand: 'The Bakery', price: 6.50, oldPrice: null, rating: 5, reviews: 29, 
    image: 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=500&q=80', badgeRight: 'Fresh',
    images: ['https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=800&q=80'],
    description: 'Baked fresh daily using a 100-year-old starter. Features a perfectly crispy crust and airy, chewy crumb.',
    specs: { 'Weight': '800g loaf', 'Allergens': 'Contains Wheat/Gluten', 'Dietary': 'Vegan' }
  },
  { 
    id: 19, categoryId: 'groceries', vendorId: 'fresh-market', title: '100% Orange Juice', brand: 'Tropicana', price: 5.00, oldPrice: null, rating: 4, reviews: 110, 
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80'],
    description: 'Never from concentrate. Enjoy the refreshing, rich taste of freshly squeezed Florida oranges packed with Vitamin C.',
    specs: { 'Volume': '1 Liter', 'Pulp': 'No Pulp', 'Added Sugar': 'None' }
  },
  { 
    id: 20, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Gourmet Spice Collection', brand: 'McCormick', price: 24.99, oldPrice: 29.99, rating: 4.5, reviews: 90, 
    image: 'https://images.unsplash.com/photo-1563281577-a7be47e20db9?w=500&q=80', badgeLeft: 'Sale',
    images: ['https://images.unsplash.com/photo-1563281577-a7be47e20db9?w=800&q=80'],
    description: 'A curated 6-piece spice set to elevate your home cooking, including Smoked Paprika, Cumin, and Himalayan Pink Salt.',
    specs: { 'Set Includes': '6 Glass Jars', 'Total Weight': '500g', 'Shelf Life': '2 Years' }
  },

  // Beauty
  { 
    id: 21, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Luxury Cosmetics Set', brand: 'Sephora', price: 110, oldPrice: 150, rating: 5, reviews: 200, 
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80', badgeLeft: '25%',
    images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'],
    description: 'The ultimate luxury makeup collection featuring an eyeshadow palette, premium mascara, and long-lasting setting spray.',
    specs: { 'Set Contains': 'Palette, Mascara, Spray', 'Skin Type': 'All Skin Types', 'Cruelty Free': 'Yes' }
  },
  { 
    id: 22, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Hydrating Face Serum', brand: 'The Ordinary', price: 45, oldPrice: null, rating: 4.5, reviews: 340, 
    image: 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=800&q=80'],
    description: 'Hyaluronic acid and B5 serum that penetrates deeply to intensely hydrate and plump the skin.',
    specs: { 'Volume': '30 ml', 'Active Ingredients': 'Hyaluronic Acid 2% + B5', 'Time of Use': 'AM and PM' }
  },
  { 
    id: 23, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Designer Perfume 50ml', brand: 'Chanel', price: 120, oldPrice: null, rating: 4, reviews: 85, 
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&q=80', badgeRight: 'Popular',
    images: ['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80'],
    description: 'A timeless, elegant floral fragrance blending notes of jasmine, rose, and distinct vanilla undertones.',
    specs: { 'Volume': '50 ml', 'Fragrance Family': 'Floral', 'Concentration': 'Eau de Parfum' }
  },
  { 
    id: 24, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Matte Liquid Lipstick', brand: 'MAC', price: 18, oldPrice: 22, rating: 4.5, reviews: 500, 
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80'],
    colors: ['Ruby Red', 'Nude Blush', 'Deep Berry'],
    description: 'Long-wearing, highly pigmented liquid lipstick that dries to a comfortable, completely matte finish.',
    specs: { 'Finish': 'Matte', 'Wear Time': 'Up to 12 Hours', 'Formulation': 'Liquid' }
  },
  // Electronics (continued)
  { 
    id: 25, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'Sony Alpha a7 IV', brand: 'Sony', price: 2499, oldPrice: null, rating: 5, reviews: 156, 
    image: 'https://images.unsplash.com/photo-1610419354010-090c0ef497c2?w=500&q=80', badgeRight: 'Pro',
    images: ['https://images.unsplash.com/photo-1610419354010-090c0ef497c2?w=800&q=80'],
    description: 'The ultimate hybrid camera. Stunning image quality with 33MP sensor and 4K 60p video capabilities.',
    specs: { 'Sensor': '33MP Full-Frame Exmor R CMOS', 'Video': '4K 60p 10-bit', 'AF': 'Real-time Eye AF' }
  },
  { 
    id: 26, categoryId: 'electronics', vendorId: 'beirut-tech', title: 'DJI Mini 3 Pro', brand: 'DJI', price: 759, oldPrice: 900, rating: 4.5, reviews: 92, 
    image: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=500&q=80', badgeLeft: '15%',
    images: ['https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800&q=80'],
    description: 'Fly mini, create big. At under 249g, it features 4K/60fps video and a 34-minute flight time.',
    specs: { 'Weight': '< 249g', 'Video': '4K/60fps HDR', 'Flight Time': '34 Minutes' }
  },

  // Fashion (continued)
  { 
    id: 27, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Slim Fit Chinos', brand: 'Uniqlo', price: 39.90, oldPrice: null, rating: 4.5, reviews: 540, 
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80'],
    sizes: ['28', '30', '32', '34', '36'],
    colors: ['Khaki', 'Navy', 'Olive', 'Black'],
    description: 'Perfectly balanced stretch fabric for maximum comfort and a clean, sharp look.',
    specs: { 'Material': '97% Cotton, 3% Spandex', 'Fit': 'Slim Fit', 'Style': 'Tapered' }
  },
  { 
    id: 28, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Cloud Runner Sneakers', brand: 'On', price: 139.99, oldPrice: null, rating: 5, reviews: 320, 
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', badgeRight: 'Best Seller',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: ['Orange/Black', 'White', 'Black'],
    description: 'Engineered for the ultimate running experience. Lightweight cushioning for every step.',
    specs: { 'Type': 'Running', 'Cushioning': 'CloudTec', 'Weight': '250g' }
  },
  { 
    id: 29, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Summer Linen Shirt', brand: 'J.Crew', price: 65, oldPrice: 85, rating: 4.5, reviews: 88, 
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80', badgeLeft: 'Sale',
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Sky Blue', 'Soft Pink'],
    description: 'Stay cool and stylish with our premium Irish linen shirt. Breathable and naturally elegant.',
    specs: { 'Material': '100% Linen', 'Fit': 'Regular Fit', 'Style': 'Button Down' }
  },
  { 
    id: 30, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Italian Leather Belt', brand: 'Gucci', price: 450, oldPrice: null, rating: 5, reviews: 1210, 
    image: 'https://images.unsplash.com/photo-1624222247344-550fbadfe94e?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1624222247344-550fbadfe94e?w=800&q=80'],
    sizes: ['85', '90', '95', '100'],
    description: 'Handcrafted in Italy with genuine calfskin leather and featuring the iconic double G buckle.',
    specs: { 'Material': 'Calfskin Leather', 'Origin': 'Italy', 'Width': '4cm' }
  },
  { 
    id: 31, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Wool Cashmere Overcoat', brand: 'Theory', price: 795, oldPrice: 995, rating: 4.5, reviews: 45, 
    image: 'https://images.unsplash.com/photo-1539533377285-b9dfb0ee4cbe?w=500&q=80', badgeLeft: '20%',
    images: ['https://images.unsplash.com/photo-1539533377285-b9dfb0ee4cbe?w=800&q=80'],
    sizes: ['S', 'M', 'L'],
    colors: ['Camel', 'Navy'],
    description: 'A luxurious blend of wool and cashmere. The essential outer layer for the modern professional.',
    specs: { 'Material': '90% Wool, 10% Cashmere', 'Lining': 'Cupro', 'Weight': 'Heavyweight' }
  },
  { 
    id: 32, categoryId: 'fashion', vendorId: 'cedar-style', title: 'Silk Floral Maxi Dress', brand: 'Reformation', price: 285, oldPrice: null, rating: 5, reviews: 112, 
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'],
    sizes: ['0', '2', '4', '6', '8'],
    colors: ['Ruby Red', 'Nude Blush', 'Deep Berry'],
    description: 'Effortlessly feminine. Our silk maxi dress features a high slit and delicate adjustable straps. Perfect for summer weddings or garden parties.',
    specs: { 'Material': '100% Silk', 'Care': 'Dry Clean Only', 'Length': 'Maxi' }
  },

  // Home & Living (continued)
  { 
    id: 33, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Walnut Coffee Table', brand: 'West Elm', price: 349, oldPrice: null, rating: 4.5, reviews: 24, 
    image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&q=80'],
    description: 'Mid-century modern inspiration. Crafted from solid kiln-dried walnut wood.',
    specs: { 'Material': 'Solid Walnut', 'Dimensions': '48"W x 24"D x 16"H', 'Assembly': 'Light Assembly Required' }
  },
  { 
    id: 34, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Essential Oil Diffuser', brand: 'Vitruvi', price: 120, oldPrice: null, rating: 5, reviews: 400, 
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&q=80', badgeRight: 'Design Award',
    images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80'],
    colors: ['Stone', 'Charcoal', 'Terracotta'],
    description: 'A beautiful stone diffuser that doubles as a sculpture. Fills up to 500 sq. ft. with fragrance.',
    specs: { 'Material': 'Ceramic', 'Run Time': '4 or 8 Hours', 'Capacity': '90ml' }
  },
  { 
    id: 35, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Professional Chef Knife', brand: 'Wüsthof', price: 170, oldPrice: 200, rating: 5, reviews: 856, 
    image: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=500&q=80', badgeLeft: '15%',
    images: ['https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80'],
    description: 'The workhorse of the kitchen. Forged from a single piece of high-carbon stainless steel.',
    specs: { 'Blade length': '8 inches', 'Material': 'Stainless Steel', 'Handle': 'Full Tang' }
  },
  { 
    id: 36, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Smart Air Purifier', brand: 'Dyson', price: 599, oldPrice: null, rating: 4.5, reviews: 230, 
    image: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1591825729269-caeb344f6df2?w=800&q=80'],
    description: 'Removes 99.97% of allergens and pollutants. Heats, cools, and purifies your air intelligently.',
    specs: { 'Filtration': 'HEPA H13', 'Connectivity': 'Wi-Fi / MyDyson App', 'Coverage': 'Large Room' }
  },
  { 
    id: 37, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Luxe Cotton Towel Set', brand: 'Brooklinen', price: 79, oldPrice: 99, rating: 4.5, reviews: 1560, 
    image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80'],
    colors: ['White', 'Graphite', 'Cream'],
    description: 'Unbelievably soft and absorbent. 100% Turkish cotton with a plush 820 GSM weight.',
    specs: { 'Set Includes': '2 Bath, 2 Hand, 2 Washcloths', 'Material': '100% Turkish Cotton', 'Weight': '820 GSM' }
  },
  { 
    id: 38, categoryId: 'home-living', vendorId: 'trendit-home', title: 'Memory Foam Pillow', brand: 'Tempur-Pedic', price: 109, oldPrice: null, rating: 4, reviews: 890, 
    image: 'https://images.unsplash.com/photo-1629949009765-40df3427be30?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1629949009765-40df3427be30?w=800&q=80'],
    description: 'The original ergonomic design developed by NASA to provide deep, pressure-relieving support.',
    specs: { 'Firmness': 'Medium-Firm', 'Cover': 'Washable Silk/Cotton', 'Warranty': '5 Years' }
  },

  // Groceries (continued)
  { 
    id: 39, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Extra Virgin Olive Oil', brand: 'Lebanese Harvest', price: 18.50, oldPrice: null, rating: 5, reviews: 340, 
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbadcbaf?w=500&q=80', badgeRight: 'Pure',
    images: ['https://images.unsplash.com/photo-1474979266404-7eaacbadcbaf?w=800&q=80'],
    description: 'First cold-pressed from premium Lebanese olives. Rich, peppery flavor profile.',
    specs: { 'Origin': 'South Lebanon', 'Volume': '500ml', 'Acidity': '< 0.3%' }
  },
  { 
    id: 40, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Organic Medjool Dates', brand: 'Desert Pearls', price: 12.99, oldPrice: null, rating: 5, reviews: 112, 
    image: 'https://images.unsplash.com/photo-1549441117-69b5963914a1?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1549441117-69b5963914a1?w=800&q=80'],
    description: 'Plump, caramel-like organic Medjool dates. Nature\'s most delicious treat.',
    specs: { 'Weight': '500g', 'Certification': 'Organic', 'Type': 'Medjool' }
  },
  { 
    id: 41, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Roasted Coffee Beans', brand: 'Beirut Roast', price: 15.00, oldPrice: null, rating: 4.5, reviews: 450, 
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&q=80', badgeRight: 'Aromatic',
    images: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80'],
    description: 'Small-batch roasted Arabica beans. Notes of chocolate and roasted hazelnut.',
    specs: { 'Roast': 'Medium-Dark', 'Region': 'Ethiopia/Brazil Blend', 'Weight': '250g' }
  },
  { 
    id: 42, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Wildflower Honey', brand: 'Honey Bee', price: 10.50, oldPrice: null, rating: 4.5, reviews: 89, 
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80'],
    description: 'Pure, raw wildflower honey from the cedar forests of Lebanon.',
    specs: { 'Type': 'Raw Unfiltered', 'Weight': '400g', 'Origin': 'Mount Lebanon' }
  },
  { 
    id: 43, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Sea Salt Chocolate', brand: 'Ghirardelli', price: 5.99, oldPrice: null, rating: 4.5, reviews: 2300, 
    image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&q=80'],
    description: 'Intense dark chocolate balanced with a touch of Mediterranean sea salt.',
    specs: { 'Cocoa': '72%', 'Weight': '100g', 'Dietary': 'Non-GMO' }
  },
  { 
    id: 44, categoryId: 'groceries', vendorId: 'fresh-market', title: 'Organic White Quinoa', brand: 'Ancient Grains', price: 8.50, oldPrice: 10.00, rating: 4, reviews: 67, 
    image: 'https://images.unsplash.com/photo-1583095117194-4d89a449748b?w=500&q=80', badgeLeft: 'Sale',
    images: ['https://images.unsplash.com/photo-1583095117194-4d89a449748b?w=800&q=80'],
    description: 'Pre-washed and ready to cook. The perfect gluten-free protein source.',
    specs: { 'Weight': '750g', 'Property': 'Gluten Free', 'Origin': 'Bolivia' }
  },

  // Beauty (continued)
  { 
    id: 45, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Silk Sleeping Mask', brand: 'Slip', price: 50, oldPrice: null, rating: 5, reviews: 2100, 
    image: 'https://images.unsplash.com/photo-1582234372722-50d7ccc3059d?w=500&q=80', badgeRight: 'Expert Pick',
    images: ['https://images.unsplash.com/photo-1582234372722-50d7ccc3059d?w=800&q=80'],
    description: 'Anti-aging, anti-sleep crease, anti-bed head. Made from 100% highest grade mulberry silk.',
    specs: { 'Material': '6A Grade Mulberry Silk', 'Thickness': '22 Momme', 'Care': 'Machine Washable' }
  },
  { 
    id: 46, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Retinol Night Cream', brand: 'Olay', price: 38, oldPrice: 45, rating: 4.5, reviews: 5600, 
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80', badgeLeft: 'Sale',
    images: ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80'],
    description: 'Fragrance-free night moisturizer with vitamin B3 and retinol complex for smoother, firmer skin.',
    specs: { 'Capacity': '50ml', 'Property': 'Dermatologist Tested', 'Cruelty-Free': 'No' }
  },
  { 
    id: 47, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Jade Roller Set', brand: 'Herbivore', price: 32, oldPrice: null, rating: 4, reviews: 290, 
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&q=80'],
    description: 'Promote lymphatic drainage and reduce puffiness with this authentic jade quartz facial set.',
    specs: { 'Includes': 'Jade Roller & Gua Sha', 'Material': '100% Natural Jade', 'Effect': 'Detoxifying' }
  },
  { 
    id: 48, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Bamboo Brush Set', brand: 'EcoTools', price: 24, oldPrice: null, rating: 4.5, reviews: 4500, 
    image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&q=80'],
    description: 'Eco-friendly makeup brushes with soft, dense synthetic bristles and recycled bamboo handles.',
    specs: { 'Brushes': 'Set of 5', 'Material': 'Bamboo, Recycled Mesh', 'Vegan': 'Yes' }
  },
  { 
    id: 49, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Mineral Sunscreen SPF 50', brand: 'La Roche-Posay', price: 30, oldPrice: null, rating: 5, reviews: 8900, 
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=500&q=80', badgeRight: 'Essential',
    images: ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80'],
    description: 'Broad spectrum UVA/UVB protection. Water resistant for 40 minutes, perfect for sensitive skin.',
    specs: { 'SPF': '50+', 'Type': 'Mineral', 'Volume': '50ml' }
  },
  { 
    id: 50, categoryId: 'beauty', vendorId: 'glam-beauty', title: 'Rose Water Mist', brand: 'Mario Badescu', price: 12, oldPrice: null, rating: 4.5, reviews: 15600, 
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80',
    images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80'],
    description: 'A cult-favorite face mist with rose and aloe vera to refresh and hydrate the skin anytime.',
    specs: { 'Volume': '118ml', 'Ingredients': 'Rose, Aloe, Gardenia', 'Skin Type': 'All' }
  },
];
