import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Table } from './entities/table.entity';
import { Repository } from 'typeorm';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
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
}
