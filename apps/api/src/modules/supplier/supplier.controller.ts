import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PermCode } from '@flower/shared';
import { CurrentScope } from '../../common/decorators/current-user.decorator';
import { RequiresPerm } from '../../common/decorators/requires-perm.decorator';
import { RequestScope } from '../../common/interfaces/jwt-payload.interface';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Controller('admin/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @RequiresPerm(PermCode.SUPPLIER_READ)
  list(@CurrentScope() scope: RequestScope) {
    return this.supplierService.list(scope);
  }

  @Post()
  @RequiresPerm(PermCode.SUPPLIER_WRITE)
  create(@Body() dto: CreateSupplierDto) {
    return this.supplierService.create(dto);
  }

  @Put(':id/status')
  @RequiresPerm(PermCode.SUPPLIER_WRITE)
  toggle(
    @Param('id') id: string,
    @Body('status') status: number,
    @CurrentScope() scope: RequestScope,
  ) {
    return this.supplierService.toggleStatus(id, Number(status), scope);
  }
}
