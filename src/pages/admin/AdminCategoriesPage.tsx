import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Category, CategoryType } from '../../types';
import { categoriesApi, uploadApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { INITIAL_CATEGORIES } from '@/constants';
import {
  CategoryIcon,
  CategoryIconBadge,
  POPULAR_CATEGORY_ICONS,
} from '../../components/admin/CategoryIcon';

// Helper to determine type badge appearance
const getTypeBadgeInfo = (type?: CategoryType | string) => {
  switch (type) {
    case 'CARE':
      return {
        label: 'CARE',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      };
    case 'RECIPIENT':
      return {
        label: 'RECIPIENT',
        className: 'bg-blue-50 text-blue-700 border-blue-200/80',
      };
    case 'OCCASION':
      return {
        label: 'OCCASION',
        className: 'bg-purple-50 text-purple-700 border-purple-200/80',
      };
    case 'GIFT':
      return {
        label: 'GIFT',
        className: 'bg-amber-50 text-amber-700 border-amber-200/80',
      };
    case 'ADD_ON':
      return {
        label: 'ADD-ON',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      };
    default:
      return {
        label: type || 'GENERAL',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      };
  }
};

export const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: 'Activity',
    type: 'CARE' as CategoryType,
    parentCategoryId: '',
    sortOrder: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const flattenTree = (cats: Category[]): Category[] => {
    const list: Category[] = [];
    cats.forEach((c) => {
      list.push(c);
      if (c.children && c.children.length > 0) {
        list.push(...flattenTree(c.children));
      }
    });
    return list;
  };

  const loadCategories = () => {
    setIsLoading(true);
    categoriesApi
      .getTree(true)
      .then((res) => {
        if (res.data?.success && res.data.data && res.data.data.length > 0) {
          setCategoriesTree(res.data.data);
          setFlatCategories(flattenTree(res.data.data));
        } else {
          setCategoriesTree(INITIAL_CATEGORIES as any);
          setFlatCategories(flattenTree(INITIAL_CATEGORIES as any));
        }
      })
      .catch(() => {
        setCategoriesTree(INITIAL_CATEGORIES as any);
        setFlatCategories(flattenTree(INITIAL_CATEGORIES as any));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleToggleNode = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    setCollapsedNodes({});
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    flatCategories.forEach((c) => {
      if (c.children && c.children.length > 0) {
        allCollapsed[c.id] = true;
      }
    });
    setCollapsedNodes(allCollapsed);
  };

  const handleOpenAdd = (parentId?: string) => {
    setEditingCategoryId(null);
    const parent = parentId ? flatCategories.find((c) => c.id === parentId) : null;

    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
      icon: parent ? parent.icon || 'Heart' : 'Activity',
      type: parent ? parent.type || 'CARE' : 'CARE',
      parentCategoryId: parentId || '',
      sortOrder: flatCategories.length + 1,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      icon: cat.icon || 'Activity',
      type: cat.type || 'CARE',
      parentCategoryId: cat.parentCategoryId || '',
      sortOrder: cat.sortOrder || 0,
      status: (cat.status as any) || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (newName: string) => {
    setFormData((prev) => {
      // Auto-generate slug if it's empty or closely matches previous name
      const autoSlug = newName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return {
        ...prev,
        name: newName,
        slug: !editingCategoryId || !prev.slug ? autoSlug : prev.slug,
      };
    });
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await categoriesApi.delete(categoryToDelete.id);
      showToast(`Category "${categoryToDelete.name}" deleted successfully.`, 'info');
      setCategoryToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      await queryClient.invalidateQueries({ queryKey: ['category-products'] });
      loadCategories();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Could not delete category. Ensure no products/subcategories are attached.',
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }

    const cleanSlug = (formData.slug || formData.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const payload = {
      ...formData,
      name: formData.name.trim(),
      slug: cleanSlug,
      parentCategoryId: formData.parentCategoryId || null,
      description: formData.description.trim() || null,
      image: formData.image.trim() || null,
      icon: formData.icon.trim() || null,
    };

    setIsSaving(true);
    try {
      if (editingCategoryId) {
        await categoriesApi.update(editingCategoryId, payload);
        showToast('Category updated successfully.', 'success');
      } else {
        await categoriesApi.create(payload);
        showToast('Category created successfully.', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      await queryClient.invalidateQueries({ queryKey: ['category-products'] });
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save category.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter categories by search & type
  const filterCategory = (cat: Category): boolean => {
    const matchesSearch =
      !searchQuery.trim() ||
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || cat.type === typeFilter;

    // Check if any child matches
    const hasMatchingChild =
      cat.children && cat.children.length > 0 && cat.children.some((child) => filterCategory(child));

    return (matchesSearch && matchesType) || Boolean(hasMatchingChild);
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim() && typeFilter === 'ALL') {
      return categoriesTree;
    }
    return categoriesTree.filter((root) => filterCategory(root));
  }, [categoriesTree, searchQuery, typeFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = flatCategories.length;
    const roots = categoriesTree.length;
    const subcats = total - roots;
    return { total, roots, subcats };
  }, [flatCategories, categoriesTree]);

  // Recursive Category Node Renderer
  const renderCategoryNode = (cat: Category, depth = 0) => {
    const hasChildren = Boolean(cat.children && cat.children.length > 0);
    const isCollapsed = Boolean(collapsedNodes[cat.id]);
    const badge = getTypeBadgeInfo(cat.type);
    const isRoot = depth === 0;
    const isChild = depth === 1;

    return (
      <div key={cat.id} className="space-y-2.5">
        <div
          className={`group relative rounded-2xl border transition-all duration-200 ${
            isRoot
              ? 'bg-white border-gray-200/90 shadow-xs hover:border-[#8BCF9B] hover:shadow-md min-h-[86px] p-4 sm:p-5'
              : isChild
              ? 'bg-[#F9FBFA] border-gray-200/80 hover:bg-white hover:border-[#8BCF9B]/80 hover:shadow-xs ml-4 sm:ml-9 p-3.5 sm:p-4'
              : 'bg-white/90 border-gray-200/70 hover:border-gray-300 ml-8 sm:ml-16 p-3'
          }`}
        >
          {/* Hierarchy Connector Guide for Subcategories */}
          {!isRoot && (
            <div
              className="absolute -left-4 sm:-left-6 top-1/2 w-4 sm:w-6 h-px bg-gray-300 pointer-events-none"
              aria-hidden="true"
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Left Section: Expand Toggle, Icon, Name, Badge, Slug */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {/* Expand / Collapse Chevron */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => handleToggleNode(cat.id)}
                  className="p-1 -ml-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                  aria-label={isCollapsed ? `Expand ${cat.name}` : `Collapse ${cat.name}`}
                  title={isCollapsed ? 'Expand subcategories' : 'Collapse subcategories'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#237A3B]" />
                  )}
                </button>
              ) : (
                <div className="w-4 shrink-0" aria-hidden="true" />
              )}

              {/* Dedicated Icon Container */}
              <CategoryIconBadge
                icon={cat.icon}
                variant={isRoot ? 'root' : isChild ? 'child' : 'subchild'}
              />

              {/* Category Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`font-bold text-gray-900 tracking-tight truncate ${
                      isRoot ? 'text-base sm:text-lg' : isChild ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                    }`}
                  >
                    {cat.name}
                  </h3>

                  {/* Category Type Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>

                  {/* Status Indicator */}
                  {cat.status === 'INACTIVE' && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                      Inactive
                    </span>
                  )}

                  {/* Subcategories count badge */}
                  {hasChildren && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200/60">
                      <FolderTree className="w-3 h-3 text-[#237A3B]" />
                      {cat.children!.length} subcategories
                    </span>
                  )}
                </div>

                {/* Slug & Optional Description */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs text-gray-500 font-mono">
                    /category/{cat.slug}
                  </span>
                  {cat.description && (
                    <>
                      <span className="text-gray-300 hidden sm:inline">•</span>
                      <span className="text-[11px] text-gray-400 truncate max-w-md hidden sm:inline">
                        {cat.description}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section: Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 w-full sm:w-auto justify-end">
              {/* Add Subcategory Button */}
              <button
                type="button"
                onClick={() => handleOpenAdd(cat.id)}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-[#F1FAF3] hover:bg-[#E3F5E7] text-[#237A3B] border border-[#8BCF9B]/50 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#237A3B]"
                aria-label={`Add subcategory to ${cat.name}`}
                title="Add Subcategory"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Subcategory</span>
              </button>

              {/* Edit Category Button */}
              <button
                type="button"
                onClick={() => handleOpenEdit(cat)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-[#237A3B] hover:bg-[#F1FAF3] rounded-xl border border-transparent hover:border-[#8BCF9B]/30 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#237A3B]"
                aria-label={`Edit category ${cat.name}`}
                title="Edit category"
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Delete Category Button */}
              <button
                type="button"
                onClick={() => setCategoryToDelete(cat)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label={`Delete category ${cat.name}`}
                title="Delete category"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Render Child Subcategories */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-2.5 relative">
            {/* Hierarchy vertical line guide */}
            <div
              className={`absolute left-2 sm:left-4 top-0 bottom-3 w-px bg-gray-200 pointer-events-none ${
                isRoot ? 'sm:left-5' : ''
              }`}
              aria-hidden="true"
            />
            {cat.children!.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SEO title="Dynamic Categories & Occasions | Admin Dashboard" />

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/60 text-[#237A3B] flex items-center justify-center">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Dynamic Categories & Occasions
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Manage customer navigation categories (Medical Care, For Mum, For Dad, Wedding, Anniversary, New Mum & Baby, Celebrations, Build Your Own).
                  </p>
                </div>
              </div>

              {/* Stats Summary Pills */}
              <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-[#237A3B]" />
                  Total: <strong>{stats.total}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#F1FAF3] text-[#237A3B] border border-[#8BCF9B]/40">
                  Root Categories: <strong>{stats.roots}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                  Subcategories: <strong>{stats.subcats}</strong>
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#237A3B]"
                aria-label="Add Root Category"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Root Category</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter, Search & Tree Controls Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories by name, slug..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 outline-none focus:border-[#8BCF9B] focus:ring-2 focus:ring-[#237A3B]/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Type Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['ALL', 'CARE', 'RECIPIENT', 'OCCASION', 'GIFT', 'ADD_ON'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer ${
                    typeFilter === t
                      ? 'bg-[#237A3B] text-white shadow-2xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Tree View Controls */}
          <div className="flex items-center gap-2 justify-end shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Categories Tree View / Loading / Empty State */}
        {isLoading ? (
          /* Loading Skeletons */
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-gray-200 animate-pulse flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gray-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-28 bg-gray-100 rounded-xl" />
                  <div className="h-8 w-8 bg-gray-100 rounded-xl" />
                  <div className="h-8 w-8 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTree.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4 max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#F1FAF3] border border-[#8BCF9B]/50 text-[#237A3B] flex items-center justify-center mx-auto">
              <FolderTree className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {searchQuery || typeFilter !== 'ALL' ? 'No matching categories found' : 'No categories yet'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery || typeFilter !== 'ALL'
                  ? 'Try adjusting your search query or type filter to find categories.'
                  : 'Create your first customer navigation category to get started.'}
              </p>
            </div>
            {searchQuery || typeFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('ALL');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="px-5 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Root Category</span>
              </button>
            )}
          </div>
        ) : (
          /* Category Tree List */
          <div className="space-y-3.5">
            {filteredTree.map((rootCat) => renderCategoryNode(rootCat, 0))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Category?</h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-gray-900 font-bold">"{categoryToDelete.name}"</strong>?
                </p>
                <p className="text-[11px] text-red-500 mt-1">
                  This will remove the category and may affect its subcategories and associated products.
                </p>
              </div>

              {categoryToDelete.children && categoryToDelete.children.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    This category has {categoryToDelete.children.length} subcategories. You must reassign or delete its child categories first.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#237A3B] to-[#1c6330] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <FolderTree className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {editingCategoryId ? 'Edit Category' : 'Create New Category'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Configure customer navigation hierarchy and appearance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs sm:text-sm">
              {/* Category Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Medical Care"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] focus:ring-2 focus:ring-[#237A3B]/10 font-medium text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Slug (URL path) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="medical-care"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] font-mono text-xs text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {/* Category Type & Parent Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value as CategoryType }))
                    }
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] font-medium text-gray-800"
                  >
                    <option value="CARE">Care (Medical, Clinical & Mobility)</option>
                    <option value="RECIPIENT">Recipient (Mum, Dad, Elders)</option>
                    <option value="OCCASION">Occasion (Wedding, Anniversary, Celebrations)</option>
                    <option value="GIFT">Gift & Lifestyle</option>
                    <option value="ADD_ON">Add-On Component</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Parent Category</label>
                  <select
                    value={formData.parentCategoryId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, parentCategoryId: e.target.value }))
                    }
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] font-medium text-gray-800"
                  >
                    <option value="">None (Top-Level Root Category)</option>
                    {flatCategories
                      .filter((c) => c.id !== editingCategoryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parentCategoryId ? '— ' : ''}
                          {c.name} ({c.type || 'CARE'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Icon Selector Section */}
              <div className="space-y-2">
                <label className="block font-semibold text-gray-700">
                  Category Icon & Live Preview
                </label>

                {/* Selected Preview Box + Custom Input */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                  {/* Live Icon Badge Preview */}
                  <CategoryIconBadge icon={formData.icon} variant="root" />

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                      placeholder="Icon name (e.g. Activity, Heart) or Emoji (e.g. 🩺)"
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#8BCF9B] font-medium"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Choose from quick icons below or type any Lucide icon name / emoji.
                    </span>
                  </div>
                </div>

                {/* Popular Quick Icons Picker */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                  {POPULAR_CATEGORY_ICONS.map((item) => {
                    const isSelected =
                      formData.icon.toLowerCase() === item.name.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, icon: item.name }))}
                        title={`${item.name} (${item.label})`}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F1FAF3] border-[#237A3B] text-[#237A3B] shadow-2xs scale-105'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <CategoryIcon icon={item.name} size="sm" />
                        <span className="text-[9px] font-semibold truncate w-full text-center">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image URL & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                      }
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as 'ACTIVE' | 'INACTIVE',
                        }))
                      }
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs font-semibold"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief summary of items in this category (for navigation tooltips and SEO)..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8BCF9B] text-xs leading-relaxed"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#237A3B] hover:bg-[#1c6330] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSaving ? 'Saving Category...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
