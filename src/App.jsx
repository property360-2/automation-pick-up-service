import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LogOut as LogoutIcon, ShoppingCart, User, Package, LogIn, Menu, X, ArrowRight, CheckCircle2, Clock, MapPin, Check, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { animate, stagger } from 'animejs';

/**
 * Automation Showcase Premium App Component
 * Aesthetic: Modern / Glassmorphic / Animated
 */
import { auth } from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { PrivacyPolicy, TermsConditions } from './components/LegalPages';

const NavLinks = ({ user }) => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="flex items-center gap-6">
      <Link to="/" className={`text-sm font-bold transition-all no-underline ${path === '/' ? 'text-primary' : 'text-text-dim hover:text-text-main'}`}>MARKETPLACE</Link>
      {user && <Link to="/status" className={`text-sm font-bold transition-all no-underline ${path === '/status' ? 'text-primary' : 'text-text-dim hover:text-text-main'}`}>TRACKER</Link>}
      {user?.email?.includes('admin') && (
        <>
          <Link to="/admin" className={`text-sm font-bold transition-all no-underline ${path === '/admin' ? 'text-primary' : 'text-text-dim hover:text-text-main'}`}>COMMAND</Link>
          <Link to="/analytics" className={`text-sm font-bold transition-all no-underline ${path === '/analytics' ? 'text-primary' : 'text-text-dim hover:text-text-main'}`}>ANALYTICS</Link>
        </>
      )}
    </div>
  );
};

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('idle');
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartAnimate, setCartAnimate] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const cartRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        setIsCartOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch inventory
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        if (Array.isArray(data)) {
          setInventory(data);
        } else {
          console.error('Inventory data is not an array:', data);
          setInventory([]);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleSignOut = () => signOut(auth);

  const parsePrice = (price) => {
    if (typeof price === 'number') return price;
    if (!price) return 0;
    return parseFloat(price.toString().replace(/[^\d.]/g, '')) || 0;
  };

  const addToCart = (product) => {
    console.log("Adding to cart:", product.name);
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.name === product.name);
      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: (newCart[existingItemIndex].quantity || 1) + 1
        };
        return newCart;
      }
      return [...prevCart, { ...product, quantity: 1, cartId: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }];
    });
    setCartAnimate(true);
    setIsSuccess(true);
    setTimeout(() => {
      setCartAnimate(false);
      setIsSuccess(false);
    }, 1500);
  };

  // Deduplicate cart items that might have been added before the grouping fix
  useEffect(() => {
    if (cart.length > 0) {
      const grouped = cart.reduce((acc, current) => {
        const existing = acc.find(item => item.name === current.name);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (current.quantity || 1);
          return acc;
        }
        return [...acc, { ...current, quantity: current.quantity || 1 }];
      }, []);

      if (grouped.length !== cart.length) {
        setCart(grouped);
      }
    }
  }, [cart.length]);

  const updateQuantity = (name, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.name === name) {
        const newQty = (item.quantity || 1) + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (name) => {
    setCart(cart.filter(item => item.name !== name));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)), 0);
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const placeOrder = async (customerInfo) => {
    setOrderStatus('processing');
    try {
      const orderData = {
        ...customerInfo,
        items: cart,
        total: cartTotal.toFixed(2),
        orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        uid: user?.uid // Track user
      };

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        setOrderStatus('success');
        setCart([]);
        setTimeout(() => {
          setIsCheckoutOpen(false);
          setOrderStatus('idle');
        }, 3000);
      } else {
        throw new Error('Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to place order. Please try again.');
      setOrderStatus('idle');
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        {/* Navigation Bar */}
        <nav className="container mt-6 z-50 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <NavLinks user={user} />
            </div>

            <div className="flex items-center gap-8">
              {/* User Profile info (if logged in) */}
              {user && (
                <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 hover:border-primary/30 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0 relative">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs ${user.photoURL ? 'hidden' : 'flex'}`}>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-text-main truncate max-w-120">
                    {user.displayName || user.email.split('@')[0]}
                  </span>
                </div>
              )}

              {/* Grouped Icons at the end */}
              <div className={`flex items-center gap-6 ${user ? 'pl-6 border-l border-slate-200 ml-2' : ''}`}>
                {/* Cart Drawer Toggle */}
                <div className="relative inline-flex items-center" ref={cartRef}>
                  <button onClick={() => setIsCartOpen(!isCartOpen)} className="!bg-transparent !border-none !p-0 !shadow-none text-text-main hover:text-primary transition-all group">
                    <motion.div
                      className="relative"
                      animate={cartAnimate ? {
                        scale: [1, 1.4, 0.9, 1.1, 1],
                        rotate: [0, -15, 15, -10, 10, 0]
                      } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      <ShoppingCart size={24} />
                      <AnimatePresence>
                        {isSuccess && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: -5 }}
                            exit={{ scale: 0, opacity: 0, y: -10 }}
                            className="absolute -top-2 -right-2 text-white rounded-full p-0.5 border-2 border-white shadow-lg z-[100]"
                            style={{ backgroundColor: '#10b981' }}
                          >
                            <CheckCircle2 size={12} strokeWidth={4} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </button>
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black ring-2 ring-white pointer-events-none">
                      {totalItems}
                    </span>
                  )}

                  {/* Cart Preview (Glass Dropdown) */}
                  <div className={`absolute right-0 top-full mt-4 w-80 glass-card p-6 transition-all z-[100] ${isCartOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <ShoppingCart size={18} /> My Basket
                    </h4>
                    {cart.length === 0 ? (
                      <p className="text-sm text-text-dim text-center py-4">Your basket is currently empty.</p>
                    ) : (
                      <>
                        <div className="max-h-60 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                          {cart.map(item => (
                            <div key={item.name} className="flex flex-col py-3 border-b border-slate-100 last:border-0 group/item">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-black text-text-main truncate pr-4">{item.name}</span>
                                <span className="text-primary font-black text-sm">₱{(parsePrice(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                                  <button
                                    onClick={() => updateQuantity(item.name, -1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-text-dim hover:text-primary transition-all !p-0"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="w-8 text-center text-xs font-black">{item.quantity || 1}</span>
                                  <button
                                    onClick={() => updateQuantity(item.name, 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-text-dim hover:text-primary transition-all !p-0"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                                <button onClick={() => removeFromCart(item.name)} className="text-text-dim hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter !bg-transparent !border-none">
                                  <X size={14} /> Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center font-bold text-lg mb-6">
                          <span>Total</span>
                          <span className="text-primary">₱{cartTotal.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => user ? setIsCheckoutOpen(true) : setIsAuthModalOpen(true)}
                          className="primary-btn w-full justify-center"
                        >
                          {user ? 'Process Checkout' : 'Secure Sign In'}
                          <ArrowRight size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Logout or Login Button */}
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="!bg-transparent !border-none !p-0 !shadow-none text-text-dim hover:text-red-500 transition-colors flex items-center justify-center shrink-0"
                    title="Sign Out"
                  >
                    <LogoutIcon size={24} className="rotate-180" />
                  </button>
                ) : (
                  <button onClick={() => setIsAuthModalOpen(true)} className="!bg-transparent !border-none !p-0 !shadow-none text-text-main hover:text-primary transition-all flex items-center justify-center shrink-0" title="Secure Login">
                    <LogIn size={24} />
                  </button>
                )}

                <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Auth Modal */}
        <AnimatePresence>
          {isAuthModalOpen && (
            <AuthModal onClose={() => setIsAuthModalOpen(false)} />
          )}
        </AnimatePresence>

        {/* Checkout Modal */}

        {/* Checkout Modal */}
        <AnimatePresence>
          {isCheckoutOpen && (
            <CheckoutModal
              user={user}
              total={cartTotal}
              onClose={() => setIsCheckoutOpen(false)}
              onPlaceOrder={placeOrder}
              status={orderStatus}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-grow container section-padding">
          <Routes>
            <Route path="/" element={<Home user={user} onOpenAuth={() => setIsAuthModalOpen(true)} inventory={inventory} loading={loading} addToCart={addToCart} />} />
            <Route path="/status" element={<OrderStatus user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/analytics" element={<AdminAnalytics />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="py-12 border-t border-white/5 bg-black/20">
          <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                <Package size={12} />
              </div>
              <span className="font-bold tracking-tighter text-sm">Automation Showcase</span>
            </div>
            <p className="text-text-dim text-xs">&copy; 2026 High-Fidelity Automated Services. All rights reserved.</p>
            <div className="flex gap-6 text-text-dim text-xs uppercase font-bold tracking-widest">
              <Link to="/privacy" className="hover:text-primary transition-colors no-underline">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors no-underline">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

/* --- Page Components --- */

const ProductCard = ({ product, addToCart }) => {
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <div className="group glass-card p-6 transition-all duration-500 border border-slate-100 flex flex-col h-full anime-card">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-slate-50 aspect-square flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        {product.status === 'Out of Stock' && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-black text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Sold Out</span>
          </div>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700"
          />
        ) : (
          <Package size={48} className="text-primary/20 transition-transform duration-500" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-black text-black leading-tight transition-colors">{product.name}</h3>
          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${product.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}>
            {product.status}
          </span>
        </div>
        <p className="text-text-dim text-sm line-clamp-2 mb-4 leading-relaxed">
          {product.description || 'Premium automated pickup item, verified for quality and performance.'}
        </p>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div>
          <span className="text-text-dim text-[10px] font-bold uppercase tracking-widest block mb-1">Unit Price</span>
          <span className="text-2xl font-black text-primary">₱{product.price}</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.9, rotate: -5 }}
          whileHover={{ scale: 1.1 }}
          onClick={handleAdd}
          disabled={product.status === 'Out of Stock' || isAdded}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-none
            ${isAdded
              ? 'text-white border-transparent'
              : 'bg-slate-100 text-text-main border-slate-200 hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20'
            }`}
          style={isAdded ? { backgroundColor: '#10b981' } : {}}
        >
          {isAdded ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <CheckCircle2 size={22} strokeWidth={3} />
            </motion.div>
          ) : (
            <ShoppingCart size={20} />
          )}
        </motion.button>
      </div>
    </div>
  );
};

/* --- Animated Page Components --- */

const Home = ({ user, onOpenAuth, inventory, loading, addToCart }) => {
  const gridRef = useRef(null);

  useEffect(() => {
    if (user && !loading && inventory.length > 0) {
      animate('.anime-card', {
        translateY: [40, 0],
        opacity: [0, 1],
        delay: stagger(80),
        easing: 'easeOutExpo',
        duration: 1200
      });
    }
  }, [user, loading, inventory]);

  if (!user) {
    return (
      <div className="anime-fade-in flex flex-col items-center justify-center py-12 md:py-24 text-center">
        <header className="mb-16 w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
            Automated Logistics Protocol
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tight text-black text-center w-full">
            Automation<span className="gradient-text">Showcase.</span>
          </h1>
          <p className="text-text-dim text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto mb-12 text-center">
            The next generation of automated logistics and inventory management. Secure your resources with high-fidelity encryption and real-time tracking.
          </p>
          <div className="flex flex-col gap-8 justify-center items-center">
            <button
              onClick={onOpenAuth}
              className="primary-btn px-12 py-5 text-lg font-black tracking-widest shadow-2xl shadow-primary/30"
            >
              Get Started
              <ArrowRight size={20} />
            </button>
            <div className="text-text-dim text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 border border-slate-200 rounded-full bg-slate-50/50 backdrop-blur-sm">
              Secured by Firebase v10
            </div>
          </div>
        </header>

        {/* Feature Preview Grid (Blurry/Tease) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full opacity-20 pointer-events-none filter blur-sm">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-8 text-left">
              <div className="w-12 h-12 bg-slate-100 rounded-xl mb-6"></div>
              <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="anime-stagger">
      <header className="mb-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-6">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
          Live Inventory Hub
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tight text-black">
          Marketplace.
        </h1>
        <p className="text-text-dim text-lg md:text-xl leading-relaxed">
          Authorized access granted. Browse real-time stock and secure your pickup in seconds.
        </p>
      </header>

      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card p-8 animate-pulse">
              <div className="aspect-square bg-slate-100 rounded-2xl mb-6"></div>
              <div className="h-8 bg-slate-100 rounded-md w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-100 rounded-md w-1/2 mb-8"></div>
              <div className="flex justify-between items-center">
                <div className="h-10 bg-slate-100 rounded-md w-1/3"></div>
                <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
          ))
        ) : inventory.length === 0 ? (
          <div className="col-span-full py-24 text-center glass-card">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Package size={40} className="text-text-dim" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Items Found</h3>
            <p className="text-text-dim">Our system is currently updating its inventory status.</p>
          </div>
        ) : (
          inventory.map((product) => (
            <ProductCard key={product.id || product.name} product={product} addToCart={addToCart} />
          ))
        )}
      </div>
    </div>
  );
};

const OrderStatus = ({ user, onOpenAuth }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      const fetchMyOrders = async () => {
        try {
          const response = await fetch(`/api/my-orders?email=${user.email}`);
          const data = await response.json();
          setOrders(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching my orders:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchMyOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) return (
    <div className="flex-grow flex items-center justify-center py-20 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md w-full"
      >
        <h2 className="text-5xl font-black mb-4 text-black tracking-tighter">Secure Tracker</h2>
        <p className="text-text-dim mb-12 text-lg leading-relaxed">
          Please sign in to access your encrypted order history and live pickup status.
        </p>
        <div className="flex flex-col gap-4">
          <button onClick={onOpenAuth} className="primary-btn w-full justify-center py-5 text-sm tracking-widest font-black uppercase">
            Sign In Now
            <ArrowRight size={18} />
          </button>
          <Link to="/" className="text-text-dim hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest no-underline py-2">
            Return to Marketplace
          </Link>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-black mb-2 text-black">My Orders.</h2>
        <p className="text-text-dim">Real-time status of your active and past pickup requests.</p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-8 animate-pulse flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-slate-100 rounded-md w-24"></div>
                    <div className="h-5 bg-slate-100 rounded-full w-20"></div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-md w-40"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-slate-100 rounded-md w-16"></div>
                    <div className="h-6 bg-slate-100 rounded-md w-20"></div>
                  </div>
                </div>
                <div className="w-full md:w-32 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-10 text-right">
                  <div className="h-3 bg-slate-100 rounded-md w-16 ml-auto mb-2"></div>
                  <div className="h-8 bg-slate-100 rounded-md w-24 ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (!orders || !Array.isArray(orders) || orders.length === 0) ? (
          <div className="text-center py-24 glass-card">
            <Package size={48} className="mx-auto mb-6 text-slate-300" />
            <h3 className="text-xl font-bold mb-2">No History Detected</h3>
            <p className="text-text-dim mb-8">You haven't placed any pickup orders yet or the system is syncing.</p>
            <Link to="/" className="primary-btn mx-auto inline-flex">Explore Inventory</Link>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-dim">Protocol ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-dim">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-dim">Timestamp</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-dim">Inventory Items</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-dim text-right">Commitment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0">
                      <td className="px-8 py-6">
                        <span className="font-mono text-primary font-black text-sm tracking-widest">{order.orderId}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`status-badge inline-flex ${order.status === 'Ready' ? 'status-ready' : 'status-pending'}`}>
                          {order.status}
                        </div>
                        {order.status === 'Ready' && (
                          <div className="mt-2 flex items-center gap-1.5 text-accent text-[10px] font-bold uppercase tracking-tight">
                            <MapPin size={12} /> Ready for Pickup
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-medium text-text-main">{new Date(order.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-text-dim uppercase tracking-wider mt-1">{new Date(order.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase border border-slate-200">
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-xl font-black text-text-main">₱{order.total}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [ordersRes, inventoryRes] = await Promise.all([
        fetch('/api/admin-orders').then(r => r.json()),
        fetch('/api/inventory').then(r => r.json())
      ]);
      setOrders(ordersRes);
      setInventory(inventoryRes);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-20 animate-pulse text-text-dim">Synthesizing data intelligence...</div>;

  // Data Processing
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
  const totalOrders = orders.length;
  
  const itemFrequency = {};
  orders.forEach(order => {
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      items.forEach(item => {
        itemFrequency[item.name] = (itemFrequency[item.name] || 0) + (item.quantity || 1);
      });
    } catch (e) { console.error('Parse error', e); }
  });

  const topItems = Object.entries(itemFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const inStockCount = inventory.filter(i => i.status === 'In Stock').length;
  const outOfStockCount = inventory.filter(i => i.status !== 'In Stock').length;

  return (
    <div className="animate-fade-in">
      <div className="mb-12">
        <h2 className="text-4xl font-black mb-2">Data <span className="gradient-text">Intelligence.</span></h2>
        <p className="text-text-dim">Real-time performance metrics and inventory throughput analysis.</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-4">Total Revenue Generated</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-text-main">₱{totalRevenue.toLocaleString()}</span>
            <span className="text-xs font-bold text-accent">+12.5%</span>
          </div>
        </div>
        <div className="glass-card p-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-4">Pickup Protocols Executed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-text-main">{totalOrders}</span>
            <span className="text-xs font-bold text-primary">Live</span>
          </div>
        </div>
        <div className="glass-card p-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-4">Inventory Health Index</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-text-main">{Math.round((inStockCount / (inventory.length || 1)) * 100)}%</span>
            <span className="text-xs font-bold text-text-dim">{inStockCount} / {inventory.length} SKUs</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Top Selling Items */}
        <div>
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            Market Demand: Top 5 Items
          </h3>
          <div className="space-y-4">
            {topItems.map(([name, count], idx) => (
              <div key={idx} className="glass-card p-5 relative overflow-hidden group">
                <div 
                  className="absolute inset-y-0 left-0 bg-primary/5 transition-all duration-1000" 
                  style={{ width: `${(count / (topItems[0][1] || 1)) * 100}%` }}
                ></div>
                <div className="relative flex justify-between items-center">
                  <span className="font-bold text-sm text-text-main">{name}</span>
                  <span className="font-mono text-primary font-black">{count} Units</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div>
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-accent rounded-full"></div>
            Protocol Status Distribution
          </h3>
          <div className="glass-card p-8 space-y-8">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-text-dim">{status}</span>
                  <span className="text-text-main">{count} Orders ({Math.round((count / totalOrders) * 100)}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      status === 'Ready' ? 'bg-accent' : 
                      status === 'Picked Up' ? 'bg-slate-400' : 
                      'bg-primary'
                    }`}
                    style={{ width: `${(count / totalOrders) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin-orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching admin orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, newStatus, customerEmail, customerName) => {
    setUpdating(orderId);
    try {
      const response = await fetch('/api/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus, customerEmail, customerName }),
      });
      if (response.ok) {
        await fetchOrders();
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="text-center py-20 animate-pulse text-text-dim">Decrypting database records...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-black mb-2">Admin <span className="gradient-text">Command.</span></h2>
          <p className="text-text-dim">Manage global pickup requests and inventory distribution.</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-6 py-2 rounded-full text-primary text-xs font-black uppercase tracking-widest">
          {orders.length} Active Protocols
        </div>
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="glass-card p-24 text-center">
            <Package size={48} className="mx-auto mb-6 text-white/5" />
            <p className="text-text-dim font-medium italic">No active pickup protocols detected in the backbone.</p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              key={order.orderId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-8"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-mono text-primary font-black text-sm tracking-widest">{order.orderId}</span>
                  <div className={`status-badge ${order.status === 'Ready' ? 'status-ready' :
                    order.status === 'Picked Up' ? 'bg-white/10 text-text-dim' :
                      'status-pending'
                    }`}>
                    {order.status}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{order.customerName}</h3>
                <p className="text-sm text-text-dim mb-4">{order.customerEmail}</p>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg text-slate-500 font-bold uppercase tracking-tighter">
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-6 min-w-[240px] border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-10">
                <div className="text-right">
                  <p className="text-[10px] text-text-dim font-black uppercase tracking-widest mb-1">{new Date(order.timestamp).toLocaleString()}</p>
                  <p className="text-3xl font-black text-text-main">₱{order.total}</p>
                </div>

                <div className="flex gap-3 w-full justify-end">
                  {order.status === 'Pending' && (
                    <button
                      disabled={updating === order.orderId}
                      onClick={() => updateStatus(order.orderId, 'Ready', order.customerEmail, order.customerName)}
                      className="px-6 py-2 bg-accent text-black hover:bg-accent/80 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {updating === order.orderId ? 'SYNCING...' : 'AUTHORIZE READY'}
                    </button>
                  )}
                  {order.status === 'Ready' && (
                    <button
                      disabled={updating === order.orderId}
                      onClick={() => updateStatus(order.orderId, 'Picked Up', order.customerEmail, order.customerName)}
                      className="px-6 py-2 bg-primary text-black hover:bg-primary/80 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {updating === order.orderId ? 'SYNCING...' : 'MARK PICKED UP'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const CheckoutModal = ({ user, total, onClose, onPlaceOrder, status }) => {
  const [formData, setFormData] = useState({
    customerName: user?.displayName || '',
    customerEmail: user?.email || ''
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card w-full max-w-lg p-10 relative z-10 border border-slate-200 shadow-2xl shadow-primary/5">
        <button onClick={onClose} className="absolute top-6 right-6 text-text-dim hover:text-text-main transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
          <X size={20} />
        </button>

        {status === 'success' ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-8 glow-effect">
              <CheckCircle2 size={40} className="text-accent" />
            </div>
            <h2 className="text-3xl font-black mb-4">Protocol Success!</h2>
            <p className="text-text-dim text-lg leading-relaxed mb-6">
              Your pickup request has been logged. <br /> Check <b>{formData.customerEmail}</b> for the receipt.
            </p>
            <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl text-orange-800 text-sm text-left">
              <p className="font-bold mb-1">⚠️ Demo System Notice</p>
              <p className="opacity-80">This system is for automation demonstration purposes. Orders are simulated and not real. I can customize this logic to fit any business requirement.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onPlaceOrder(formData); }} className="space-y-8">
            <div>
              <h2 className="text-3xl font-black mb-2">Finalize Pickup</h2>
              <p className="text-text-dim">Confirm your details for the automated inventory release.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim block mb-2 pl-1">Authorized User</label>
                <input required type="text" className="input-field font-bold border-slate-200" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim block mb-2 pl-1">Secure Email</label>
                <input readOnly type="email" className="input-field font-mono opacity-80 cursor-not-allowed border-slate-200" style={{ color: '#0f172a', backgroundColor: '#f8fafc' }} value={formData.customerEmail} />
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <span className="text-text-dim font-bold uppercase tracking-widest text-xs">Total Commitment</span>
                <span className="text-4xl font-black text-primary">₱{total.toFixed(2)}</span>
              </div>
              <button
                disabled={status === 'processing'}
                type="submit"
                className="primary-btn w-full justify-center py-5 text-lg"
              >
                {status === 'processing' ? 'Processing...' : 'Authorize Pickup Order'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const AuthModal = ({ onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card w-full max-w-md p-10 relative z-10 border-slate-200 shadow-xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-text-dim hover:text-text-main transition-colors">
          <X size={24} />
        </button>

        <div className="text-center mb-10">
          <h2 className="text-4xl font-black mb-2">{isSignUp ? 'New Account' : 'Welcome Back'}</h2>
          <p className="text-text-dim text-sm">Automation Showcase Secure Infrastructure</p>
        </div>

        {error && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-6 bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">{error}</p>}

        <button
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-black text-sm mb-8 hover:bg-slate-50 transition-all shadow-md shadow-slate-200/50 border border-slate-300"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="relative flex items-center gap-4 mb-8">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="text-text-dim text-[9px] font-black uppercase tracking-[0.3em]">Encrypted Login</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input type="email" placeholder="Email Interface" className="input-field bg-slate-50 border-slate-200" style={{ color: '#0f172a' }} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Passphrase" className="input-field bg-slate-50 border-slate-200" style={{ color: '#0f172a' }} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="primary-btn w-full justify-center py-4">
            {isSignUp ? 'Generate Account' : 'Login'}
          </button>
        </form>

        <p className="text-center text-xs text-text-dim mt-8 font-medium">
          {isSignUp ? 'Already authorized?' : "Need access?"}
          <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-primary font-black hover:underline tracking-tighter">
            {isSignUp ? 'Return to Login' : 'Create Credentials'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default App;
