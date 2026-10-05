import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export async function getCategoryTree(req: Request, res: Response) {
  try {
    const { includeInactive } = req.query;

    const categories = await prisma.category.findMany({
      where: includeInactive === 'true' ? {} : { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    // Build hierarchical tree
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    categories.forEach((cat: any) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat: any) => {
      const node = categoryMap.get(cat.id);
      if (cat.parentCategoryId && categoryMap.has(cat.parentCategoryId)) {
        categoryMap.get(cat.parentCategoryId).children.push(node);
      } else {
        rootCategories.push(node);
      }
    });

    return res.json({ success: true, data: rootCategories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCategoryBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
        children: {
          where: { status: 'ACTIVE' },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { products: true } },
          },
        },
        products: {
          where: { status: 'ACTIVE' },
          include: {
            countryPrices: true,
          },
        },
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, slug, description, image, icon, type, parentCategoryId, sortOrder, status, seoTitle, seoDescription } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Category name and slug are required.' });
    }

    const formattedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const existing = await prisma.category.findUnique({ where: { slug: formattedSlug } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A category with this slug already exists.' });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: formattedSlug,
        description,
        image,
        icon: icon || null,
        type: type || null,
        parentCategoryId: parentCategoryId || null,
        sortOrder: sortOrder || 0,
        status: status || 'ACTIVE',
        seoTitle,
        seoDescription,
      },
    });

    return res.status(201).json({ success: true, message: 'Category created successfully.', data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, slug, description, image, icon, type, parentCategoryId, sortOrder, status, seoTitle, seoDescription } = req.body;

    const formattedSlug = slug ? slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') : undefined;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        slug: formattedSlug,
        description,
        image,
        icon: icon !== undefined ? icon : undefined,
        type: type !== undefined ? type : undefined,
        parentCategoryId: parentCategoryId === undefined ? undefined : parentCategoryId || null,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        status: status || undefined,
        seoTitle,
        seoDescription,
      },
    });

    return res.json({ success: true, message: 'Category updated successfully.', data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if has children or products
    const childrenCount = await prisma.category.count({ where: { parentCategoryId: id } });
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active subcategories. Please reassign or delete subcategories first.',
      });
    }

    await prisma.category.delete({ where: { id } });
    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
