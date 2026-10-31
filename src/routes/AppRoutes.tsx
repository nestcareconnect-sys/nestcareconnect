import React from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { CartDrawer } from '../components/common/CartDrawer';

import { HomePage } from '../pages/HomePage';
import { ShopPage } from '../pages/ShopPage';
import { CategoryPage } from '../pages/CategoryPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { HampersPage } from '../pages/HampersPage';
import { HamperDetailPage } from '../pages/HamperDetailPage';
import { CustomHamperPage } from '../pages/CustomHamperPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderSuccessPage } from '../pages/OrderSuccessPage';
import { OrderTrackingPage } from '../pages/OrderTrackingPage';
import { SpecialMessagePage } from '../pages/SpecialMessagePage';
import { AccountPage } from '../pages/AccountPage';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import {
  AboutPage,
  ContactPage,
  ShippingPolicyPage,
  ReturnsPolicyPage,
  PrivacyPolicyPage,
  TermsPage,
} from '../pages/LegalPages';
import { NotFoundPage } from '../pages/NotFoundPage';

import { AdminLayout } from '../components/admin/AdminLayout';

// Lazy-loaded Admin Pages for maximum performance, minimal bundle size, and instant chunk loading
const AdminDashboardPage = React.lazy(() => import('../pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminProductsPage = React.lazy(() => import('../pages/admin/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })));
const AdminCategoriesPage = React.lazy(() => import('../pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })));
const AdminHampersPage = React.lazy(() => import('../pages/admin/AdminHampersPage').then(m => ({ default: m.AdminHampersPage })));
const AdminBoxesPage = React.lazy(() => import('../pages/admin/AdminBoxesPage').then(m => ({ default: m.AdminBoxesPage })));
const AdminQrCodePage = React.lazy(() => import('../pages/admin/AdminQrCodePage').then(m => ({ default: m.AdminQrCodePage })));
const AdminCustomHamperSettingsPage = React.lazy(() => import('../pages/admin/AdminCustomHamperSettingsPage').then(m => ({ default: m.AdminCustomHamperSettingsPage })));
const AdminOrdersPage = React.lazy(() => import('../pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })));
const AdminCustomersPage = React.lazy(() => import('../pages/admin/AdminCustomersPage').then(m => ({ default: m.AdminCustomersPage })));
const AdminCouponsPage = React.lazy(() => import('../pages/admin/AdminCouponsPage').then(m => ({ default: m.AdminCouponsPage })));
const AdminCurrenciesPage = React.lazy(() => import('../pages/admin/AdminCurrenciesPage').then(m => ({ default: m.AdminCurrenciesPage })));
const AdminShippingPage = React.lazy(() => import('../pages/admin/AdminShippingPage').then(m => ({ default: m.AdminShippingPage })));
const AdminHeroSlidesPage = React.lazy(() => import('../pages/admin/AdminHeroSlidesPage').then(m => ({ default: m.AdminHeroSlidesPage })));
const AdminSettingsPage = React.lazy(() => import('../pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));

const StorefrontLayout: React.FC = () => {
  const location = useLocation();
  const isCheckoutFlow =
    location.pathname === '/checkout' || location.pathname.startsWith('/order-success');

  return (
    <div
      className={`min-h-screen flex flex-col bg-white ${
        isCheckoutFlow
          ? ''
          : 'pb-[calc(68px+env(safe-area-inset-bottom,0px))] lg:pb-0'
      }`}
    >
      <Navbar />
      <CartDrawer />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Standalone QR video & message landing page */}
      <Route path="/special-message/:token" element={<SpecialMessagePage />} />

      {/* Public Storefront Layout */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/hampers" element={<HampersPage />} />
        <Route path="/hampers/:slug" element={<HamperDetailPage />} />
        <Route path="/custom-hamper" element={<CustomHamperPage />} />
        <Route path="/build-hamper" element={<CustomHamperPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
        <Route path="/order-tracking" element={<OrderTrackingPage />} />
        <Route path="/track" element={<OrderTrackingPage />} />
        <Route path="/tracking" element={<OrderTrackingPage />} />
        <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/create-account" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
        <Route path="/returns-policy" element={<ReturnsPolicyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin Panel Layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="hampers" element={<AdminHampersPage />} />
        <Route path="boxes" element={<AdminBoxesPage />} />
        <Route path="qr-codes" element={<AdminQrCodePage />} />
        <Route path="qr-code" element={<AdminQrCodePage />} />
        <Route path="custom-hampers" element={<AdminCustomHamperSettingsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="currencies" element={<AdminCurrenciesPage />} />
        <Route path="shipping" element={<AdminShippingPage />} />
        <Route path="hero-slides" element={<AdminHeroSlidesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
};
