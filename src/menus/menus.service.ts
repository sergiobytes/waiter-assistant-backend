import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Menu } from './entities/menu.entity';
import { Repository } from 'typeorm';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
  ) {}

  async create(dto: CreateMenuDto): Promise<Menu> {
    const menu = this.menuRepo.create(dto);
    return await this.menuRepo.save(menu);
  }

  async findAll(): Promise<Menu[]> {
    return await this.menuRepo.find({
      where: { isActive: true },
      relations: ['branch'],
    });
  }

  async findOne(id: string): Promise<Menu> {
    const menu = await this.menuRepo.findOne({
      where: { id, isActive: true },
      relations: ['branch'],
    });

    if (!menu) throw new NotFoundException('Menu not found');

    return menu;
  }

  async findByBranch(branchId: string): Promise<Menu | null> {
    return await this.menuRepo.findOne({ where: { branchId, isActive: true } });
  }

  async update(id: string, dto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.findOne(id);
    Object.assign(menu, dto);
    return this.menuRepo.save(menu);
  }

  async remove(id: string): Promise<void> {
    const menu = await this.findOne(id);
    menu.isActive = false;
    await this.menuRepo.save(menu);
  }
}
