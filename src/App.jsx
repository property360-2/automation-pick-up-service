import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingCart, User, Package, LogIn, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Main Application Component.
 * Handles top-level routing, global state (auth, cart), and navigation.
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

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('idle');
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  const addToCart = (product) => {
    setCart([...cart, { ...product, cartId: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

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
      <div className="min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="glass-card sticky top-4 z-50 mx-4 mt-4 px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold gradient-text">
            Property360
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="hover:text-blue-400 transition-colors">Inventory</Link>
            {user && <Link to="/status" className="hover:text-blue-400 transition-colors">My Orders</Link>}
            {/* Simple Admin Check: for demo, we check if email is admin. In real app, use Custom Claims */}
            {user?.email?.includes('admin') && <Link to="/admin" className="hover:text-blue-400 transition-colors">Dashboard</Link>}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
                <ShoppingCart size={22} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {cart.length}
                  </span>
                )}
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-72 glass-card p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                <h4 className="font-bold mb-4">Your Cart</h4>
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-400">Empty</p>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
                      {cart.map(item => (
                        <div key={item.cartId} className="flex justify-between text-sm items-center">
                          <span className="truncate flex-1 pr-2">{item.name}</span>
                          <span className="text-blue-400 font-mono">₱{item.price}</span>
                          <button 
                            onClick={() => removeFromCart(item.cartId)}
                            className="ml-2 text-red-400 hover:text-red-300"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between font-bold mb-4">
                      <span>Total</span>
                      <span>₱{cartTotal.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => user ? setIsCheckoutOpen(true) : setIsAuthModalOpen(true)}
                      className="primary-btn w-full justify-center"
                    >
                      {user ? 'Checkout' : 'Sign In to Checkout'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Welcome,</p>
                  <p className="text-sm font-semibold truncate max-w-[120px]">{user.displayName || user.email}</p>
                </div>
                <button onClick={handleSignOut} className="p-2 hover:bg-red-500/10 text-red-400 rounded-full transition-colors">
                  <X size={20} title="Sign Out" />
                </button>
              </div>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="primary-btn hidden md:flex">
                <LogIn size={18} />
                Sign In
              </button>
            )}

            <button 
              className="md:hidden p-2" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
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
            <Route path="/" element={<Home inventory={inventory} loading={loading} addToCart={addToCart} />} />
            <Route path="/status" element={<OrderStatus />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5 text-center text-sm text-gray-500">
          <p>&copy; 2026 Property360 Pickup Service. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

/* --- Page Components --- */

const Home = ({ inventory, loading, addToCart }) => (
  <div className="animate-fade-in">
    <header className="mb-12">
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
        Ready for <span className="gradient-text">Pickup.</span>
      </h1>
      <p className="text-gray-400 text-lg max-w-2xl">
        Browse our real-time inventory and place your order. Fast, secure, and fully automated.
      </p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        // Loading Skeletons
        [1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="aspect-square bg-white/5 rounded-lg mb-4"></div>
            <div className="h-6 bg-white/5 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/5 rounded w-1/2 mb-4"></div>
            <div className="flex justify-between">
              <div className="h-6 bg-white/5 rounded w-1/4"></div>
              <div className="h-8 bg-white/5 rounded w-8"></div>
            </div>
          </div>
        ))
      ) : inventory.length === 0 ? (
        <div className="col-span-full py-20 text-center glass-card">
          <Package size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Our inventory is currently empty or still connecting...</p>
        </div>
      ) : (
        inventory.map((product, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card p-6 group cursor-pointer hover:border-blue-500/30 transition-all flex flex-col"
          >
            <div className="aspect-square bg-white/5 rounded-lg mb-4 overflow-hidden relative">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                  <Package size={48} className="text-blue-400/50" />
                </div>
              )}
              {product.status === 'Out of Stock' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                </div>
              )}
            </div>
            <h3 className="text-xl font-semibold mb-1">{product.name}</h3>
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{product.description || 'High-quality item available for instant pickup.'}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-lg font-bold text-blue-400">₱{product.price}</span>
              <button 
                onClick={() => addToCart(product)}
                disabled={product.status === 'Out of Stock'}
                className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={18} />
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  </div>
);

const OrderStatus = () => (
  <div className="text-center py-20">
    <h2 className="text-3xl font-bold mb-4">No active orders.</h2>
    <p className="text-gray-400 mb-8">Sign in to track your current pickup status.</p>
    <Link to="/" className="primary-btn inline-flex">Go to Inventory</Link>
  </div>
);

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

  if (loading) return <div className="text-center py-20 animate-pulse">Loading orders...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-gray-400">Manage incoming pickup requests.</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-sm font-medium">
          {orders.length} Total Orders
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="glass-card p-20 text-center text-gray-500">
            No orders found in the system.
          </div>
        ) : (
          orders.map((order) => (
            <motion.div 
              key={order.orderId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-blue-400 font-bold">{order.orderId}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    order.status === 'Ready' ? 'bg-green-500/20 text-green-500' :
                    order.status === 'Picked Up' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{order.customerName}</h3>
                <p className="text-sm text-gray-400 mb-2">{order.customerEmail}</p>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, i) => (
                    <span key={i} className="text-[11px] bg-white/5 px-2 py-1 rounded text-gray-300">
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-4 min-w-[200px]">
                <div className="text-right">
                  <p className="text-sm text-gray-500">{new Date(order.timestamp).toLocaleString()}</p>
                  <p className="text-xl font-bold">₱{order.total}</p>
                </div>
                
                <div className="flex gap-2">
                  {order.status === 'Pending' && (
                    <button 
                      disabled={updating === order.orderId}
                      onClick={() => updateStatus(order.orderId, 'Ready', order.customerEmail, order.customerName)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {updating === order.orderId ? '...' : 'Mark Ready'}
                    </button>
                  )}
                  {order.status === 'Ready' && (
                    <button 
                      disabled={updating === order.orderId}
                      onClick={() => updateStatus(order.orderId, 'Picked Up', order.customerEmail, order.customerName)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {updating === order.orderId ? '...' : 'Mark Picked Up'}
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

const CheckoutModal = ({ total, onClose, onPlaceOrder, status }) => {
  const [formData, setFormData] = useState({ customerName: '', customerEmail: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onPlaceOrder(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
            <p className="text-gray-400">Check your email for the confirmation. We'll notify you when it's ready for pickup.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">Complete Checkout</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="Juan Dela Cruz"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input 
                  required
                  type="email"
                  placeholder="juan@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              
              <div className="pt-4 border-t border-white/10 mt-6">
                <div className="flex justify-between font-bold text-xl mb-6">
                  <span>Total Due</span>
                  <span className="text-blue-400">₱{total.toFixed(2)}</span>
                </div>
                <button 
                  disabled={status === 'processing'}
                  type="submit"
                  className="primary-btn w-full justify-center py-4 text-lg"
                >
                  {status === 'processing' ? 'Processing...' : 'Confirm Pickup Order'}
                </button>
              </div>
            </form>
          </>
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-3xl font-bold mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-gray-400 mb-8 text-sm">Join Property360 for faster pickup services.</p>

        {error && <p className="text-red-400 text-xs mb-4 bg-red-500/10 p-2 rounded">{error}</p>}

        <button 
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-lg font-bold mb-6 hover:bg-gray-200 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="relative flex items-center gap-4 mb-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="text-gray-500 text-xs uppercase">or use email</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="primary-btn w-full justify-center py-3">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 text-blue-400 font-bold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Create One'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default App;
