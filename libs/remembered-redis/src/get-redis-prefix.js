"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisPrefix = getRedisPrefix;
function getRedisPrefix(redisPrefix) {
    let result;
    if (redisPrefix) {
        result = redisPrefix;
        if (!redisPrefix.endsWith(':')) {
            result += ':';
        }
    }
    else {
        result = '';
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlZGlzLXByZWZpeC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1yZWRpcy1wcmVmaXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3Q0FXQztBQVhELFNBQWdCLGNBQWMsQ0FBQyxXQUErQjtJQUM3RCxJQUFJLE1BQWMsQ0FBQztJQUNuQixJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sR0FBRyxXQUFXLENBQUM7UUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksR0FBRyxDQUFDO1FBQ2YsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNiLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZ2V0UmVkaXNQcmVmaXgocmVkaXNQcmVmaXg6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuXHRsZXQgcmVzdWx0OiBzdHJpbmc7XG5cdGlmIChyZWRpc1ByZWZpeCkge1xuXHRcdHJlc3VsdCA9IHJlZGlzUHJlZml4O1xuXHRcdGlmICghcmVkaXNQcmVmaXguZW5kc1dpdGgoJzonKSkge1xuXHRcdFx0cmVzdWx0ICs9ICc6Jztcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cmVzdWx0ID0gJyc7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==