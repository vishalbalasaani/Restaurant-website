'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import ProductCard from './product-card';
import { useKitchenStatus } from '@/lib/hooks/use-kitchen-status';
import { formatTime } from '@/lib/utils';
import type { Product, Category } from '@/lib/types';

// Fallback data for when Supabase is not configured
const FALLBACK_CATEGORIES: Category[] = [
  { id: '1', name: 'Starters', slug: 'starters', sort_order: 1, created_at: '' },
  { id: '2', name: 'Biryani', slug: 'biryani', sort_order: 2, created_at: '' },
  { id: '3', name: 'Curries', slug: 'curries', sort_order: 3, created_at: '' },
  { id: '4', name: 'Drinks', slug: 'drinks', sort_order: 4, created_at: '' },
  { id: '5', name: 'Desserts', slug: 'desserts', sort_order: 5, created_at: '' },
];

const FALLBACK_PRODUCTS: Product[] = [
  { id: 'p1', category_id: '1', name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled to perfection with mint chutney', price: 249, image_url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'p2', category_id: '1', name: 'Chicken 65', description: 'Spicy deep-fried chicken with curry leaves and green chillies', price: 299, image_url: 'https://images.unsplash.com/photo-1610057099443-fde6c99db9e1?w=400&h=300&fit=crop', is_veg: false, is_available: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'p3', category_id: '1', name: 'Veg Spring Rolls', description: 'Crispy rolls stuffed with fresh vegetables and sweet chili sauce', price: 199, image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 3, created_at: '', updated_at: '' },
  { id: 'p4', category_id: '1', name: 'Mutton Seekh Kebab', description: 'Minced mutton skewers with aromatic spices, grilled on charcoal', price: 349, image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop', is_veg: false, is_available: true, sort_order: 4, created_at: '', updated_at: '' },
  { id: 'p5', category_id: '2', name: 'Hyderabadi Chicken Biryani', description: 'Fragrant basmati rice layered with tender chicken and aromatic spices', price: 349, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop', is_veg: false, is_available: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'p6', category_id: '2', name: 'Veg Dum Biryani', description: 'Slow-cooked basmati rice with seasonal vegetables and whole spices', price: 279, image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'p7', category_id: '2', name: 'Mutton Biryani', description: 'Traditional Hyderabadi mutton biryani slow-cooked in sealed pot', price: 449, image_url: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400&h=300&fit=crop', is_veg: false, is_available: true, sort_order: 3, created_at: '', updated_at: '' },
  { id: 'p8', category_id: '3', name: 'Butter Chicken', description: 'Tender chicken in rich, creamy tomato-based sauce with butter and cream', price: 329, image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop', is_veg: false, is_available: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'p9', category_id: '3', name: 'Dal Makhani', description: 'Creamy black lentils slow-cooked overnight with butter and spices', price: 229, image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'p10', category_id: '3', name: 'Palak Paneer', description: 'Cottage cheese cubes in smooth, spiced spinach gravy', price: 259, image_url: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 3, created_at: '', updated_at: '' },
  { id: 'p11', category_id: '4', name: 'Mango Lassi', description: 'Chilled yogurt drink blended with fresh Alphonso mango pulp', price: 149, image_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'p12', category_id: '4', name: 'Masala Chai', description: 'Traditional Indian tea brewed with cardamom, ginger, and cinnamon', price: 79, image_url: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'p13', category_id: '5', name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in fragrant rose-cardamom syrup', price: 149, image_url: 'https://images.unsplash.com/photo-1666190060504-40bbe801e1b0?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'p14', category_id: '5', name: 'Chocolate Brownie', description: 'Warm, fudgy chocolate brownie with vanilla ice cream', price: 199, image_url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=300&fit=crop', is_veg: true, is_available: true, sort_order: 2, created_at: '', updated_at: '' },
];

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeVegFilter, setActiveVegFilter] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { kitchenOpen, openingTime } = useKitchenStatus();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        const [catResult, prodResult] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('products').select('*').eq('is_available', true).order('sort_order'),
        ]);

        if (catResult.data) setCategories(catResult.data);
        if (prodResult.data) setProducts(prodResult.data);
      } catch {
        // Use fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Fallback polling every 3 seconds to guarantee live updates without requiring manual SQL setup
    const interval = setInterval(fetchData, 3000);

    const supabase = createClient();
    const channel = supabase.channel('menu_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = products.filter((p) => {
    const categoryMatch = activeCategory === 'all' || p.category_id === activeCategory;
    const vegMatch =
      activeVegFilter === 'all' ||
      (activeVegFilter === 'veg' && p.is_veg) ||
      (activeVegFilter === 'non-veg' && !p.is_veg);
    const searchMatch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    return categoryMatch && vegMatch && searchMatch;
  });

  return (
    <>
      {!kitchenOpen && (
        <div className="bg-red-50 py-3 text-center border-b border-red-100">
          <p className="text-red-600 font-medium text-sm">
            The kitchen is currently closed. We are not accepting orders right now.
          </p>
        </div>
      )}
      <section id="menu" className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block font-body text-sm font-semibold uppercase tracking-wider text-accent">
            Our Menu
          </span>
          <h2 className="mb-4 font-heading text-4xl font-bold text-primary md:text-5xl">
            Explore Our Dishes
          </h2>
          <p className="mx-auto max-w-md font-body text-text-light">
            Handcrafted recipes using the finest ingredients,
            prepared fresh for every order.
          </p>
        </motion.div>

        {/* Search Bar */}
        <div className="mx-auto max-w-md mb-8">
          <input
            type="text"
            placeholder="Search for a dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-border bg-white px-6 py-3.5 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Veg / Non-Veg Filter */}
        <div className="mb-6 flex justify-center gap-3">
          {[
            { label: 'All', value: 'all' },
            { label: 'Veg', value: 'veg' },
            { label: 'Non-Veg', value: 'non-veg' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveVegFilter(filter.value)}
              className={`rounded-full px-5 py-2 font-button text-sm font-medium transition-all duration-300 ${
                activeVegFilter === filter.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-light border border-border hover:border-accent hover:text-accent'
              }`}
            >
              {filter.value === 'veg' && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-600" />}
              {filter.value === 'non-veg' && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-600" />}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="mb-10 flex justify-center">
          <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={`whitespace-nowrap rounded-xl px-5 py-2.5 font-button text-sm font-medium transition-all duration-300 ${
                activeCategory === 'all'
                  ? 'bg-accent text-primary shadow-sm'
                  : 'text-text-light hover:text-primary'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap rounded-xl px-5 py-2.5 font-button text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'bg-accent text-primary shadow-sm'
                    : 'text-text-light hover:text-primary'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-0">
                <div className="aspect-[4/3] rounded-t-2xl bg-border-light" />
                <div className="p-4">
                  <div className="mb-2 h-5 w-3/4 rounded bg-border-light" />
                  <div className="mb-4 h-4 w-full rounded bg-border-light" />
                  <div className="h-11 rounded-xl bg-border-light" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} kitchenOpen={kitchenOpen} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="font-body text-lg text-text-light">
              No items found in this category.
            </p>
          </div>
        )}
      </div>
    </section>
    </>
  );
}
