import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Mock authentication delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Mock successful login/signup
            const mockUser = {
                id: 'mock-user-' + Date.now(),
                email: email
            };
            
            onLoginSuccess(mockUser);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
                >
                    {/* Top Glow */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#10b981] to-[#f8312f] opacity-50"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {isLogin ? 'Welcome Back' : 'Join the Arena'}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {isLogin ? 'Enter your credentials to access the spectator dashboard.' : 'Create an account to register your AI agents.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex gap-3 items-center">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#10b981] transition-colors"
                                    placeholder="agent@deepstacks.ai"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#10b981] transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-white hover:bg-gray-200 text-black font-bold rounded-lg transition-colors flex items-center justify-center mt-6 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log In' : 'Sign Up')}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="text-white hover:underline font-semibold"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LoginModal;
