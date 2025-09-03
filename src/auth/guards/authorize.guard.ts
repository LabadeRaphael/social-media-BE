import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthorizeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }
 async canActivate(
    context: ExecutionContext
  ):  Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride('isPublic',[
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // reject if no user
    }

    // you can add custom logic e.g. check roles
    return true;
    
    
  }
}
