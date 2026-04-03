/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Download, 
  Instagram, 
  Facebook, 
  Settings, 
  X, 
  Plus, 
  Trash2, 
  Save,
  ChevronRight,
  Play,
  CheckCircle2,
  LogOut,
  LogIn,
  Upload,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Menu,
  RefreshCw,
  User,
  CreditCard,
  Phone,
  MapPin,
  Globe,
  Camera,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';

// --- Types ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  prices?: Record<string, number>;
  image_url: string;
  sales_url: string;
  sales_urls?: Record<string, string>;
  visible_countries?: string[];
  order_index: number;
}

interface AppConfig {
  id: string;
  logo_url: string;
  hero_bg_url?: string;
  hero_title: string;
  info_title: string;
  info_text: string;
  video_url: string;
  benefits: string[];
  protocol_pdf_url: string;
  protocol_image_url?: string;
  technical_sheet_pdf_url: string;
  technical_sheet_image_url?: string;
  instagram_url: string;
  facebook_url: string;
}

interface CartItem extends Product {
  quantity: number;
}

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleSupabaseError(error: any, operation: string) {
  console.error(`Supabase Error (${operation}):`, error);
  alert(`Error: ${error.message || 'Algo salió mal'}`);
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<any, any> {
  public state = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-rubik text-red-600 mb-4">¡Ups! Algo salió mal</h2>
            <p className="text-brand-dark/60 mb-6">Ha ocurrido un error inesperado. Por favor, intenta recargar la página.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold"
            >
              Recargar App
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Main App Component ---
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [detectedCountry, setDetectedCountry] = useState<string>('US');
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'product' | 'protocol' | 'technical' | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    fullName: '',
    idNumber: '',
    phone: '',
    address: '',
    country: 'USA',
    city: '',
    district: '',
    notes: ''
  });

  const countryNames: Record<string, string> = {
    'CR': 'Costa Rica',
    'MX': 'México',
    'GT': 'Guatemala',
    'US': 'USA',
    'CO': 'Colombia'
  };

  const currencySymbols: Record<string, string> = {
    'CR': '$',
    'MX': '$',
    'GT': '$',
    'US': '$',
    'CO': '$'
  };

  const formatPrice = (product: Product) => {
    const amount = product.prices?.[detectedCountry] ?? product.price;
    return `$${amount.toFixed(2)} USD`;
  };

  const getSalesUrl = (product: Product) => {
    return product.sales_urls?.[detectedCountry] ?? product.sales_url;
  };

  const handleWhatsAppOrder = async () => {
    if (!checkoutProduct) return;
    
    setIsSubmittingOrder(true);
    try {
      const priceStr = formatPrice(checkoutProduct);
      const message = `*NUEVO PEDIDO - KEZANIX*%0A%0A` +
        `*Producto:* ${checkoutProduct.name}%0A` +
        `*Precio:* ${priceStr}%0A%0A` +
        `*DATOS DEL CLIENTE*%0A` +
        `*Nombre:* ${orderForm.fullName}%0A` +
        `*Cédula:* ${orderForm.idNumber}%0A` +
        `*Teléfono:* ${orderForm.phone}%0A` +
        `*País:* ${orderForm.country}%0A` +
        `*Ciudad/Provincia:* ${orderForm.city}%0A` +
        `*Distrito/Depto:* ${orderForm.district}%0A` +
        `*Dirección:* ${orderForm.address}%0A` +
        `*Otras señas:* ${orderForm.notes}%0A%0A` +
        `_Enviado desde el sitio web de Kezanix_`;

      const whatsappNumber = '50689186420';
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
      
      setCheckoutProduct(null);
      setOrderForm({
        fullName: '',
        idNumber: '',
        phone: '',
        address: '',
        country: 'Costa Rica',
        city: '',
        district: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      alert('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    if (newClicks === 3) {
      setShowAdminLogin(true);
      setLogoClicks(0);
    } else {
      setLogoClicks(newClicks);
      // Resetear clics después de 2 segundos de inactividad
      setTimeout(() => setLogoClicks(0), 2000);
    }
  };

  const handleAdminAuth = () => {
    if (adminPass.trim() === 'KezanixKetoLife') {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminPass('');
      alert('✅ Modo Administrador activado');
    } else {
      alert('❌ Contraseña incorrecta');
      setAdminPass('');
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Si ya es un embed, devolverlo
    if (url.includes('player.vimeo.com') || url.includes('youtube.com/embed')) return url;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return url;
  };

  // Supabase Listeners y Carga Inicial
  useEffect(() => {
    // Escuchar cambios de autenticación
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('order_index', { ascending: true });
      if (data) setProducts(data);
    };

    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 'main')
        .single();
      
      if (error && error.code === 'PGRST116') { // Record not found
        const defaultConfig = {
          id: 'main',
          hero_title: "TRANSFORMA TU CUERPO CON KETO PRIME",
          info_title: "¿POR QUÉ ELEGIR KETO PRIME?",
          info_text: "Nuestra fórmula avanzada está diseñada para ayudarte a alcanzar la cetosis más rápido, quemar grasa como combustible y mantener niveles de energía constantes durante todo el día.",
          video_url: "https://player.vimeo.com/video/123456789",
          benefits: [
            "Quema de grasa acelerada",
            "Claridad mental y enfoque",
            "Supresión natural del apetito",
            "Energía sostenida sin bajones"
          ],
          instagram_url: "https://instagram.com",
          facebook_url: "https://facebook.com"
        };
        const { data: newData } = await supabase.from('config').insert(defaultConfig).select().single();
        if (newData) setConfig(newData);
      } else if (data) {
        setConfig(data);
      }
    };

    const detectCountry = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.country_code) {
          const code = data.country_code;
          setDetectedCountry(code);
          if (countryNames[code]) {
            setOrderForm(prev => ({ ...prev, country: countryNames[code] }));
          }
        }
      } catch (e) {
        console.error("Error detecting country:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    fetchConfig();
    detectCountry();

    // Suscripción en tiempo real
    const productsChannel = supabase
      .channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    const configChannel = supabase
      .channel('config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, payload => {
        if (payload.new) setConfig(payload.new as AppConfig);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(configChannel);
    };
  }, []);

  const handleFileUpload = async (file: File, path: string, type: 'product' | 'protocol' | 'technical' | 'header'): Promise<string | null> => {
    console.log(`[Upload] Iniciando: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
    setUploading(type);
    try {
      const maxSize = type === 'header' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        const msg = `El archivo es demasiado grande (máximo ${maxSize / (1024 * 1024)}MB)`;
        alert(msg);
        throw new Error(msg);
      }

      const { data, error } = await supabase.storage
        .from('resources')
        .upload(path, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (error) {
        console.error("[Upload] Error Storage:", error);
        alert(`Error de almacenamiento: ${error.message}`);
        throw error;
      }

      console.log("[Upload] Éxito:", data);

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(path);

      console.log("[Upload] URL pública:", publicUrl);
      setUploading(null);
      return publicUrl;
    } catch (e: any) {
      console.error("[Upload] Excepción:", e);
      alert(`Error al subir: ${e.message || 'Error desconocido'}`);
      setUploading(null);
      return null;
    }
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      // Extraemos el ID para no enviarlo en el update del cuerpo
      const { id, ...dataToUpdate } = newConfig;
      
      const { error } = await supabase
        .from('config')
        .update(dataToUpdate)
        .eq('id', 'main');
        
      if (error) throw error;
      
      // Actualización optimista del estado local
      setConfig(newConfig);
      alert('✅ Configuración guardada correctamente');
    } catch (e) {
      console.error("Error al guardar config:", e);
      handleSupabaseError(e, 'saveConfig');
    }
  };

  const handleSaveProduct = async (product: any) => {
    try {
      // Si el producto tiene un ID de UUID (no contiene puntos y existe)
      if (product.id && product.id.length > 20) {
        const { id, created_at, ...data } = product;
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', id);
        if (error) throw error;
        
        // Actualizar estado local para reflejar cambios inmediatamente
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      } else {
        // Es un producto nuevo
        const { id, ...data } = product;
        const { data: insertedData, error } = await supabase
          .from('products')
          .insert({ ...data, order_index: products.length })
          .select()
          .single();
          
        if (error) throw error;
        if (insertedData) {
          setProducts(prev => [...prev, insertedData]);
        }
      }
      alert('✅ Producto guardado correctamente');
    } catch (e) {
      console.error("Error al guardar producto:", e);
      handleSupabaseError(e, 'saveProduct');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Actualización optimista: eliminar del estado local
      setProducts(prev => prev.filter(p => p.id !== id));
      alert('✅ Producto eliminado correctamente');
    } catch (e) {
      console.error("Error al eliminar producto:", e);
      handleSupabaseError(e, 'deleteProduct');
    }
  };

  const seedData = async () => {
    const initialProducts = [
      { name: "Pack Inicio Keto", price: 49.99, description: "Ideal para comenzar tu viaje keto con los suplementos esenciales.", image_url: "https://picsum.photos/seed/keto1/800/800", sales_url: "https://checkout.example.com/pack-inicio", order_index: 0 },
      { name: "Pack Avanzado Prime", price: 89.99, description: "Maximiza tus resultados con nuestra fórmula premium de BHB y MCT.", image_url: "https://picsum.photos/seed/keto2/800/800", sales_url: "https://checkout.example.com/pack-avanzado", order_index: 1 },
      { name: "Suscripción Elite", price: 129.99, description: "Suministro mensual completo más acceso a comunidad exclusiva.", image_url: "https://picsum.photos/seed/keto3/800/800", sales_url: "https://checkout.example.com/suscripcion-elite", order_index: 2 },
    ];
    const { error } = await supabase.from('products').insert(initialProducts);
    if (error) handleSupabaseError(error, 'seed');
    else alert('Datos iniciales cargados en Supabase');
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-brand-blue">
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      className="w-12 h-12 border-4 border-brand-blue border-t-brand-lime rounded-full"
    />
  </div>;

  const filteredProducts = products.filter(product => {
    // Si no hay países configurados, mostrar en todos por defecto
    if (!product.visible_countries || product.visible_countries.length === 0) return true;
    return product.visible_countries.includes(detectedCountry);
  });

  return (
    <div className="min-h-screen bg-white selection:bg-brand-lime selection:text-brand-blue">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-brand-blue/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="h-10 md:h-12 w-auto object-contain" />
            ) : (
              <>
                <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white font-rubik text-xl">K</div>
                <span className="font-rubik text-2xl tracking-tighter text-brand-blue font-bold">KEZANIX</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            {isAdminMode && (
              <button 
                onClick={() => setIsAdminMode(false)}
                className="p-2 rounded-full bg-brand-blue text-white transition-colors"
                title="Salir del modo edición"
              >
                <LogOut size={24} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {isAdminMode ? (
        <AdminPanel 
          products={products} 
          config={config} 
          seedData={seedData} 
          onSaveConfig={handleSaveConfig}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onFileUpload={handleFileUpload}
          uploading={uploading}
        />
      ) : (
        <main className="pt-20">
          {/* Hero / Header Section */}
          <section className="relative h-[300px] md:h-[450px] flex items-center justify-center overflow-hidden mb-12">
            {config?.hero_bg_url ? (
              <img 
                src={config.hero_bg_url} 
                className="absolute inset-0 w-full h-full object-cover" 
                alt="Header background" 
              />
            ) : (
              <div className="absolute inset-0 bg-brand-blue/5" />
            )}
            
            {/* Overlay para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white" />
            
            <div className="relative z-10 text-center px-6 max-w-5xl">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-5xl lg:text-6xl text-white mb-4 leading-none drop-shadow-2xl"
              >
                {config?.hero_title}
              </motion.h1>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium drop-shadow-lg">
                Elige el plan que mejor se adapte a tus objetivos de salud y bienestar.
              </p>
            </div>
          </section>

          <section className="px-6 max-w-7xl mx-auto pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredProducts.map((product, idx) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group bg-brand-blue border border-white/10 rounded-3xl p-8 hover:shadow-2xl hover:shadow-brand-blue/20 transition-all duration-500"
                >
                  <div className="aspect-square rounded-2xl overflow-hidden mb-6 bg-white/10 relative">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <ImageIcon size={48} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl text-white mb-2">{product.name}</h3>
                  <p className="text-white/70 text-sm mb-6 line-clamp-2">{product.description}</p>
                  <div className="flex flex-col gap-6 mt-auto">
                    <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Inversión</span>
                          <span className="text-3xl font-rubik text-white font-bold leading-none">{formatPrice(product)}</span>
                        </div>
                        <div className="text-brand-lime font-bold text-sm bg-brand-lime/20 px-3 py-1 rounded-full">
                          Envío Gratis
                        </div>
                      </div>
                      <button 
                        onClick={() => setCheckoutProduct(product)}
                        className="w-full bg-white text-brand-blue px-8 py-5 rounded-2xl font-bold hover:bg-brand-lime hover:text-brand-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10 whitespace-nowrap text-lg group-hover:scale-[1.02] active:scale-95"
                      >
                        Comprar Ahora <ExternalLink size={22} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Info Section */}
          <section className="bg-brand-blue py-24 px-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-light/20 blur-3xl rounded-full -mr-48 -mt-48"></div>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-4xl md:text-5xl mb-8 leading-tight">{config?.info_title}</h2>
                <p className="text-lg text-white/80 mb-10 leading-relaxed">
                  {config?.info_text}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {config?.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                      <CheckCircle2 className="text-brand-lime" />
                      <span className="font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10"
              >
                {config?.video_url ? (
                  <iframe 
                    src={getEmbedUrl(config.video_url)} 
                    className="w-full h-full"
                    title="Keto Prime Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full bg-brand-dark/20 flex items-center justify-center">
                    <Play size={48} className="text-white/20" />
                  </div>
                )}
              </motion.div>
            </div>
          </section>

          {/* Resources Section */}
          <section className="py-24 px-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <h2 className="text-4xl text-brand-blue mb-6">RECURSOS EXCLUSIVOS</h2>
                <p className="text-brand-dark/60 mb-8">Descarga nuestras guías gratuitas para maximizar tus resultados con Keto Prime.</p>
                <div className="flex flex-wrap gap-4">
                  <a 
                    href={config?.protocol_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-brand-lime text-brand-blue px-8 py-4 rounded-2xl font-bold hover:brightness-105 transition-all"
                  >
                    <Download size={20} /> Protocolo de Alimentación
                  </a>
                  <a 
                    href={config?.technical_sheet_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border-2 border-brand-blue text-brand-blue px-8 py-4 rounded-2xl font-bold hover:bg-brand-blue hover:text-white transition-all"
                  >
                    <Download size={20} /> Ficha Técnica
                  </a>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-brand-blue/5 aspect-square rounded-3xl flex items-center justify-center overflow-hidden relative">
                  {config?.protocol_image_url ? (
                    <img src={config.protocol_image_url} className="w-full h-full object-cover" alt="Protocolo" />
                  ) : (
                    <Download size={48} className="text-brand-blue/20" />
                  )}
                </div>
                <div className="bg-brand-lime/10 aspect-square rounded-3xl flex items-center justify-center mt-8 overflow-hidden relative">
                  {config?.technical_sheet_image_url ? (
                    <img src={config.technical_sheet_image_url} className="w-full h-full object-cover" alt="Ficha Técnica" />
                  ) : (
                    <CheckCircle2 size={48} className="text-brand-lime/30" />
                  )}
                </div>
              </div>
            </div>
          </section>

        </main>
      )}

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full"
            >
              <h3 className="text-2xl text-brand-dark mb-4">Acceso Admin</h3>
              <input 
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Introduce la contraseña"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-brand-blue outline-none mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-brand-dark/60 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdminAuth}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors"
                >
                  Entrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer - Eliminado por solicitud del usuario */}

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutProduct(null)}
              className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl"
            >
              <div className="sticky top-0 bg-white z-10 p-6 border-b border-brand-blue/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-archivo text-brand-blue leading-none">Finalizar Compra</h2>
                    <p className="text-xs text-brand-dark/40 mt-1 font-medium">{checkoutProduct.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCheckoutProduct(null)}
                  className="w-10 h-10 rounded-full bg-brand-blue/5 flex items-center justify-center text-brand-blue hover:bg-brand-blue hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                {/* Paso 1: Pago */}
                <div className="mb-10 p-6 bg-brand-blue/5 rounded-3xl border border-brand-blue/10">
                  <h3 className="text-lg font-archivo text-brand-blue mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-blue text-white rounded-full text-[10px] flex items-center justify-center">1</div>
                    Realiza tu Pago
                  </h3>
                  <p className="text-sm text-brand-dark/60 mb-6">
                    Para completar tu pedido, primero realiza el pago a través de nuestro enlace seguro. Una vez hecho, regresa aquí para llenar tus datos de envío.
                  </p>
                  <a 
                    href={getSalesUrl(checkoutProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-brand-blue text-white px-6 py-4 rounded-2xl font-bold hover:bg-brand-light transition-all shadow-lg shadow-brand-blue/20"
                  >
                    Ir a Pagar Ahora <ExternalLink size={18} />
                  </a>
                </div>

                {/* Paso 2: Datos */}
                <div className="space-y-6">
                  <h3 className="text-lg font-archivo text-brand-blue mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-blue text-white rounded-full text-[10px] flex items-center justify-center">2</div>
                    Datos de Envío
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30" size={18} />
                        <input 
                          type="text"
                          placeholder="Ej. Juan Pérez"
                          value={orderForm.fullName}
                          onChange={e => setOrderForm({...orderForm, fullName: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Número de Cédula</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30" size={18} />
                        <input 
                          type="text"
                          placeholder="ID / Cédula"
                          value={orderForm.idNumber}
                          onChange={e => setOrderForm({...orderForm, idNumber: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30" size={18} />
                        <input 
                          type="tel"
                          placeholder="+506 0000-0000"
                          value={orderForm.phone}
                          onChange={e => setOrderForm({...orderForm, phone: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">País</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30" size={18} />
                        <input 
                          type="text"
                          value={orderForm.country}
                          readOnly
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-blue/10 bg-gray-50 outline-none font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Provincia / Ciudad</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30" size={18} />
                        <input 
                          type="text"
                          placeholder="Ej. San José"
                          value={orderForm.city}
                          onChange={e => setOrderForm({...orderForm, city: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Distrito / Departamento</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30" size={18} />
                        <input 
                          type="text"
                          placeholder="Ej. Escazú"
                          value={orderForm.district}
                          onChange={e => setOrderForm({...orderForm, district: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Dirección Exacta</label>
                    <textarea 
                      placeholder="Calle, número de casa..."
                      value={orderForm.address}
                      onChange={e => setOrderForm({...orderForm, address: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-brand-dark/40 ml-2">Otras Señas / Notas</label>
                    <input 
                      type="text"
                      placeholder="Ej. Casa frente al parque"
                      value={orderForm.notes}
                      onChange={e => setOrderForm({...orderForm, notes: e.target.value})}
                      className="w-full p-4 rounded-2xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="mt-12">
                  <button 
                    onClick={handleWhatsAppOrder}
                    disabled={isSubmittingOrder || !orderForm.fullName || !orderForm.phone}
                    className="w-full bg-brand-blue text-white py-6 rounded-3xl font-archivo text-xl shadow-2xl shadow-brand-blue/30 hover:bg-brand-light transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Procesando...
                      </>
                    ) : (
                      <>
                        Confirmar y Enviar por WhatsApp
                        <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-brand-dark/30 mt-4 font-medium">
                    Al hacer clic, se abrirá WhatsApp para enviar tus datos directamente a nuestro equipo.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <footer className="bg-brand-blue text-white py-6 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest order-2 md:order-1">
            © 2026 KEZANIX GROUP. Todos los derechos reservados.
          </div>
          
          <div className="flex gap-4 order-1 md:order-2">
            <a 
              href={config?.instagram_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 bg-white text-brand-blue rounded-full flex items-center justify-center hover:bg-brand-lime hover:scale-110 transition-all shadow-lg group"
            >
              <Instagram size={20} className="group-hover:scale-110 transition-transform" />
            </a>
            <a 
              href={config?.facebook_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 bg-white text-brand-blue rounded-full flex items-center justify-center hover:bg-brand-lime hover:scale-110 transition-all shadow-lg group"
            >
              <Facebook size={20} className="group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Admin Panel Component ---

// --- Admin Panel Component ---

interface AdminPanelProps {
  products: Product[];
  config: AppConfig | null;
  seedData: () => void;
  onSaveConfig: (config: AppConfig) => void;
  onSaveProduct: (product: any) => void;
  onDeleteProduct: (id: string) => void;
  onFileUpload: (file: File, path: string, type: 'product' | 'protocol' | 'technical' | 'header') => Promise<string | null>;
  uploading: 'product' | 'protocol' | 'technical' | 'header' | null;
}

function AdminPanel({ 
  products, 
  config, 
  seedData, 
  onSaveConfig, 
  onSaveProduct, 
  onDeleteProduct,
  onFileUpload,
  uploading
}: AdminPanelProps) {
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(config);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (config) setLocalConfig(config);
  }, [config]);

  return (
    <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto space-y-16">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl text-brand-blue">PANEL DE CONTROL</h2>
        <div className="flex gap-4">
          {products.length === 0 && (
            <button 
              onClick={seedData}
              className="flex items-center gap-2 bg-brand-blue/10 text-brand-blue px-6 py-3 rounded-xl font-bold hover:bg-brand-blue/20 transition-colors"
            >
              Cargar Datos Iniciales
            </button>
          )}
          <button 
            onClick={() => localConfig && onSaveConfig(localConfig)}
            className="flex items-center gap-2 bg-brand-lime text-brand-blue px-6 py-3 rounded-xl font-bold"
          >
            <Save size={20} /> Guardar Cambios Globales
          </button>
        </div>
      </div>

      {/* Config Editor */}
      <section className="bg-brand-blue/5 p-8 rounded-3xl space-y-6">
        <h3 className="text-xl text-brand-blue">Textos y Enlaces</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Logo de la Marca (Horizontal)</label>
            <div className="flex gap-4 items-center">
              {localConfig?.logo_url ? (
                <div className="h-16 px-4 bg-white rounded-xl border border-brand-blue/10 flex items-center justify-center">
                  <img src={localConfig.logo_url} className="h-12 w-auto object-contain" alt="Logo preview" />
                </div>
              ) : null}
              <div className="flex-1 flex gap-2">
                <input 
                  type="text" 
                  value={localConfig?.logo_url || ''} 
                  readOnly
                  placeholder="URL del logo"
                  className="flex-1 p-3 rounded-xl border border-brand-blue/10 bg-white/50 outline-none"
                />
                <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                  {uploading === 'product' ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : <Upload size={20} />}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    disabled={uploading !== null}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await onFileUpload(file, `resources/logo_${Date.now()}_${file.name}`, 'product');
                        if (url) setLocalConfig(prev => prev ? { ...prev, logo_url: url } : null);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Imagen de Fondo del Header (Horizontal)</label>
            <div className="flex gap-4 items-center">
              {localConfig?.hero_bg_url ? (
                <img src={localConfig.hero_bg_url} className="w-32 h-16 object-cover border border-brand-blue/10 rounded-lg" alt="Header preview" />
              ) : null}
              <div className="flex-1 flex gap-2">
                <input 
                  type="text" 
                  value={localConfig?.hero_bg_url || ''} 
                  readOnly
                  placeholder="URL de la imagen de fondo"
                  className="flex-1 p-3 rounded-xl border border-brand-blue/10 bg-white/50 outline-none"
                />
                <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                  {uploading === 'header' ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : <Upload size={20} />}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    disabled={uploading !== null}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Archivo seleccionado para header:", file.name);
                        const url = await onFileUpload(file, `resources/header_${Date.now()}_${file.name}`, 'header');
                        console.log("Resultado de subida (URL):", url);
                        if (url) {
                          setLocalConfig(prev => {
                            if (!prev) return null;
                            const updated = { ...prev, hero_bg_url: url };
                            console.log("Configuración local actualizada con header:", updated);
                            return updated;
                          });
                        } else {
                          console.error("No se recibió URL de la subida");
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Título Hero</label>
            <input 
              type="text" 
              value={localConfig?.hero_title || ''} 
              onChange={e => setLocalConfig(prev => prev ? { ...prev, hero_title: e.target.value } : null)}
              className="w-full p-3 rounded-xl border border-brand-blue/10 focus:ring-2 ring-brand-blue outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Título Info</label>
            <input 
              type="text" 
              value={localConfig?.info_title || ''} 
              onChange={e => setLocalConfig(prev => prev ? { ...prev, info_title: e.target.value } : null)}
              className="w-full p-3 rounded-xl border border-brand-blue/10 focus:ring-2 ring-brand-blue outline-none"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Texto Informativo</label>
            <textarea 
              rows={4}
              value={localConfig?.info_text || ''} 
              onChange={e => setLocalConfig(prev => prev ? { ...prev, info_text: e.target.value } : null)}
              className="w-full p-3 rounded-xl border border-brand-blue/10 focus:ring-2 ring-brand-blue outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">URL Video (YouTube o Vimeo)</label>
            <input 
              type="text" 
              placeholder="Ej: https://vimeo.com/123456789"
              value={localConfig?.video_url || ''} 
              onChange={e => setLocalConfig(prev => prev ? { ...prev, video_url: e.target.value } : null)}
              className="w-full p-3 rounded-xl border border-brand-blue/10 focus:ring-2 ring-brand-blue outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Protocolo PDF</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={localConfig?.protocol_pdf_url || ''} 
                readOnly
                className="flex-1 p-3 rounded-xl border border-brand-blue/10 bg-white/50 outline-none"
              />
              <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                {uploading === 'protocol' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : <Upload size={20} />}
                <input 
                  type="file" 
                  accept=".pdf"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await onFileUpload(file, `resources/protocol_${Date.now()}.pdf`, 'protocol');
                      if (url) setLocalConfig(prev => prev ? { ...prev, protocol_pdf_url: url } : null);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Imagen Protocolo (Cuadrada)</label>
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {localConfig?.protocol_image_url && <img src={localConfig.protocol_image_url} className="w-full h-full object-cover" />}
              </div>
              <input 
                type="text" 
                value={localConfig?.protocol_image_url || ''} 
                readOnly
                className="flex-1 p-3 rounded-xl border border-brand-blue/10 bg-white/50 outline-none"
              />
              <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                {uploading === 'header' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : <Upload size={20} />}
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await onFileUpload(file, `resources/protocol_img_${Date.now()}_${file.name}`, 'header');
                      if (url) setLocalConfig(prev => prev ? { ...prev, protocol_image_url: url } : null);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Ficha Técnica PDF</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={localConfig?.technical_sheet_pdf_url || ''} 
                readOnly
                className="flex-1 p-3 rounded-xl border border-brand-blue/10 bg-white/50 outline-none"
              />
              <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                {uploading === 'technical' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : <Upload size={20} />}
                <input 
                  type="file" 
                  accept=".pdf"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await onFileUpload(file, `resources/technical_${Date.now()}.pdf`, 'technical');
                      if (url) setLocalConfig(prev => prev ? { ...prev, technical_sheet_pdf_url: url } : null);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">Imagen Ficha Técnica (Cuadrada)</label>
            <div className="flex gap-2">
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {localConfig?.technical_sheet_image_url && <img src={localConfig.technical_sheet_image_url} className="w-full h-full object-cover" />}
              </div>
              <input 
                type="text" 
                value={localConfig?.technical_sheet_image_url || ''} 
                readOnly
                className="flex-1 p-3 rounded-xl border border-brand-blue/10 bg-white/50 outline-none"
              />
              <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                {uploading === 'header' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : <Upload size={20} />}
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await onFileUpload(file, `resources/technical_img_${Date.now()}_${file.name}`, 'header');
                      if (url) setLocalConfig(prev => prev ? { ...prev, technical_sheet_image_url: url } : null);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">URL Instagram</label>
            <input 
              type="text" 
              value={localConfig?.instagram_url || ''} 
              onChange={e => setLocalConfig(prev => prev ? { ...prev, instagram_url: e.target.value } : null)}
              className="w-full p-3 rounded-xl border border-brand-blue/10 focus:ring-2 ring-brand-blue outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-brand-dark/40">URL Facebook</label>
            <input 
              type="text" 
              value={localConfig?.facebook_url || ''} 
              onChange={e => setLocalConfig(prev => prev ? { ...prev, facebook_url: e.target.value } : null)}
              className="w-full p-3 rounded-xl border border-brand-blue/10 focus:ring-2 ring-brand-blue outline-none"
            />
          </div>
        </div>
      </section>

      {/* Products Editor */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl text-brand-blue">Gestionar Productos</h3>
          <button 
            onClick={() => setEditingProduct({ name: '', price: 0, image_url: '', description: '', sales_url: '' })}
            className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl font-bold text-sm"
          >
            <Plus size={18} /> Nuevo Producto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className="flex items-center gap-4 bg-white border border-brand-blue/10 p-4 rounded-2xl">
              {p.image_url ? (
                <img src={p.image_url} className="w-16 h-16 object-cover rounded-lg bg-brand-blue/5" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-brand-blue/5 flex items-center justify-center text-brand-blue/20">
                  <ImageIcon size={24} />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-brand-blue">{p.name}</h4>
                <p className="text-sm text-brand-dark/40">${p.price.toFixed(2)} USD</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingProduct(p)} className="p-2 hover:bg-brand-blue/5 rounded-full text-brand-blue">
                  <Settings size={18} />
                </button>
                
                {confirmDeleteId === p.id ? (
                  <div className="flex items-center gap-1 bg-red-50 rounded-xl p-1">
                    <button 
                      onClick={() => {
                        onDeleteProduct(p.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors"
                    >
                      CONFIRMAR
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmDeleteId(p.id)} 
                    className="p-2 hover:bg-red-50 rounded-full text-red-500"
                    title="Eliminar producto"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-brand-blue/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 pb-4 flex justify-between items-center border-b border-brand-blue/5">
                <h3 className="text-2xl text-brand-blue">{editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-brand-blue/5 rounded-full text-brand-dark/40">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold uppercase text-brand-dark/40">Imagen del Producto</label>
                    <div className="flex gap-2">
                      <input 
                        placeholder="URL de Imagen"
                        value={editingProduct.image_url}
                        onChange={e => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                        className="flex-1 p-3 rounded-xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                      />
                      <label className="bg-brand-blue text-white p-3 rounded-xl cursor-pointer hover:bg-brand-light transition-colors flex items-center gap-2">
                        {uploading === 'product' ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : <Upload size={20} />}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          disabled={uploading !== null}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await onFileUpload(file, `products/${Date.now()}_${file.name}`, 'product');
                              if (url) setEditingProduct({ ...editingProduct, image_url: url });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {editingProduct.image_url ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-brand-blue/10">
                      <img src={editingProduct.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                  ) : null}
                </div>
                <input 
                  placeholder="Nombre del producto"
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-brand-dark/40 ml-1">PRECIO BASE (USD)</label>
                    <input 
                      placeholder="Precio Base"
                      type="number"
                      value={isNaN(editingProduct.price) ? '' : editingProduct.price}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setEditingProduct({ ...editingProduct, price: isNaN(val) ? 0 : val });
                      }}
                      className="w-full p-3 rounded-xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-brand-dark/40 ml-1">LINK DE VENTA</label>
                    <input 
                      placeholder="Link de Venta (Checkout)"
                      value={editingProduct.sales_url}
                      onChange={e => setEditingProduct({ ...editingProduct, sales_url: e.target.value })}
                      className="w-full p-3 rounded-xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                    />
                  </div>
                </div>

                <div className="p-4 bg-brand-blue/5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-brand-blue uppercase tracking-widest">Configuración por País (Opcional)</h4>
                  <div className="space-y-4">
                    {[
                      { code: 'CR', label: 'Costa Rica' },
                      { code: 'MX', label: 'México' },
                      { code: 'GT', label: 'Guatemala' },
                      { code: 'CO', label: 'Colombia' },
                      { code: 'US', label: 'Estados Unidos' }
                    ].map(country => (
                      <div key={country.code} className="p-3 bg-white/50 rounded-xl border border-brand-blue/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-brand-blue uppercase">{country.label}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-[9px] font-bold text-brand-dark/40">Visible</span>
                            <input 
                              type="checkbox"
                              checked={!editingProduct.visible_countries || editingProduct.visible_countries.includes(country.code)}
                              onChange={(e) => {
                                const currentVisible = editingProduct.visible_countries || ['CR', 'MX', 'GT', 'CO', 'US'];
                                let nextVisible;
                                if (e.target.checked) {
                                  nextVisible = [...currentVisible, country.code];
                                } else {
                                  nextVisible = currentVisible.filter(c => c !== country.code);
                                }
                                setEditingProduct({ ...editingProduct, visible_countries: nextVisible });
                              }}
                              className="w-4 h-4 rounded border-brand-blue/10 text-brand-blue focus:ring-brand-blue"
                            />
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-brand-dark/40 ml-1">Precio (USD)</label>
                            <input 
                              type="number"
                              placeholder="Precio local"
                              value={editingProduct.prices?.[country.code] !== undefined && !isNaN(editingProduct.prices[country.code]) ? editingProduct.prices[country.code] : ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                const newPrices = { ...(editingProduct.prices || {}) };
                                if (isNaN(val)) delete newPrices[country.code];
                                else newPrices[country.code] = val;
                                setEditingProduct({ ...editingProduct, prices: newPrices });
                              }}
                              className="w-full p-2 text-sm rounded-lg border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-brand-dark/40 ml-1">Link de Venta</label>
                            <input 
                              type="text"
                              placeholder="Link específico"
                              value={editingProduct.sales_urls?.[country.code] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                const newUrls = { ...(editingProduct.sales_urls || {}) };
                                if (!val) delete newUrls[country.code];
                                else newUrls[country.code] = val;
                                setEditingProduct({ ...editingProduct, sales_urls: newUrls });
                              }}
                              className="w-full p-2 text-sm rounded-lg border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <textarea 
                  placeholder="Descripción corta"
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-brand-blue/10 outline-none focus:ring-2 ring-brand-blue"
                />
              </div>
            </div>

              <div className="p-8 pt-4 border-t border-brand-blue/5 flex gap-4">
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-brand-dark/60 hover:bg-brand-blue/5"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    await onSaveProduct(editingProduct);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
