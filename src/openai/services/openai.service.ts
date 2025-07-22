import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import OpenAI from 'openai';
import { openAIConfig } from '../../config/openai.config';
import { AssistantService } from '../assistant.service';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(
    @Inject(forwardRef(() => AssistantService))
    private readonly assistantService: AssistantService,
  ) {
    if (!openAIConfig.apiKey) {
      this.logger.warn('OpenAI API key not configured');
      return;
    }

    this.openai = new OpenAI({
      apiKey: openAIConfig.apiKey,
    });

    this.logger.log('OpenAI service initialized');
  }

  /**
   * Crea un thread de conversación con el asistente
   */
  async createThread(): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const thread = await this.openai.beta.threads.create();
    this.logger.log(`Thread created: ${thread.id}`);
    return thread.id;
  }

  /**
   * Envía un mensaje al asistente y obtiene la respuesta
   */
  async sendMessageToAssistant(
    assistantId: string,
    threadId: string,
    message: string,
    customerContext?: any,
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      // 1. Agregar el mensaje del usuario al thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message,
      });

      // 2. Crear un run con el asistente
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        additional_instructions: customerContext
          ? `Contexto del cliente: ${JSON.stringify(customerContext)}`
          : undefined,
      });

      // 3. Esperar a que el run se complete
      let runStatus = await this.openai.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });

      while (
        runStatus.status === 'in_progress' ||
        runStatus.status === 'queued'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(run.id, {
          thread_id: threadId,
        });
      }

      if (runStatus.status === 'completed') {
        // 4. Obtener los mensajes del thread
        const messages = await this.openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];

        if (lastMessage.role === 'assistant') {
          const content = lastMessage.content[0];
          if (content.type === 'text') {
            return content.text.value;
          }
        }
      } else if (runStatus.status === 'requires_action') {
        // Manejar function calls si es necesario
        this.logger.log('Assistant requires action - function calls needed');
        return await this.handleFunctionCalls(threadId, run.id, runStatus);
      } else {
        this.logger.error(`Run failed with status: ${runStatus.status}`);
        throw new Error(`Assistant run failed: ${runStatus.status}`);
      }

      return 'Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?';
    } catch (error) {
      this.logger.error('Error communicating with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Maneja las llamadas a funciones del asistente
   */
  private async handleFunctionCalls(
    threadId: string,
    runId: string,
    runStatus: any,
  ): Promise<string> {
    const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
    const toolOutputs: any[] = [];

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      this.logger.log(
        `Function call: ${functionName} with args: ${JSON.stringify(functionArgs)}`,
      );

      // Aquí es donde llamaremos a los servicios correspondientes
      const output = await this.executeFunctionCall(functionName, functionArgs);

      toolOutputs.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify(output),
      });
    }

    // Enviar los resultados de las funciones de vuelta al asistente
    await this.openai.beta.threads.runs.submitToolOutputs(runId, {
      thread_id: threadId,
      tool_outputs: toolOutputs,
    });

    // Esperar a que el run se complete después de las function calls
    let runStatus2 = await this.openai.beta.threads.runs.retrieve(runId, {
      thread_id: threadId,
    });

    while (
      runStatus2.status === 'in_progress' ||
      runStatus2.status === 'queued'
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus2 = await this.openai.beta.threads.runs.retrieve(runId, {
        thread_id: threadId,
      });
    }

    if (runStatus2.status === 'completed') {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];

      if (lastMessage.role === 'assistant') {
        const content = lastMessage.content[0];
        if (content.type === 'text') {
          return content.text.value;
        }
      }
    }

    return 'Procesé tu solicitud correctamente.';
  }

  /**
   * Ejecuta las funciones llamadas por el asistente
   * Aquí es donde integramos con los servicios de la aplicación
   */
  private async executeFunctionCall(
    functionName: string,
    args: any,
  ): Promise<any> {
    this.logger.log(`Executing function: ${functionName}`);

    try {
      switch (functionName) {
        case 'get_menu':
          // Retorna información del menú
          return await this.assistantService.getMenu(args.branchId);

        case 'create_order':
          // Crea una nueva orden
          return await this.assistantService.createOrder(
            args.customerPhone,
            args.branchId,
            args.tableNumber,
          );

        case 'get_order_status':
          // Consulta el estado de una orden
          return {
            status: 'success',
            message: 'Función get_order_status ejecutada',
            data: args,
          };

        case 'add_item_to_order':
          // Agrega items a una orden
          return {
            status: 'success',
            message: 'Función add_item_to_order ejecutada',
            data: args,
          };

        default:
          this.logger.warn(`Unknown function: ${functionName}`);
          return {
            status: 'error',
            message: `Función ${functionName} no reconocida`,
          };
      }
    } catch (error) {
      this.logger.error(`Error executing function ${functionName}:`, error);
      return { status: 'error', message: error.message };
    }
  }
}
