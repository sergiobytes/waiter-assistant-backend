import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoleProtected } from './role-protected.decorator';
import { UserRoleGuard } from '../guards/user-role.guard';
import { AccessTokenGuard } from '../guards/access-token.guard';
import { UserRoles } from '../enums/user-valid-roles';

export function Auth(roles: UserRoles[]) {
  return applyDecorators(
    RoleProtected(roles),
    UseGuards(AccessTokenGuard, AuthGuard('jwt'), UserRoleGuard),
  );
}
