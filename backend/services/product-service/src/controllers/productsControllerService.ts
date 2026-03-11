import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

const VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const sizeParam = req.query.size as string | undefined;
    const colorParam = req.query.color as string | undefined;
    const categoryParam = req.query.category as string | undefined;
    const activeParam = req.query.active as string | undefined;
    const searchParam = req.query.search as string | undefined;

    // Parse multi-value params (comma-separated)
    const sizes = sizeParam ? sizeParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];
    const colors = colorParam ? colorParam.split(',').map(c => c.trim()).filter(Boolean) : [];
    const categories = categoryParam ? categoryParam.split(',').map(c => c.trim()).filter(Boolean) : [];

    // Validate size values if provided
    const invalidSizes = sizes.filter(s => !VALID_SIZES.includes(s));
    if (invalidSizes.length > 0) {
      res.status(400).json({
        error: `Invalid size(s): ${invalidSizes.join(', ')}. Allowed values: ${VALID_SIZES.join(', ')}`,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Default active = true unless explicitly set
    const active = activeParam === 'false' ? false : true;

    // Build where clause
    const where: any = { active };

    // Filter by name (partial, case-insensitive search)
    if (searchParam && searchParam.trim()) {
      where.name = { contains: searchParam.trim(), mode: 'insensitive' };
    }

    // Filter by category name (case-insensitive), supports multiple values
    if (categories.length > 0) {
      where.category = {
        OR: categories.map(cat => ({ name: { equals: cat, mode: 'insensitive' } }))
      };
    }

    // Filter by size/color through variants relation, supports multiple values
    if (sizes.length > 0 || colors.length > 0) {
      const variantFilter: any = {};
      if (sizes.length === 1) {
        variantFilter.size = sizes[0];
      } else if (sizes.length > 1) {
        variantFilter.size = { in: sizes };
      }
      if (colors.length === 1) {
        variantFilter.color = { contains: colors[0], mode: 'insensitive' };
      } else if (colors.length > 1) {
        variantFilter.OR = colors.map(c => ({ color: { contains: c, mode: 'insensitive' } }));
      }
      where.variants = { some: variantFilter };
    }

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variants: true,
          category: true
        }
      })
    ]);

    const mappedProducts = products.map((product: any) => ({
      id: product.id,
      product_code: product.sku,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock_quantity: product.stock,
      category: product.category.name,
      size: product.variants.length > 0 ? product.variants[0].size : null,
      color: product.variants.length > 0 ? product.variants[0].color : null,
      front_image_url: product.imageUrl,
      back_image_url: product.imageAlt,
      active: product.active,
      featured: product.featured,
      created_at: product.createdAt
    }));

    res.status(200).json({
      products: mappedProducts,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      product_code,
      name,
      description,
      price,
      stock_quantity,
      category_name,
      size,
      color,
      front_image_url,
      back_image_url,
      featured
    } = req.body;

    // Validate required fields
    if (!product_code || typeof product_code !== 'string' || product_code.trim() === '') {
      res.status(400).json({
        error: 'product_code is required and must be a non-empty string',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        error: 'name is required and must be a non-empty string',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    if (price === undefined || price === null) {
      res.status(400).json({
        error: 'price is required',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      res.status(400).json({
        error: 'price must be a non-negative number',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    if (!category_name || typeof category_name !== 'string' || category_name.trim() === '') {
      res.status(400).json({
        error: 'category_name is required and must be a non-empty string',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // size is optional, but if provided must be valid
    if (size !== undefined && size !== null) {
      if (typeof size !== 'string') {
        res.status(400).json({
          error: 'size must be a string',
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      if (!VALID_SIZES.includes(size.toUpperCase())) {
        res.status(400).json({
          error: `Invalid size: ${size}. Allowed values: ${VALID_SIZES.join(', ')}`,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }

    if (stock_quantity !== undefined && (typeof stock_quantity !== 'number' || stock_quantity < 0 || !Number.isInteger(stock_quantity))) {
      res.status(400).json({
        error: 'stock_quantity must be a non-negative integer',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Check duplicate SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku: product_code.trim() }
    });

    if (existingProduct) {
      res.status(400).json({
        error: `A product with product_code '${product_code}' already exists`,
        code: 'DUPLICATE_PRODUCT_CODE'
      });
      return;
    }

    // Validate that the category exists
    const category = await prisma.category.findFirst({
      where: { name: { equals: category_name.trim(), mode: 'insensitive' } }
    });

    if (!category) {
      res.status(400).json({
        error: `Category '${category_name}' not found. Please use an existing category.`,
        code: 'CATEGORY_NOT_FOUND'
      });
      return;
    }

    // Build variant data only if size is provided
    const variantData = size
      ? {
        create: {
          size: size.toUpperCase(),
          color: color || null,
          stock: stock_quantity ?? 0,
          sku: `${product_code.trim()}-${size.toUpperCase()}${color ? `-${color}` : ''}`
        }
      }
      : undefined;

    // Create the product
    const product = await prisma.product.create({
      data: {
        sku: product_code.trim(),
        name: name.trim(),
        description: description || null,
        price: price,
        stock: stock_quantity ?? 0,
        categoryId: category.id,
        imageUrl: front_image_url || null,
        imageAlt: back_image_url || null,
        featured: featured ?? false,
        active: true,
        ...(variantData ? { variants: variantData } : {})
      },
      include: {
        variants: true,
        category: true
      }
    });

    const response = {
      id: product.id,
      product_code: product.sku,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock_quantity: product.stock,
      category: product.category.name,
      size: product.variants[0]?.size || null,
      color: product.variants[0]?.color || null,
      front_image_url: product.imageUrl,
      back_image_url: product.imageAlt,
      active: product.active,
      featured: product.featured,
      created_at: product.createdAt
    };

    res.status(201).json(response);

  } catch (error) {
    next(error);
  }
};
