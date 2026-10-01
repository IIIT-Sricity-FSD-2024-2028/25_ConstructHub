"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.UserContext = void 0;
const common_1 = require("@nestjs/common");
class UserContext {
    userId;
    role;
    companyId;
}
exports.UserContext = UserContext;
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=current-user.decorator.js.map