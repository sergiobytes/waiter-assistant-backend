import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { BranchesService } from '../branches/branches.service';
import { MenusService } from '../menus/menus.service';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @Inject(forwardRef(() => OpenAIService))
    private readonly openAIService: OpenAIService,
    private readonly branchesService: BranchesService,
    private readonly menusService: MenusService,
    private readonly productsService: ProductsService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * Procesa un mensaje del cliente y devuelve la respuesta del asistente
   */
  async processMessage(
    branchId: string,
    customerPhone: string,
    message: string,
    threadId?: string,
  ): Promise<{ response: string; threadId: string }> {
    try {
      // 1. Obtener el branch y validar que tenga assistantId
      const branch = await this.branchesService.findOne(branchId);

      if (!branch.assistantId) {
        throw new BadRequestException(
          `Branch '${branch.name}' does not have an assistant configured`,
        );
      }

      this.logger.log(
        `Processing message for branch: ${branch.name} with assistant: ${branch.assistantId}`,
      );

      // 2. Obtener información del cliente
      const customer = await this.customersService.findByPhone(customerPhone);

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      // 3. Crear un thread si no existe
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await this.openAIService.createThread();
        this.logger.log(
          `Created new thread for customer ${customer.name}: ${currentThreadId}`,
        );
      }

      // 4. Preparar contexto del cliente y branch
      const customerContext = {
        customer: {
          name: customer.name,
          phone: customer.phone,
        },
        branch: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
        },
        restaurant: {
          name: branch.restaurant.name,
        },
      };

      // 5. Enviar mensaje al asistente
      const response = await this.openAIService.sendMessageToAssistant(
        branch.assistantId,
        currentThreadId,
        message,
        customerContext,
      );

      this.logger.log(
        `Assistant response generated for customer ${customer.name}`,
      );

      return {
        response,
        threadId: currentThreadId,
      };
    } catch (error) {
      this.logger.error('Error processing message with assistant:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Respuesta de fallback si hay error con OpenAI
      return {
        response:
          'Lo siento, estoy teniendo problemas técnicos en este momento. ¿Puedes intentar de nuevo en unos minutos?',
        threadId: threadId || 'error',
      };
    }
  }

  /**
   * Obtiene el menú de un branch específico
   */
  async getMenu(branchId: string): Promise<any> {
    try {
      const menus = await this.menusService.findByBranch(branchId);

      const menuData: any[] = [];

      for (const menu of menus) {
        const products = await this.productsService.findByMenu(menu.id);

        menuData.push({
          menuName: menu.name,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
          })),
        });
      }

      return {
        status: 'success',
        data: menuData,
      };
    } catch (error) {
      this.logger.error('Error getting menu:', error);
      return {
        status: 'error',
        message: 'No se pudo obtener el menú',
      };
    }
  }

  /**
   * Crea una nueva orden
   */
  async createOrder(
    customerPhone: string,
    branchId: string,
    tableNumber?: string,
  ): Promise<any> {
    try {
      const customer = await this.customersService.findByPhone(customerPhone);

      if (!customer) {
        return {
          status: 'error',
          message: 'Cliente no encontrado',
        };
      }

      // Aquí implementarías la lógica para crear la orden
      // Por ahora, solo retornamos un placeholder

      const orderData = {
        customerId: customer.id,
        branchId: branchId,
        tableNumber: tableNumber,
        status: 'PENDING',
        items: [],
      };

      this.logger.log(`Order creation requested for customer ${customer.name}`);

      return {
        status: 'success',
        message: 'Orden creada exitosamente',
        data: orderData,
      };
    } catch (error) {
      this.logger.error('Error creating order:', error);
      return {
        status: 'error',
        message: 'No se pudo crear la orden',
      };
    }
  }
}
