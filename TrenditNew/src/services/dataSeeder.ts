import { collection, doc, writeBatch, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { allProducts, vendors } from '../data/products';

export const seedOrders = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const snap = await getDocs(query(ordersRef, limit(1)));
    
    if (!snap.empty) {
      return { success: true, message: 'Orders already exist.' };
    }

    const batch = writeBatch(db);
    const mockOrders = [
      {
        orderNumber: 'TRD-102948',
        status: 'new',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        timestamp: serverTimestamp(),
        customerName: 'Ahmad Slim',
        customerPhone: '+961 70 123 456',
        customerEmail: 'ahmad.slim@example.com',
        deliveryAddress: 'Hamra Main St, Palace Building, 4th Floor',
        deliveryZone: 'Beirut',
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'unpaid',
        orderTotal: 125.00,
        deliveryFee: 3.00,
        finalTotal: 128.00,
        customerNote: 'Please call before arrival.',
        userId: 'mock-user-1',
        items: [
          {
            productName: 'Premium Leather Jacket',
            productId: '101',
            productImage: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=400',
            sku: 'PRD-101',
            vendor: 'Urban Wear',
            quantity: 1,
            unitPrice: 125.00,
            subtotal: 125.00,
            variant: 'Black / Large'
          }
        ]
      },
      {
        orderNumber: 'TRD-847291',
        status: 'confirmed',
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        timestamp: serverTimestamp(),
        customerName: 'Lina Karam',
        customerPhone: '+961 03 987 654',
        customerEmail: 'lina.k@example.com',
        deliveryAddress: 'Jounieh Highway, Marina Terrace, Block B, 2nd Floor',
        deliveryZone: 'North',
        paymentMethod: 'Card',
        paymentStatus: 'paid',
        orderTotal: 45.50,
        deliveryFee: 3.00,
        finalTotal: 48.50,
        customerNote: 'Leave at front door.',
        userId: 'mock-user-2',
        items: [
          {
            productName: 'Wireless Noise Canceling Buds',
            productId: '202',
            productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400',
            sku: 'PRD-202',
            vendor: 'Tech Store Lebanon',
            quantity: 1,
            unitPrice: 45.50,
            subtotal: 45.50,
            variant: 'White / Standard'
          }
        ]
      },
      {
        orderNumber: 'TRD-321098',
        status: 'new',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
        timestamp: serverTimestamp(),
        customerName: 'Marc Haddad',
        customerPhone: '+961 76 555 444',
        customerEmail: 'm.haddad@hotmail.com',
        deliveryAddress: 'Saida Sea Road, Blue Horizon, 1st Floor',
        deliveryZone: 'South',
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'unpaid',
        orderTotal: 210.00,
        deliveryFee: 3.00,
        finalTotal: 213.00,
        customerNote: '',
        userId: 'mock-user-3',
        items: [
          {
            productName: 'Organic Cotton Tee',
            productId: '303',
            productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400',
            sku: 'PRD-303',
            vendor: 'Eco Styles',
            quantity: 2,
            unitPrice: 55.00,
            subtotal: 110.00,
            variant: 'Navy / Medium'
          },
          {
            productName: 'Slim Fit Denim',
            productId: '404',
            productImage: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=400',
            sku: 'PRD-404',
            vendor: 'Urban Wear',
            quantity: 1,
            unitPrice: 100.00,
            subtotal: 100.00,
            variant: 'Blue / 32'
          }
        ]
      }
    ];

    mockOrders.forEach(order => {
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, order);
    });

    await batch.commit();
    return { success: true, message: 'Mock orders seeded.' };
  } catch (error) {
    console.error('Seeding orders error:', error);
    return { success: false, message: 'Failed to seed orders.' };
  }
};

export const seedDatabase = async () => {
  try {
    // 0. Ensure user is authenticated
    if (!auth.currentUser) {
      return { success: false, message: 'You must be signed in to seed the database.' };
    }

    // 1. Check existing counts
    const productsRef = collection(db, 'products');
    const vendorsRef = collection(db, 'vendors');
    
    const [prodSnap, vendorSnap] = await Promise.all([
      getDocs(query(productsRef, limit(1))),
      getDocs(query(vendorsRef, limit(1)))
    ]);

    if (!prodSnap.empty && !vendorSnap.empty) {
      console.log('Database already has products and vendors. Skipping seeder.');
      return { success: true, message: 'Database already contains data.' };
    }

    console.log('Starting partial or full database seeding...');
    const batch = writeBatch(db);

    // 2. Seed Vendors if empty
    if (vendorSnap.empty) {
      vendors.forEach((vendor) => {
        const vendorRef = doc(db, 'vendors', vendor.id);
        batch.set(vendorRef, {
          ...vendor,
          email: `${vendor.id}@example.com`,
          status: 'active',
          ownerName: vendor.ownerName || 'Store Manager',
          commissionRate: vendor.commissionRate || 8,
          totalSales: vendor.totalSales || Math.floor(Math.random() * 50000) + 5000,
          productCount: vendor.productCount || vendor.totalProducts || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    }

    // 3. Seed Products if empty
    if (prodSnap.empty) {
      allProducts.forEach((product) => {
        const productRef = doc(db, 'products', product.id.toString());
        batch.set(productRef, {
          ...product,
          id: product.id.toString(),
          feePercentage: 0, // Initial seed products have 0 fees
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stock: product.stock || Math.floor(Math.random() * 50) + 5
        });
      });
    }

    await batch.commit();
    
    // Also seed orders if collection is empty
    await seedOrders();

    console.log('Seeding complete!');
    return { success: true, message: 'Database and mock orders seeded successfully.' };
  } catch (error) {
    console.error('Seeding error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};
