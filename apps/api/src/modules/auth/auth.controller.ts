import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { BindPhoneDto } from './dto/bind-phone.dto';
import { SwitchIdentityDto } from './dto/switch-identity.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wx-login')
  wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto);
  }

  @Public()
  @Post('refresh-token')
  refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) throw new BadRequestException('refreshToken 必填');
    return this.authService.refreshToken(refreshToken);
  }

  @Public()
  @Post('web-login')
  webLogin(@Body('openid') openid: string) {
    if (!openid) throw new BadRequestException('openid 必填');
    return this.authService.webLogin(openid);
  }

  @Post('bind-phone')
  bindPhone(@CurrentUser() user: JwtPayload, @Body() dto: BindPhoneDto) {
    return this.authService.bindPhone(user.sub, dto);
  }

  @Get('identities')
  identities(@CurrentUser() user: JwtPayload) {
    return this.authService.getIdentities(user.sub);
  }

  @Post('switch-identity')
  switchIdentity(@CurrentUser() user: JwtPayload, @Body() dto: SwitchIdentityDto) {
    return this.authService.switchIdentity(user.sub, dto.identityId);
  }

  @Get('profile')
  profile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
