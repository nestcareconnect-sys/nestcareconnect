import { Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { pricingService } from '../services/pricing.service.js';
import { CountryCode, CurrencyCode, ItemType } from '@prisma/client';

/**
 * Helper to fetch, calculate pricing, and enrich cart items in a single pass
 */
async function fetchEnrichedCart(
  cartId: string,
  country: CountryCode = 'IN',
  currency: CurrencyCode = 'INR',
  couponCode?: string
) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: true,
    },
  });

  if (!cart || cart.items.length === 0) {
    return {
      id: cart?.id,
      items: [],
      itemCount: 0,
      subtotal: 0,
      discount: 0,
      shippingFee: 0,
      tax: 0,
      total: 0,
      currency,
      country,
    };
  }

  // Sort cart items deterministically by creation date
  const sortedItems = [...cart.items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Format items for pricing calculation
  const formattedItems = sortedItems.map((itm: any) => ({
    itemType: itm.itemType as any,
    productId: itm.productId || undefined,
    hamperId: itm.hamperId || undefined,
    customHamperData: itm.customHamperData,
    personalization: itm.personalization || itm.customHamperData?.personalization,
    quantity: itm.quantity,
  }));

  const calculation = await pricingService.calculateCartTotals({
    items: formattedItems,
    country,
    currency,
    couponCode,
  });

  // Merge cart item database IDs with calculated item breakdown
  const enrichedItems = calculation.items.map((calcItem: any, idx: number) => ({
    ...calcItem,
    id: sortedItems[idx]?.id || `item-${idx}`,
    cartItemId: sortedItems[idx]?.id,
    personalization:
      sortedItems[idx]?.personalization ||
      sortedItems[idx]?.customHamperData?.personalization ||
      calcItem.personalization ||
      calcItem.snapshot?.personalization ||
      null,
    isOptimistic: false,
  }));

  const itemCount = enrichedItems.reduce((acc: number, itm: any) => acc + (itm.quantity || 1), 0);

  return {
    id: cart.id,
    items: enrichedItems,
    itemCount,
    subtotal: calculation.subtotal,
    discount: calculation.discount,
    shippingFee: calculation.shippingFee,
    tax: calculation.tax,
    total: calculation.total,
    currency,
    country,
    couponApplied: calculation.couponApplied,
  };
}

export async function getCart(req: AuthRequest, res: Response) {
  try {
    const { guestId, country = 'IN', currency = 'INR', couponCode } = req.query;
    const userId = req.user?.id;

    if (!userId && !guestId) {
      return res.json({
        success: true,
        data: {
          items: [],
          itemCount: 0,
          subtotal: 0,
          discount: 0,
          shippingFee: 0,
          tax: 0,
          total: 0,
          currency,
          country,
        },
      });
    }

    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { guestId: guestId as string },
    });

    if (!cart) {
      return res.json({
        success: true,
        data: {
          items: [],
          itemCount: 0,
          subtotal: 0,
          discount: 0,
          shippingFee: 0,
          tax: 0,
          total: 0,
          currency,
          country,
        },
      });
    }

    const enrichedCart = await fetchEnrichedCart(
      cart.id,
      country as CountryCode,
      currency as CurrencyCode,
      couponCode as string | undefined
    );

    return res.json({
      success: true,
      data: enrichedCart,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function addToCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const {
      guestId,
      itemType,
      productId,
      hamperId,
      customHamperData,
      personalization,
      quantity = 1,
      country = 'IN',
      currency = 'INR',
      couponCode,
    } = req.body;

    if (!userId && !guestId) {
      return res.status(400).json({ success: false, message: 'User or Guest ID is required.' });
    }

    const qty = Math.max(1, parseInt(quantity, 10));

    // Server-side stock & status validation
    if (itemType === 'PRODUCT' && productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, stock: true, status: true },
      });

      if (!product || product.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Product is currently unavailable.' });
      }

      if (product.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: `Sorry, "${product.name}" is currently out of stock.`,
        });
      }
    } else if (itemType === 'HAMPER' && hamperId) {
      const hamper = await prisma.hamper.findUnique({
        where: { id: hamperId },
        select: { id: true, name: true, stock: true, status: true },
      });

      if (!hamper || hamper.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Hamper is currently unavailable.' });
      }

      if (hamper.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: `Sorry, "${hamper.name}" is currently out of stock.`,
        });
      }
    }

    let cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { guestId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId || null,
          guestId: userId ? null : guestId,
        },
      });
    }

    if (itemType === 'PRODUCT' && productId) {
      const existingItem = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId, itemType: 'PRODUCT' },
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + qty },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            itemType: ItemType.PRODUCT,
            productId,
            quantity: qty,
          },
        });
      }
    } else if (itemType === 'HAMPER' && hamperId) {
      const cleanPersonalization = personalization || (customHamperData?.personalization ?? null);
      const targetPersonalizationStr = JSON.stringify(cleanPersonalization || {});

      const existingItems = await prisma.cartItem.findMany({
        where: { cartId: cart.id, hamperId, itemType: 'HAMPER' },
      });

      const matchingItem = existingItems.find((itm: any) => {
        const itemPersStr = JSON.stringify(itm.personalization || (itm.customHamperData as any)?.personalization || {});
        return itemPersStr === targetPersonalizationStr;
      });

      if (matchingItem) {
        await prisma.cartItem.update({
          where: { id: matchingItem.id },
          data: { quantity: matchingItem.quantity + qty },
        });
      } else {
        const newCartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            itemType: ItemType.HAMPER,
            hamperId,
            personalization: cleanPersonalization ? cleanPersonalization : undefined,
            customHamperData: cleanPersonalization ? { personalization: cleanPersonalization } : undefined,
            quantity: qty,
          },
        });

        // Record HamperPersonalizationPhoto entries if photos were provided
        const photoUrls: string[] = cleanPersonalization?.photos || cleanPersonalization?.attachedPhotos || [];
        if (Array.isArray(photoUrls) && photoUrls.length > 0) {
          try {
            await prisma.hamperPersonalizationPhoto.createMany({
              data: photoUrls.map((url, sIdx) => ({
                cartItemId: newCartItem.id,
                hamperId,
                url,
                sortOrder: sIdx,
              })),
            });
          } catch (photoErr) {
            console.warn('HamperPersonalizationPhoto create warning:', photoErr);
          }
        }
      }
    } else if (itemType === 'CUSTOM_HAMPER') {
      if (!customHamperData || (!customHamperData.boxId && !customHamperData.boxType)) {
        return res.status(400).json({
          success: false,
          message: 'Please select a hamper box before continuing.',
        });
      }

      if (!customHamperData.items || !Array.isArray(customHamperData.items) || customHamperData.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least one product for your customized hamper.',
        });
      }

      const boxId = customHamperData.boxId || customHamperData.boxType;
      const box = await prisma.hamperBox.findFirst({
        where: {
          OR: [{ id: boxId }, { slug: boxId }],
        },
      });

      if (!box || box.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'The selected hamper box is invalid or currently unavailable.',
        });
      }

      if (box.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: `The selected box '${box.name}' is currently out of stock.`,
        });
      }

      const totalItems = customHamperData.items.reduce((acc: number, itm: any) => acc + (itm.quantity || 1), 0);
      if (totalItems > box.capacity) {
        return res.status(400).json({
          success: false,
          message: `The selected box '${box.name}' cannot hold ${totalItems} items (maximum capacity: ${box.capacity}). Please select a larger box.`,
        });
      }

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          itemType: ItemType.CUSTOM_HAMPER,
          customHamperData: {
            ...customHamperData,
            boxId: box.id,
          },
          quantity: qty,
        },
      });
    }

    // Return the updated cart directly in the response so no second GET request is required!
    const updatedCart = await fetchEnrichedCart(
      cart.id,
      country as CountryCode,
      currency as CurrencyCode,
      couponCode
    );

    return res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      data: updatedCart,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCartItemQuantity(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { quantity, country = 'IN', currency = 'INR', couponCode } = req.body;

    if (!id || id.startsWith('opt-')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a temporary optimistic cart item. Please allow cart to synchronize.',
      });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id },
      select: { id: true, cartId: true, productId: true },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      await prisma.cartItem.delete({ where: { id } });
    } else {
      await prisma.cartItem.update({
        where: { id },
        data: { quantity: qty },
      });
    }

    const updatedCart = await fetchEnrichedCart(
      item.cartId,
      country as CountryCode,
      currency as CurrencyCode,
      couponCode
    );

    return res.json({
      success: true,
      message: qty <= 0 ? 'Item removed from cart.' : 'Quantity updated.',
      data: updatedCart,
    });
  } catch (error: any) {
    console.error('[UPDATE_CART_ITEM_ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function removeCartItem(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { country = 'IN', currency = 'INR', couponCode } = req.query;

    if (!id || id.startsWith('opt-')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove a temporary optimistic cart item. Please allow cart to synchronize.',
      });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id },
      select: { id: true, cartId: true },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    await prisma.cartItem.delete({ where: { id } });

    const updatedCart = await fetchEnrichedCart(
      item.cartId,
      (country as CountryCode) || 'IN',
      (currency as CurrencyCode) || 'INR',
      couponCode as string | undefined
    );

    return res.json({
      success: true,
      message: 'Item removed from cart.',
      data: updatedCart,
    });
  } catch (error: any) {
    console.error('[REMOVE_CART_ITEM_ERROR]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function clearCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { guestId, country = 'IN', currency = 'INR' } = req.body;

    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { guestId },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return res.json({
      success: true,
      message: 'Cart cleared.',
      data: {
        id: cart?.id,
        items: [],
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        shippingFee: 0,
        tax: 0,
        total: 0,
        currency: currency as CurrencyCode,
        country: country as CountryCode,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function mergeGuestCart(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { guestId } = req.body;

    if (!userId || !guestId) {
      return res.status(400).json({ success: false, message: 'User ID and Guest ID required.' });
    }

    const guestCart = await prisma.cart.findFirst({
      where: { guestId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ success: true, message: 'No guest items to merge.' });
    }

    let userCart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({ data: { userId } });
    }

    for (const item of guestCart.items) {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          itemType: item.itemType,
          productId: item.productId,
          hamperId: item.hamperId,
          customHamperData: item.customHamperData ? (item.customHamperData as any) : undefined,
          quantity: item.quantity,
        },
      });
    }

    // Delete guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } });

    return res.json({ success: true, message: 'Guest cart merged successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
