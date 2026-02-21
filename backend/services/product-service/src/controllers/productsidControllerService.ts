import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        error: 'Invalid product ID format. Must be a valid UUID',
        code: 'BAD_REQUEST'
      });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        category: true
      }
    });

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    const response = {
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
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        error: 'Invalid product ID format. Must be a valid UUID',
        code: 'BAD_REQUEST'
      });
      return;
    }

    const {
      name,
      description,
      price,
      stock_quantity,
      category_name,
      color,
      front_image_url,
      back_image_url,
      active,
      featured
    } = req.body;

    // Validate body has at least one field to update
    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({
        error: 'Request body must contain at least one field to update',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Validate price if provided
    if (price !== undefined) {
      if (typeof price !== 'number' || isNaN(price) || price < 0) {
        res.status(400).json({
          error: 'price must be a non-negative number',
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }

    // Validate stock_quantity if provided
    if (stock_quantity !== undefined) {
      if (typeof stock_quantity !== 'number' || stock_quantity < 0 || !Number.isInteger(stock_quantity)) {
        res.status(400).json({
          error: 'stock_quantity must be a non-negative integer',
          code: 'VALIDATION_ERROR'
        });
        return;
      }
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({
        error: 'name must be a non-empty string',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Validate category_name if provided
    if (category_name !== undefined && (typeof category_name !== 'string' || category_name.trim() === '')) {
      res.status(400).json({
        error: 'category_name must be a non-empty string',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true }
    });

    if (!existingProduct) {
      res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    // If category_name provided, validate it exists
    let categoryId: string | undefined;
    if (category_name !== undefined) {
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
      categoryId = category.id;
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (stock_quantity !== undefined) updateData.stock = stock_quantity;
    if (front_image_url !== undefined) updateData.imageUrl = front_image_url;
    if (back_image_url !== undefined) updateData.imageAlt = back_image_url;
    if (active !== undefined) updateData.active = active;
    if (featured !== undefined) updateData.featured = featured;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
        category: true
      }
    });

    // If color was provided, update the first variant
    if (color !== undefined && product.variants.length > 0) {
      await prisma.productVariant.update({
        where: { id: product.variants[0].id },
        data: { color }
      });
    }

    const response = {
      id: product.id,
      product_code: product.sku,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock_quantity: product.stock,
      category: product.category.name,
      size: product.variants.length > 0 ? product.variants[0].size : null,
      color: color !== undefined ? color : (product.variants.length > 0 ? product.variants[0].color : null),
      front_image_url: product.imageUrl,
      back_image_url: product.imageAlt,
      active: product.active,
      featured: product.featured,
      created_at: product.createdAt
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        error: 'Invalid product ID format. Must be a valid UUID',
        code: 'BAD_REQUEST'
      });
      return;
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    // Soft delete: set active = false
    await prisma.product.update({
      where: { id },
      data: { active: false }
    });

    res.status(204).send();

  } catch (error) {
    next(error);
  }
};
