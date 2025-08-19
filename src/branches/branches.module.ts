import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService, JwtService],
  imports: [TypeOrmModule.forFeature([Branch])],
  exports: [BranchesService],
})
export class BranchesModule {}
