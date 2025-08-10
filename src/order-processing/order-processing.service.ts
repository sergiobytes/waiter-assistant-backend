import { Injectable, Logger } from '@nestjs/common';
import { OrderType } from '../common/enums/order-type.enum';
import { OrdersService } from '../orders/orders.service';
import { OrderItemsService } from '../order-items/order-items.service';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';
import { TablesService } from '../tables/tables.service';
import { Table } from '../tables/entities/table.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { CreateOrderItemDto } from '../order-items/dto/create-order-item.dto';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { TableStatus } from '../common/enums/table-status.enum';
import { MenusService } from '../menus/menus.service';
import { Product } from '../products/entities/product.entity';

export interface OrderConfirmationData {
  customerPhone: string;
  branchId: string;
  tableId?: string;
  orderType: OrderType;
  items: Array<CreateOrderItemDto>;
  notes?: string;
  assistantThreadId?: string;
}

export interface ProcessedOrder {
  order: any;
  orderItems: any[];
  total: number;
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

@Injectable()
export class OrderProcessingService {
  private readonly logger = new Logger(OrderProcessingService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderItemsService: OrderItemsService,
    private readonly menuService: MenusService,
    private readonly productsService: ProductsService,
    private readonly customersService: CustomersService,
    private readonly tablesService: TablesService,
  ) {}

  /**
   * Procesa la confirmación de una orden del cliente
   */
  async processOrderConfirmation(
    confirmationData: OrderConfirmationData,
  ): Promise<ProcessedOrder> {
    this.logger.log(
      `Processing order confirmation for customer: ${confirmationData.customerPhone}`,
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar cliente
      const customer = await this.customersService.findByPhone(
        confirmationData.customerPhone,
      );
      if (!customer) {
        errors.push('Cliente no encontrado');
        return {
          order: null,
          orderItems: [],
          total: 0,
          success: false,
          errors,
        };
      }

      // 2. Validar mesa si es DINE_IN
      let validatedTable: Table;

      if (confirmationData.orderType === OrderType.DINE_IN) {
        if (!confirmationData.tableId) {
          errors.push('Se requiere mesa para pedidos en restaurante');
          return {
            order: null,
            orderItems: [],
            total: 0,
            success: false,
            errors,
          };
        }

        validatedTable = await this.tablesService.findOne(
          confirmationData.tableId,
        );
        if (!validatedTable) {
          errors.push(`Mesa ${confirmationData.tableId} no encontrada`);
          return {
            order: null,
            orderItems: [],
            total: 0,
            success: false,
            errors,
          };
        }

        // Verificar que la mesa esté disponible u ocupada (el cliente puede estar ya sentado)
        if (validatedTable.status === TableStatus.OCCUPIED) {
          errors.push(
            `Mesa ${validatedTable.name} no está disponible (${validatedTable.status})`,
          );
          return {
            order: null,
            orderItems: [],
            total: 0,
            success: false,
            errors,
          };
        }
      }

      // 3. Validar y procesar productos
      const processedItems = await this.validateAndProcessItems(
        confirmationData.items,
        confirmationData.branchId,
      );

      if (processedItems.errors.length > 0) {
        errors.push(...processedItems.errors);
      }

      if (processedItems.warnings.length > 0) {
        warnings.push(...processedItems.warnings);
      }

      if (processedItems.validItems.length === 0) {
        errors.push('No hay productos válidos en el pedido');
        return {
          order: null,
          orderItems: [],
          total: 0,
          success: false,
          errors,
        };
      }

      // 4. Calcular total
      const total = processedItems.validItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      // 5. Crear la orden
      const orderData: CreateOrderDto = {
        customerPhone: customer.phone,
        branchId: confirmationData.branchId,
        tableId: confirmationData.tableId,
        status: OrderStatus.PENDING,
        items: confirmationData.items,
        notes: confirmationData.notes,
        type: confirmationData.orderType ?? OrderType.DINE_IN,
      };

      const createdOrder = await this.ordersService.create(orderData);
      this.logger.log(`Order created with ID: ${createdOrder.id}`);

      // 6. Crear items de la orden
      const orderItems: OrderItem[] = [];
      for (const item of processedItems.validItems) {
        const orderItem = await this.orderItemsService.create({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        });
        orderItems.push(orderItem);
      }

      this.logger.log(`Created ${orderItems.length} order items`);

      // 7. Actualizar estado de mesa si es necesario
      if (validatedTable! && validatedTable!.status === TableStatus.AVAILABLE) {
        await this.tablesService.update(validatedTable.id, {
          status: TableStatus.OCCUPIED,
        });
        this.logger.log(`Table ${validatedTable.name} marked as OCCUPIED`);
      }

      // 8. Actualizar threadId del cliente si se proporcionó
      if (
        confirmationData.assistantThreadId &&
        customer.threadId !== confirmationData.assistantThreadId
      ) {
        await this.customersService.update(customer.phone, {
          threadId: confirmationData.assistantThreadId,
        });
      }

      this.logger.log(
        `Order confirmation processed successfully. Order ID: ${createdOrder.id}, Total: $${total}`,
      );

      return {
        order: createdOrder,
        orderItems,
        total,
        success: true,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      this.logger.error('Error processing order confirmation:', error);
      errors.push(`Error interno: ${error.message}`);
      return { order: null, orderItems: [], total: 0, success: false, errors };
    }
  }

  /**
   * Valida y procesa los items del pedido
   */
  private async validateAndProcessItems(
    items: OrderConfirmationData['items'],
    branchId: string,
  ): Promise<{
    validItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
    errors: string[];
    warnings: string[];
  }> {
    const validItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }> = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Obtener menu del branch
    const menu = await this.menuService.findByBranch(branchId);
    if (!menu) {
      errors.push('Menú no encontrado para el branch');
      return { validItems: [], errors, warnings };
    }

    // Obtener todos los productos del branch
    const branchProducts = await this.productsService.findByMenu(menu!.id);

    this.logger.log(`Found ${branchProducts.length} products in menu`);
    branchProducts.forEach((p) =>
      this.logger.log(`Available product: ${p.name}`),
    );

    for (const item of items) {
      try {
        let product: Product | null | undefined = null;

        product = this.findProductByName(branchProducts, item.productName);

        if (!product) {
          errors.push(
            `Producto "${item.productName || item.productId}" no encontrado`,
          );
          this.logger.error(
            `Product not found: "${item.productName}". Available products: ${branchProducts.map((p) => p.name).join(', ')}`,
          );
          continue;
        }

        if (!product.isActive) {
          errors.push(`Producto "${product.name}" no está disponible`);
          continue;
        }

        // Validar cantidad
        if (item.quantity <= 0) {
          errors.push(
            `Cantidad inválida para "${product?.name}": ${item.quantity}`,
          );
          continue;
        }

        // Usar precio del producto o el proporcionado
        const unitPrice = item.unitPrice || product?.price;

        validItems.push({
          productId: product!.id,
          productName: product!.name,
          quantity: item.quantity,
          unitPrice: unitPrice!,
          notes: item.notes,
        });

        this.logger.log(
          `Validated item: ${product?.name} x${item.quantity} @ $${unitPrice}`,
        );
      } catch (error) {
        this.logger.error(`Error validating item ${item.productId}:`, error);
        errors.push(`Error procesando "${item.productId}": ${error.message}`);
      }
    }

    return { validItems, errors, warnings };
  }

  /**
   * Obtener orden activa del cliente en una mesa
   */
  async getActiveOrderByCustomerAndTable(
    customerPhone: string,
    tableId: string,
  ): Promise<any | null> {
    const customer = await this.customersService.findByPhone(customerPhone);
    if (!customer) return null;

    return await this.ordersService.findOne(customer.id);
  }

  /**
   * Agregar items a una orden existente
   */
  async addItemsToExistingOrder(
    orderId: string,
    items: OrderConfirmationData['items'],
    branchId: string,
  ): Promise<ProcessedOrder> {
    this.logger.log(`Adding items to existing order: ${orderId}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Obtener orden existente
      const existingOrder = await this.ordersService.findOne(orderId);
      if (!existingOrder) {
        errors.push('Orden no encontrada');
        return {
          order: null,
          orderItems: [],
          total: 0,
          success: false,
          errors,
        };
      }

      // Validar que la orden permita agregar items
      if (!['PENDING', 'CONFIRMED'].includes(existingOrder.status)) {
        errors.push(
          `No se pueden agregar items a una orden ${existingOrder.status}`,
        );
        return {
          order: null,
          orderItems: [],
          total: 0,
          success: false,
          errors,
        };
      }

      // Procesar nuevos items
      const processedItems = await this.validateAndProcessItems(
        items,
        branchId,
      );

      if (processedItems.errors.length > 0) {
        errors.push(...processedItems.errors);
      }

      if (processedItems.validItems.length === 0) {
        errors.push('No hay productos válidos para agregar');
        return {
          order: null,
          orderItems: [],
          total: 0,
          success: false,
          errors,
        };
      }

      // Crear nuevos order items
      const newOrderItems: OrderItem[] = [];
      let additionalTotal = 0;

      for (const item of processedItems.validItems) {
        const orderItem = await this.orderItemsService.create({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        });
        newOrderItems.push(orderItem);
        additionalTotal += item.unitPrice * item.quantity;
      }

      // Actualizar total de la orden
      const newTotal = existingOrder.total + additionalTotal;
      const updatedOrder = await this.ordersService.update(existingOrder.id, {
        total: newTotal,
      });

      this.logger.log(
        `Added ${newOrderItems.length} items to order ${orderId}. New total: $${newTotal}`,
      );

      return {
        order: updatedOrder,
        orderItems: newOrderItems,
        total: newTotal,
        success: true,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      this.logger.error('Error adding items to order:', error);
      errors.push(`Error interno: ${error.message}`);
      return { order: null, orderItems: [], total: 0, success: false, errors };
    }
  }

  /**
   * Búsqueda mejorada de producto por nombre
   */
  private findProductByName(
    products: Product[],
    searchName: string,
  ): Product | null {
    const normalized = searchName.toLowerCase().trim();

    this.logger.log(
      `Searching for product: "${searchName}" in ${products.length} products`,
    );

    // 1. Búsqueda exacta
    let found = products.find(
      (p) => p.name.toLowerCase().trim() === normalized,
    );

    if (found) {
      this.logger.log(`Found exact match: ${found.name}`);
      return found;
    }

    // 2. Búsqueda por inclusión simple
    found = products.find(
      (p) =>
        p.name.toLowerCase().includes(normalized) ||
        normalized.includes(p.name.toLowerCase()),
    );

    if (found) {
      this.logger.log(`Found by inclusion: ${found.name}`);
      return found;
    }

    // 3. **NUEVO: Búsqueda específica para productos con variantes**
    // Buscar en contenido de paréntesis: "Refrescos (Cola, fresa)" -> buscar "cola"
    found = products.find((p) => {
      const parenthesisMatch = p.name.match(/\(([^)]+)\)/);
      if (parenthesisMatch) {
        const variants = parenthesisMatch[1].toLowerCase();
        // Dividir por comas y limpiar espacios
        const variantList = variants.split(',').map((v) => v.trim());

        // Verificar si el término buscado coincide con alguna variante
        return variantList.some(
          (variant) =>
            variant.includes(normalized) ||
            normalized.includes(variant) ||
            this.similarityMatch(variant, normalized),
        );
      }
      return false;
    });

    if (found) {
      this.logger.log(`Found by variant match: ${found.name}`);
      return found;
    }

    // 4. **NUEVO: Búsqueda por palabras clave mejorada**
    const searchWords = normalized.split(' ').filter((word) => word.length > 2);

    found = products.find((p) => {
      const productText = p.name.toLowerCase();

      // Verificar si alguna palabra clave coincide
      return searchWords.some((word) => {
        // Buscar en el nombre principal
        if (productText.includes(word)) return true;

        // Buscar en las variantes (contenido de paréntesis)
        const parenthesisMatch = p.name.match(/\(([^)]+)\)/);
        if (parenthesisMatch) {
          const variants = parenthesisMatch[1].toLowerCase();
          return variants.includes(word);
        }

        return false;
      });
    });

    if (found) {
      this.logger.log(`Found by keyword match: ${found.name}`);
      return found;
    }

    // 5. **NUEVO: Mapeo de sinónimos comunes**
    const synonymMap = {
      refresco: ['refrescos', 'bebida', 'soda'],
      cola: ['coca', 'cocacola', 'coca cola', 'pepsi'],
      fresa: ['strawberry', 'frutilla'],
      toronja: ['pomelo', 'grapefruit'],
      torta: ['sandwich', 'sándwich', 'emparedado'],
      jamón: ['jamon', 'ham'],
    };

    for (const [key, synonyms] of Object.entries(synonymMap)) {
      if (
        normalized.includes(key) ||
        synonyms.some((syn) => normalized.includes(syn))
      ) {
        found = products.find((p) => {
          const productText = p.name.toLowerCase();
          return (
            productText.includes(key) ||
            synonyms.some((syn) => productText.includes(syn))
          );
        });

        if (found) {
          this.logger.log(`Found by synonym match (${key}): ${found.name}`);
          return found;
        }
      }
    }

    this.logger.warn(`No product found for: "${searchName}"`);
    return null;
  }

  /**
   * **NUEVO: Verificar similitud entre strings**
   */
  private similarityMatch(str1: string, str2: string): boolean {
    // Implementación simple de similitud
    const minLength = Math.min(str1.length, str2.length);
    const maxLength = Math.max(str1.length, str2.length);

    if (minLength < 3) return false; // Muy corto para comparar

    // Si una string está contenida en la otra y tiene al menos 70% de similitud
    if (minLength / maxLength >= 0.7) {
      return str1.includes(str2) || str2.includes(str1);
    }

    return false;
  }
}
