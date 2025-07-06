import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly brancheService: BranchesService) {}

  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.brancheService.create(dto);
  }

  @Get()
  findAll() {
    return this.brancheService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.brancheService.findOne(id);
  }

  @Get('/by-restaurant/:restaurantId')
  findByRestaurant(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.brancheService.findByResturant(restaurantId);
  }

  @Get(':id/generate-qr')
  generateQr(@Param('id', ParseUUIDPipe) id: string) {
    return this.brancheService.generateQrForBranch(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
    return this.brancheService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brancheService.remove(id);
  }
}
