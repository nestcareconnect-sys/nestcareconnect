import prisma from '../config/prisma.js';

export class InventoryService {
  /**
   * Deduct inventory for all items in an order
   */
  async deductOrderInventory(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) return;

    for (const item of order.items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      } else if (item.itemType === 'HAMPER' && item.hamperId) {
        // Deduct hamper stock
        await prisma.hamper.update({
          where: { id: item.hamperId },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        // Also deduct underlying hamper products if linked
        const hamper = await prisma.hamper.findUnique({
          where: { id: item.hamperId },
          include: { items: true },
        });

        if (hamper && hamper.items) {
          for (const hItem of hamper.items) {
            await prisma.product.update({
              where: { id: hItem.productId },
              data: {
                stock: { decrement: hItem.quantity * item.quantity },
              },
            });
          }
        }
      } else if (item.itemType === 'CUSTOM_HAMPER') {
        // Deduct box stock
        const boxId = (item.snapshot as any)?.box?.id;
        if (boxId) {
          try {
            await prisma.hamperBox.update({
              where: { id: boxId },
              data: {
                stock: { decrement: item.quantity },
              },
            });
          } catch (e) {
            console.error('Failed to decrement box stock:', e);
          }
        }

        // Deduct each individual product inside custom hamper
        if ((item.snapshot as any)?.breakdown) {
          for (const subItem of (item.snapshot as any).breakdown) {
            if (subItem.productId) {
              await prisma.product.update({
                where: { id: subItem.productId },
                data: {
                  stock: { decrement: (subItem.quantity || 1) * item.quantity },
                },
              });
            }
          }
        }
      }
    }
  }

  /**
   * Restore inventory on order cancellation / refund
   */
  async restoreOrderInventory(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;

    for (const item of order.items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      } else if (item.itemType === 'HAMPER' && item.hamperId) {
        await prisma.hamper.update({
          where: { id: item.hamperId },
          data: {
            stock: { increment: item.quantity },
          },
        });

        const hamper = await prisma.hamper.findUnique({
          where: { id: item.hamperId },
          include: { items: true },
        });

        if (hamper && hamper.items) {
          for (const hItem of hamper.items) {
            await prisma.product.update({
              where: { id: hItem.productId },
              data: {
                stock: { increment: hItem.quantity * item.quantity },
              },
            });
          }
        }
      } else if (item.itemType === 'CUSTOM_HAMPER') {
        // Restore box stock
        const boxId = (item.snapshot as any)?.box?.id;
        if (boxId) {
          try {
            await prisma.hamperBox.update({
              where: { id: boxId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          } catch (e) {
            console.error('Failed to increment box stock:', e);
          }
        }

        if ((item.snapshot as any)?.breakdown) {
          for (const subItem of (item.snapshot as any).breakdown) {
            if (subItem.productId) {
              await prisma.product.update({
                where: { id: subItem.productId },
                data: {
                  stock: { increment: (subItem.quantity || 1) * item.quantity },
                },
              });
            }
          }
        }
      }
    }
  }
}

export const inventoryService = new InventoryService();
