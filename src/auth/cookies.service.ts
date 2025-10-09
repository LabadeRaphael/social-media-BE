import { Injectable } from '@nestjs/common';
import { Response, Request } from 'express';

@Injectable()
export class CookiesService {
  setAuthCookie(res: Response, name: string, value: string, maxAge: number) {
    res.cookie(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge,
    });
  }

  clearCookie(res: Response, name: string) {
    res.clearCookie(name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
  }
  getAuthCookie(
    req: Request & { cookies?: Record<string, string> },
    name: string
  ): string | undefined {
    return req.cookies?.[name] as string | undefined; // assert type explicitly
  }
}
