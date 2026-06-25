'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Upload, UtensilsCrossed } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import type { Product, Category, ProductFormData } from '@/lib/types';

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  category_id: '',
  is_veg: true,
  is_available: true,
  image_url: '',
};

export default function MenuManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*').order('sort_order'),
        supabase.from('categories').select('*').order('sort_order'),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     
    fetchData(); 
  }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.category_id,
      is_veg: product.is_veg,
      is_available: product.is_available,
      image_url: product.image_url,
    });
    setImagePreview(product.image_url);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setImagePreview('');
    setImageFile(null);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      let imageUrl = formData.image_url;

      // Upload image if new file selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
        }
      }

      const productData = {
        ...formData,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        await supabase.from('products').update(productData).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert(productData);
      }

      setShowForm(false);
      setEditingProduct(null);
      setImageFile(null);
      fetchData();
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const supabase = createClient();
      await supabase.from('products').delete().eq('id', id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Handle error
    }
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_available: !current } : p))
    );
    try {
      const supabase = createClient();
      await supabase.from('products').update({ is_available: !current }).eq('id', id);
      fetchData(); // Force a fresh sync with database
    } catch {
      // Revert if error
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_available: current } : p))
      );
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-2xl font-bold text-primary">Menu Management</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={handleNew}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-3 font-button text-sm font-semibold text-primary transition-colors hover:bg-accent-light"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 aspect-[4/3] rounded-xl bg-border-light" />
              <div className="mb-2 h-5 w-3/4 rounded bg-border-light" />
              <div className="h-4 w-1/2 rounded bg-border-light" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center card-shadow">
          <UtensilsCrossed className="mx-auto mb-4 h-16 w-16 text-border" />
          <h3 className="mb-2 font-heading text-lg font-semibold text-text">No products found</h3>
          <p className="mb-6 text-sm text-text-light">Try adjusting your search or add a new product.</p>
          <button onClick={handleNew} className="rounded-xl bg-primary px-6 py-3 font-button text-sm font-semibold text-white hover:bg-primary-light">
            <Plus className="mr-2 inline h-4 w-4" />Add Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              className={`rounded-2xl border bg-card overflow-hidden card-shadow ${!product.is_available ? 'opacity-60 border-border' : 'border-border'}`}
            >
              <div className="relative aspect-[4/3]">
                <Image src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                <div className="absolute left-2 top-2"><div className={product.is_veg ? 'veg-indicator' : 'nonveg-indicator'} /></div>
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h4 className="font-heading text-base font-semibold text-text">{product.name}</h4>
                    <p className="text-sm text-text-light line-clamp-1">{product.description}</p>
                  </div>
                  <span className="font-heading text-sm font-bold text-accent">{formatPrice(product.price)}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border-light">
                  <button onClick={() => handleEdit(product)} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-text-light hover:bg-background hover:text-primary">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.is_available)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${product.is_available ? 'bg-green-500' : 'bg-red-400'}`}
                      title={product.is_available ? "Available" : "Hidden"}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${product.is_available ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <button onClick={() => handleDelete(product.id)} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-text-light hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-xl font-bold text-primary">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h3>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-text-muted hover:bg-background"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">Product Image</label>
                  <div className="relative aspect-video rounded-xl border-2 border-dashed border-border bg-background overflow-hidden">
                    {imagePreview ? (
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="100vw" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center">
                        <Upload className="mb-2 h-8 w-8 text-text-muted" />
                        <p className="text-sm text-text-muted">Click to upload</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 cursor-pointer opacity-0" />
                  </div>
                </div>

                <div>
                  <label htmlFor="productName" className="mb-1.5 block text-sm font-medium text-text">Name *</label>
                  <input id="productName" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>

                <div>
                  <label htmlFor="productDescription" className="mb-1.5 block text-sm font-medium text-text">Description</label>
                  <textarea id="productDescription" rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="productPrice" className="mb-1.5 block text-sm font-medium text-text">Price (₹) *</label>
                    <input id="productPrice" type="number" required min={0} value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <div>
                    <label htmlFor="productCategory" className="mb-1.5 block text-sm font-medium text-text">Category</label>
                    <select id="productCategory" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent">
                      <option value="">Select</option>
                      {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Dietary Preference Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                    <div>
                      <label className="font-medium text-text">Vegetarian</label>
                      <p className="text-xs text-text-light">{formData.is_veg ? 'Item is strictly vegetarian' : 'Item contains meat or egg'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_veg: !formData.is_veg })}
                      className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors ${formData.is_veg ? 'bg-green-500' : 'bg-red-400'}`}
                    >
                      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${formData.is_veg ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                    <div>
                      <label className="font-medium text-text">Status</label>
                      <p className="text-xs text-text-light">{formData.is_available ? 'Available for ordering' : 'Hidden from customers'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
                      className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors ${formData.is_available ? 'bg-green-500' : 'bg-red-400'}`}
                    >
                      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${formData.is_available ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-button text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-50">
                  {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
