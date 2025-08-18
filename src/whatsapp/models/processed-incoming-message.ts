import { MessageData } from './message-data';
import { Customer } from '../../customers/entities/customer.entity';
import { Branch } from '../../branches/entities/branch.entity';

export type ProcessedIncomingMessage = {
  error?: string | undefined;
  message: MessageData;
  processed: boolean;
  customer?: Customer | undefined;
  branch?: Branch | undefined;
  assistantResponse?: string | null | undefined;
  threadId?: string | null | undefined;
};
