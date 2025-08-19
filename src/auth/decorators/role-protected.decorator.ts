import { SetMetadata } from '@nestjs/common';
import { UserRoles } from '../enums/user-valid-roles';

export const META_ROLES = 'role';

export const RoleProtected = (roles: UserRoles[]) => {
  return SetMetadata(META_ROLES, [...roles]);
};
