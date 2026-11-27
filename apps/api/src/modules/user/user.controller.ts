import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { UserService } from './user.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@Controller('admin/staff')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequiresPerm(PermCode.ROLE_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.userService.listStaff(scope);
  }

  @Post()
  @RequiresPerm(PermCode.ROLE_WRITE)
  create(@Body() dto: CreateStaffDto, @CurrentScope() scope: RequestScope) {
    return this.userService.createStaff(dto, scope);
  }

  @Put(':id/status')
  @RequiresPerm(PermCode.ROLE_WRITE)
  toggle(
    @Param('id') id: string,
    @Body('status') status: number,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.userService.toggleStatus(id, Number(status), scope);
  }
}
