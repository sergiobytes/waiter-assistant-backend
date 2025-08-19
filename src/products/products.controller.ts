import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { pdfUploadOptions } from '../utils/pdf-upload';
import { Auth } from '../auth/decorators/auth.decorator';
import { UserRoles } from '../auth/enums/user-valid-roles';

@Controller('products')
@Auth([UserRoles.ADMIN])
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Post('/upload-pdf/:menuId')
  @UseInterceptors(FileInterceptor('file', pdfUploadOptions))
  uploadPdf(
    @Param('menuId') menuId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.uploadPdf(menuId, file);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  @Get('/by-menu/:menuId')
  findByMenu(@Param('menuId', ParseUUIDPipe) menuId: string) {
    return this.productService.findByMenu(menuId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }
}
