import { Controller, Post, Body, HttpCode, HttpStatus, Req, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { RegisterClientDto } from './register-client.dto';

// Public signup abuse guard: at most 5 new client accounts per IP per hour.
const signupHits = new Map<string, { count: number; resetAt: number }>();
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password, returning a signed JWT token' })
  @ApiResponse({ status: 200, description: 'Authentication successful. Returns access token and sanitized user details.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Account or company is locked/inactive.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register-client')
  @ApiOperation({ summary: 'Public self-service signup for clients who want to post construction requirements' })
  @ApiResponse({ status: 201, description: 'Client account created.' })
  @ApiResponse({ status: 400, description: 'Validation error or email already registered.' })
  @ApiResponse({ status: 429, description: 'Too many signups from this address.' })
  registerClient(@Body() dto: RegisterClientDto, @Req() req: any) {
    const ip = String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
    const now = Date.now();
    let entry = signupHits.get(ip);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + SIGNUP_WINDOW_MS };
      signupHits.set(ip, entry);
    }
    if (entry.count >= SIGNUP_LIMIT) {
      throw new HttpException('Too many sign-ups from this network. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    entry.count++;
    return this.authService.registerClient(dto);
  }
}
