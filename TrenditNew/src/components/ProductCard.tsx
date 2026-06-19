import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Truck, ShieldCheck } from 'lucide-react';
import { ProductType, getDisplayPrice } from '../data/products';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: ProductType;
  isCompact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, isCompact = false }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isWishlisted = isInWishlist(product.id);

  const discount = product.oldPrice 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
    : null;

  if (isCompact) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group bg-white rounded-xl border border-slate-100 flex flex-col hover:shadow-md hover:shadow-blue-900/5 transition-all duration-300 relative h-full text-left p-1"
      >
        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-0.5">
          {discount && (
            <div className="px-1 py-0.25 bg-red-500 text-white text-[6px] font-black uppercase tracking-wider rounded shadow-sm leading-none">
              -{discount}%
            </div>
          )}
          {product.badgeLeft && (
            <div className="px-1 py-0.25 bg-slate-900 text-white text-[6px] font-black uppercase tracking-wider rounded shadow-sm leading-none">
              {product.badgeLeft}
            </div>
          )}
        </div>

        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-1.5 right-1.5 z-10 w-5 h-5 bg-white/80 backdrop-blur-md rounded-md flex items-center justify-center transition-all shadow-sm ${
            isWishlisted ? 'text-red-500 bg-white' : 'text-slate-400 hover:text-red-500 hover:bg-white'
          }`}
          title={isWishlisted ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Image Section */}
        <Link 
          to={`/product/${product.id}`} 
          className="aspect-[1.35/1] bg-slate-50/50 relative overflow-hidden block rounded-lg group-hover:bg-white transition-colors duration-500 w-full"
        >
          <img 
            src={product.image || 'https://placehold.co/600x600?text=No+Image'} 
            alt={product.title} 
            className="w-full h-full object-contain p-1.5 mix-blend-multiply group-hover:scale-110 transition-transform duration-700" 
          />
        </Link>

        {/* Content Section */}
        <div className="p-1 px-1.5 flex flex-col flex-1">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[50px]">
              {product.brand}
            </span>
            <div className="flex items-center gap-0.5 bg-slate-50 px-1 py-0.25 rounded-full">
              <Star className="w-1.5 h-1.5 text-yellow-400 fill-current" />
              <span className="text-[7px] font-bold text-slate-600">{product.rating}</span>
            </div>
          </div>

          <Link to={`/product/${product.id}`} className="font-extrabold text-slate-900 text-[10px] mb-1 line-clamp-1 hover:text-blue-600 transition-colors leading-tight truncate block">
            {product.title}
          </Link>
          
          {/* Bottom Row - Pricing, Free Delivery & Add Button side-by-side */}
          <div className="mt-auto pt-1 border-t border-slate-50/60 flex items-center justify-between gap-1">
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-0.5 flex-wrap">
                <span className="font-black text-[11px] text-slate-900 tracking-tight leading-none">
                  ${getDisplayPrice(product.price, product.feePercentage).toFixed(2)}
                </span>
                {product.oldPrice && (
                  <span className="text-[7px] text-slate-400 line-through font-bold leading-none">
                    ${getDisplayPrice(product.oldPrice, product.feePercentage).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 text-[6px] font-black text-emerald-600 uppercase tracking-wider mt-0.5 leading-none">
                <Truck className="w-2 h-2 shrink-0" />
                <span>Free 24h</span>
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.preventDefault();
                addToCart({
                  productId: product.id,
                  title: product.title,
                  price: getDisplayPrice(product.price, product.feePercentage),
                  image: product.image || 'https://placehold.co/600x600?text=No+Image',
                  quantity: 1
                });
              }}
              className="w-5.5 h-5.5 bg-slate-900 hover:bg-[#2563EB] text-white rounded-md flex items-center justify-center transition-all active:scale-95 shrink-0"
              title="Add to cart"
            >
              <ShoppingCart className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-3xl border border-slate-100 flex flex-col hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 relative h-full"
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {discount && (
          <div className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">
            -{discount}%
          </div>
        )}
        {product.badgeLeft && (
          <div className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">
            {product.badgeLeft}
          </div>
        )}
      </div>

      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product.id);
        }}
        className={`absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-md rounded-xl flex items-center justify-center transition-all shadow-sm ${
          isWishlisted ? 'text-red-500 bg-white' : 'text-slate-400 hover:text-red-500 hover:bg-white'
        }`}
        title={isWishlisted ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
      </button>

      {/* Image Section */}
      <Link 
        to={`/product/${product.id}`} 
        className="aspect-square bg-slate-50/50 relative overflow-hidden block rounded-t-[1.4rem] group-hover:bg-white transition-colors duration-500"
      >
        <img 
          src={product.image || 'https://placehold.co/600x600?text=No+Image'} 
          alt={product.title} 
          className="w-full h-full object-contain p-6 mix-blend-multiply group-hover:scale-110 transition-transform duration-700" 
        />
      </Link>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
              {product.brand}
            </span>
            <div className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
              <span className="text-[9px] font-bold text-slate-600">{product.rating}</span>
              <span className="text-[9px] text-slate-400">({product.reviews})</span>
            </div>
          </div>
        </div>

        <Link to={`/product/${product.id}`} className="font-extrabold text-slate-900 text-sm mb-2 line-clamp-2 hover:text-blue-600 transition-colors leading-tight min-h-[2.5rem]">
          {product.title}
        </Link>
        
        {/* Vendor Info */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-4 h-4 bg-blue-50 rounded flex items-center justify-center">
             <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
          </div>
          <span className="text-[10px] font-bold text-slate-500">Cedar Style</span>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-black text-xl text-slate-900 tracking-tighter">
            ${getDisplayPrice(product.price, product.feePercentage).toFixed(2)}
          </span>
          {product.oldPrice && (
            <span className="text-xs text-slate-400 line-through font-bold">
              ${getDisplayPrice(product.oldPrice, product.feePercentage).toFixed(2)}
            </span>
          )}
        </div>

        {/* Delivery Info */}
        <div className="mt-auto pt-3 border-t border-slate-50 flex flex-col gap-2">
           <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
              <Truck className="w-3 h-3" />
              <span>Free Delivery in 24h</span>
           </div>
           
           <div className="flex items-center gap-2">
             <button 
                onClick={(e) => {
                  e.preventDefault();
                  addToCart({
                    productId: product.id,
                    title: product.title,
                    price: getDisplayPrice(product.price, product.feePercentage),
                    image: product.image || 'https://placehold.co/600x600?text=No+Image',
                    quantity: 1
                  });
                }}
                className="flex-1 h-10 bg-slate-900 hover:bg-black text-white rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Add to Cart
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
