import { 
  Smartphone, 
  Watch, 
  Shirt, 
  Sparkles, 
  Zap, 
  Home, 
  Utensils, 
  ShoppingCart, 
  Gamepad2, 
  Car, 
  Dog, 
  Briefcase, 
  Dribbble,
  Monitor,
  Heart
} from 'lucide-react';

export interface CategoryType {
  id: string;
  name: string;
  icon: React.ElementType;
  count: number;
  image: string;
}

export const categories: CategoryType[] = [
  { id: 'electronics', name: 'Electronics', icon: Monitor, count: 1250, image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&fit=crop' },
  { id: 'phones-tablets', name: 'Phones & Tablets', icon: Smartphone, count: 840, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&fit=crop' },
  { id: 'phone-accessories', name: 'Phone Accessories', icon: Zap, count: 2100, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&fit=crop' },
  { id: 'fashion', name: 'Fashion', icon: Shirt, count: 3200, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&fit=crop' },
  { id: 'beauty-cosmetics', name: 'Beauty & Cosmetics', icon: Sparkles, count: 1800, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&fit=crop' },
  { id: 'perfumes', name: 'Perfumes', icon: Heart, count: 450, image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&fit=crop' },
  { id: 'home-kitchen', name: 'Home & Kitchen', icon: Utensils, count: 950, image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&fit=crop' },
  { id: 'furniture', name: 'Furniture', icon: Home, count: 280, image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&fit=crop' },
  { id: 'groceries', name: 'Groceries', icon: ShoppingCart, count: 5400, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&fit=crop' },
  { id: 'toys', name: 'Toys', icon: Dribbble, count: 720, image: 'https://images.unsplash.com/photo-1532330393533-443990a51d10?w=600&fit=crop' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, count: 340, image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&fit=crop' },
  { id: 'watches-jewelry', name: 'Watches & Jewelry', icon: Watch, count: 1100, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&fit=crop' },
  { id: 'automotive', name: 'Automotive Accessories', icon: Car, count: 890, image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&fit=crop' },
  { id: 'pet-products', name: 'Pet Products', icon: Dog, count: 650, image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&fit=crop' },
  { id: 'office-supplies', name: 'Office Supplies', icon: Briefcase, count: 420, image: 'https://images.unsplash.com/photo-1534533983688-c7b841fd4492?w=600&fit=crop' },
];
