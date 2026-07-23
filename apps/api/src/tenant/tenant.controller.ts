import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantService } from './tenant.service';
import { CreateUserDto, UpdateTenantDto, UpdateUserRoleDto } from './dto/tenant.dto';

@UseGuards(AuthGuard)
@Controller('tenant')
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Patch()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  update(@Body() dto: UpdateTenantDto) {
    return this.service.update(dto);
  }

  @Get('users')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  listUsers() {
    return this.service.listUsers();
  }

  @Post('users')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  createUser(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id/role')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.service.updateUserRole(id, dto);
  }
}
