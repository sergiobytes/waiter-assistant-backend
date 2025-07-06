import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import * as pdfParse from 'pdf-parse';
import { ProductCategory } from 'src/common/enums/product-category.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create(dto);
    return await this.productRepo.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepo.find({
      where: { isActive: true },
      relations: ['menu'],
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
      relations: ['menu'],
    });

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  async findByMenu(menuId: string): Promise<Product[]> {
    return await this.productRepo.find({
      where: { menuId: menuId, isActive: true },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const menu = await this.findOne(id);
    menu.isActive = false;
    await this.productRepo.save(menu);
  }

  async uploadPdf(menuId: string, file: Express.Multer.File) {
    const buffer = file.buffer;
    const data = await pdfParse(buffer);

    const lines = data.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const productsToCreate: CreateProductDto[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(.*?)\s+(\d+[.,]?\d{0,2})$/);

      if (match) {
        const name = match[1].trim();
        const price = parseFloat(match[2].replace(',', '.'));

        productsToCreate.push({
          name,
          price,
          menuId,
          category: ProductCategory.OTHER,
        });
      }
    });

    const created = await this.bulkCreate(productsToCreate);
    return { count: created.length, products: created };
  }

  private async bulkCreate(products: CreateProductDto[]): Promise<Product[]> {
    const newProducts = this.productRepo.create(products);
    return await this.productRepo.save(newProducts);
  }
}
