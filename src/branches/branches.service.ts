import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

import { uploadToCloudinary } from '../utils/upload-to-cloudinary';
import { createQr } from '../utils/create-qr';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async create(dto: CreateBranchDto): Promise<Branch> {
    const branch = this.branchRepo.create(dto);
    return await this.branchRepo.save(branch);
  }

  async findAll(): Promise<Branch[]> {
    return await this.branchRepo.find({
      where: { isActive: true },
      relations: ['restaurant'],
    });
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id, isActive: true },
      relations: ['restaurant'],
    });

    if (!branch) throw new NotFoundException('Branch not found');

    return branch;
  }

  async findByResturant(restaurantId: string): Promise<Branch[]> {
    return await this.branchRepo.find({
      where: { restaurantId, isActive: true },
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Branch | null> {
    return await this.branchRepo.findOne({
      where: { phoneNumber, isActive: true },
      relations: ['restaurant'],
    });
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, dto);
    return await this.branchRepo.save(branch);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);
    branch.isActive = false;
    await this.branchRepo.save(branch);
  }

  async generateQrForBranch(id: string): Promise<{ qrUrl: string }> {
    const branch = await this.findOne(id);
    const targetUrl = `https://wa.me/${branch.phoneNumber}?text=Hola!`;

    const finalImage = await createQr(targetUrl);

    const uploadedUrl = await uploadToCloudinary(
      finalImage,
      'botbite/branches',
      `qr-${branch.id}`,
    );

    branch.qrUrl = uploadedUrl;
    await this.branchRepo.save(branch);

    return {
      qrUrl: uploadedUrl,
    };
  }
}
