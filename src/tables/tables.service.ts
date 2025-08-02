import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Table } from './entities/table.entity';
import { Repository } from 'typeorm';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { tableKeywords } from '../utils/table-keywords';
import { TableStatus } from 'src/common/enums/table-status.enum';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  constructor(
    @InjectRepository(Table) private readonly tableRepo: Repository<Table>,
  ) {}

  async create(dto: CreateTableDto): Promise<Table> {
    const table = this.tableRepo.create(dto);
    return await this.tableRepo.save(table);
  }

  async findAll(): Promise<Table[]> {
    return await this.tableRepo.find({
      where: { isActive: true },
      relations: ['branch'],
    });
  }

  async findOne(id: string): Promise<Table> {
    if (!id || id === undefined || id === null || id.trim() === '') {
      throw new NotFoundException('Table ID is required');
    }

    const table = await this.tableRepo.findOne({
      where: { id, isActive: true },
      relations: ['branch'],
    });

    if (!table) throw new NotFoundException('Table not found');

    return table;
  }

  async findByBranch(branchId: string): Promise<Table[]> {
    return await this.tableRepo.find({ where: { branchId, isActive: true } });
  }

  async update(id: string, dto: UpdateTableDto): Promise<Table> {
    const table = await this.findOne(id);
    Object.assign(table, dto);
    return this.tableRepo.save(table);
  }

  async remove(id: string): Promise<void> {
    const table = await this.findOne(id);
    table.isActive = false;
    await this.tableRepo.save(table);
  }

  async processTableMention(message: string, branchId: string) {
    const messageNormalized = message.toLowerCase();
    const hasTableMention = tableKeywords.some((k) =>
      messageNormalized.includes(k.toLowerCase()),
    );

    if (!hasTableMention) {
      this.logger.log('No table mention detected in message');
      return {
        hasTableMention: false,
        tables: [],
        detectedTableNumber: null,
        confidence: 0,
      };
    }

    this.logger.log('Table mention detected, fetching branch tables');

    const tables = await this.findByBranch(branchId);
    const detectedTableNumber = this.extractTableNumber(message);

    if (tables.length === 0) {
      this.logger.warn(`No tables found for branch ${branchId}`);
      return {
        hasTableMention: true,
        tables: [],
        detectedTableNumber,
        validatedTable: null,
        confidence: 0.9,
        totalTables: 0,
        error: 'NO_TABLES_FOUND',
        errorMessage: 'Lo siento, no hay mesas configuradas en esta sucursal.',
      };
    }

    let validatedTable: Table | undefined = undefined;
    let tableStatus = '';

    if (detectedTableNumber) {
      validatedTable = tables.find(
        (table) =>
          table.name === detectedTableNumber.toString() ||
          table.name.toLowerCase().includes(detectedTableNumber.toString()),
      );

      if (validatedTable) {
        tableStatus = this.getTableStatusMessage(validatedTable);
        this.logger.log(
          `Table ${detectedTableNumber} found with status: ${validatedTable.status}`,
        );
      } else {
        this.logger.warn(
          `Table ${detectedTableNumber} not found in branch ${branchId}`,
        );
      }
    }

    let error = '';
    let errorMessage = '';

    if (detectedTableNumber && !validatedTable) {
      error = 'TABLE_NOT_FOUND';
      errorMessage = `Lo siento, no encontré la mesa ${detectedTableNumber}. Las mesas disponibles son: ${tables.map((t) => t.name).join(', ')}.`;
    } else if (
      validatedTable &&
      !this.isTableAvailableForOrder(validatedTable)
    ) {
      error = 'TABLE_NOT_AVAILABLE';
      errorMessage = this.getTableUnavailableMessage(validatedTable);
    }

    const tableInfo = {
      hasTableMention: true,
      tables: tables,
      detectedTableNumber,
      validatedTable,
      tableStatus,
      confidence: detectedTableNumber ? 0.9 : 0.6,
      totalTables: tables.length,
      error,
      errorMessage,
      availableTablesForOrder: tables.filter((t) =>
        this.isTableAvailableForOrder(t),
      ),
    };

    this.logger.log(`Table processing result:`, {
      hasTableMention: tableInfo.hasTableMention,
      detectedNumber: tableInfo.detectedTableNumber,
      validatedTable: tableInfo.validatedTable?.name,
      tableStatus: tableInfo.tableStatus,
      totalTables: tableInfo.totalTables,
      error: tableInfo.error,
      availableCount: tableInfo.availableTablesForOrder.length,
    });

    return tableInfo;
  }

  private extractTableNumber(message: string): number | null {
    const patterns = [
      /mesa\s*(\d+)/i,
      /mesa\s*n[úu]mero\s*(\d+)/i,
      /mesa\s*numero\s*(\d+)/i,
      /table\s*(\d+)/i,
      /table\s*number\s*(\d+)/i,
      /estoy\s*en\s*la\s*(\d+)/i,
      /desde\s*la\s*(\d+)/i,
      /en\s*la\s*mesa\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const tableNumber = parseInt(match[1], 10);
        this.logger.log(`Detected table number: ${tableNumber}`);
        return tableNumber;
      }
    }

    this.logger.log('No specific table number detected');
    return null;
  }

  /**
   * **NUEVO MÉTODO: Obtener mensaje de estado de mesa**
   */
  private getTableStatusMessage(table: Table): string {
    switch (table.status) {
      case TableStatus.AVAILABLE:
        return `Mesa ${table.name} está disponible (capacidad: ${table.capacity} personas)`;
      case TableStatus.OCCUPIED:
        return `Mesa ${table.name} está ocupada (capacidad: ${table.capacity} personas)`;
      case TableStatus.RESERVED:
        return `Mesa ${table.name} está reservada (capacidad: ${table.capacity} personas)`;
      default:
        return `Mesa ${table.name} - estado: ${table.status}`;
    }
  }

  /**
   * **NUEVO MÉTODO: Verificar si una mesa está disponible para ordenar**
   */
  private isTableAvailableForOrder(table: Table): boolean {
    // Considerar disponible si está AVAILABLE u OCCUPIED (cliente ya sentado puede ordenar)
    return (
      table.status === TableStatus.AVAILABLE ||
      table.status === TableStatus.OCCUPIED
    );
  }

  /**
   * **NUEVO MÉTODO: Obtener mensaje cuando la mesa no está disponible**
   */
  private getTableUnavailableMessage(table: Table): string {
    switch (table.status) {
      case TableStatus.RESERVED:
        return `Lo siento, la mesa ${table.name} está reservada. ¿Te gustaría que te sugiera otra mesa disponible?`;
      default:
        return `Lo siento, la mesa ${table.name} no está disponible en este momento (estado: ${table.status}).`;
    }
  }
}
