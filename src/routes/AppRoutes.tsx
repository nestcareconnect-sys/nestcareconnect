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
import {
  AboutPage,
  ContactPage,
  ShippingPolicyPage,
  ReturnsPolicyPage,
  PrivacyPolicyPage,
  TermsPage,
} from '../pages/LegalPages';
import { NotFoundPage } from '../pages/NotFoundPage';

// Admin Pages
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { AdminHampersPage } from '../pages/admin/AdminHampersPage';
import { AdminBoxesPage } from '../pages/admin/AdminBoxesPage';
import { AdminCustomHamperSettingsPage } from '../pages/admin/AdminCustomHamperSettingsPage';
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage';
import { AdminCouponsPage } from '../pages/admin/AdminCouponsPage';
import { AdminCurrenciesPage } from '../pages/admin/AdminCurrenciesPage';
import { AdminShippingPage } from '../pages/admin/AdminShippingPage';
import { AdminHeroSlidesPage } from '../pages/admin/AdminHeroSlidesPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';

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
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
