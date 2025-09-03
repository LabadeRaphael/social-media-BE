import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ActiveUserType } from "src/interfaces/active-user-type";

export const ActiveUser = createParamDecorator((data:keyof ActiveUserType , context:ExecutionContext)=>{
    const request=context.switchToHttp().getRequest();
    // const activeUser:ActiveUserType = request
    // return data ? request.cookies?.[data] : request.cookies;
})