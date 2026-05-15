import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * LegalPages Component
 * Purpose: Provides sleek, glassmorphic layouts for Privacy and Terms pages.
 */

const LegalWrapper = ({ title, icon: Icon, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto py-12"
    >
      <Link to="/" className="inline-flex items-center gap-2 text-text-dim hover:text-primary transition-all mb-8 font-bold no-underline group">
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        RETURN TO MARKETPLACE
      </Link>

      <div className="glass-card p-8 md:p-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Icon size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">{title}</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-text-dim leading-relaxed">
          {children}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-text-dim italic">
          Last updated: May 15, 2026 • Automation Showcase System Demo
        </div>
      </div>
    </motion.div>
  );
};

export const PrivacyPolicy = () => (
  <LegalWrapper title="Privacy Policy" icon={Shield}>
    <section>
      <h2 className="text-xl font-bold text-text-main mb-2">1. Demo Automation Context</h2>
      <p>This application is a proof-of-concept for automated inventory and pickup services. Any data entered, including names and email addresses, is used solely for the simulation of order fulfillment and email receipt automation.</p>
    </section>
    
    <section>
      <h2 className="text-xl font-bold text-text-main mb-2">2. Data Handling</h2>
      <p>Your data is processed through Firebase Authentication and Google Sheets API for the purpose of demonstrating real-time inventory synchronization. We do not sell or share this data with third parties beyond the scope of this automation demo.</p>
    </section>

    <section>
      <h2 className="text-xl font-bold text-text-main mb-2">3. Business Requirements</h2>
      <p>This system is highly flexible. I can implement end-to-end encryption, strict GDPR compliance, and enterprise-grade data retention policies based on specific business needs.</p>
    </section>
  </LegalWrapper>
);

export const TermsConditions = () => (
  <LegalWrapper title="Terms & Conditions" icon={FileText}>
    <section>
      <h2 className="text-xl font-bold text-text-main mb-2">1. Simulated Transactions</h2>
      <p>By using this portal, you acknowledge that all "orders" placed are simulated. No actual payments are processed, and no physical property will be released based on these digital logs alone.</p>
    </section>
    
    <section>
      <h2 className="text-xl font-bold text-text-main mb-2">2. System Capability</h2>
      <p>This UI/UX and the underlying logic are designed to be scalable. Whether you need a simple pickup system or a complex multi-warehouse inventory management tool, the architecture can be adapted to your workflow.</p>
    </section>

    <section>
      <h2 className="text-xl font-bold text-text-main mb-2">3. Intellectual Property</h2>
      <p>The design system, custom animations, and automation scripts are part of the Automation Showcase platform demo. Custom builds for private business use can be negotiated for exclusive licensing.</p>
    </section>
  </LegalWrapper>
);
