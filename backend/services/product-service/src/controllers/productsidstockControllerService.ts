import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const checkStock = async (req: Request, res: Response, next: NextFunction) => {
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
        variants: true
      }
    });

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    // Calculate available stock from variants
    const variantStock = product.variants.reduce((sum: number, v: { stock: number }) => sum + v.stock, 0);
    const totalStock = product.stock > 0 ? product.stock : variantStock;

    const response = {
      product_id: product.id,
      stock_quantity: product.stock,
      available_stock: totalStock,
      in_stock: totalStock > 0 && product.active
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};