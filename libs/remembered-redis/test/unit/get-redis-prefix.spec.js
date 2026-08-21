"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_redis_prefix_1 = require("../../src/get-redis-prefix");
describe(get_redis_prefix_1.getRedisPrefix.name, () => {
    it('should return prefix followed by: when a string is informed that not ends in it', () => {
        const result = (0, get_redis_prefix_1.getRedisPrefix)('test');
        expect(result).toBe('test:');
    });
    it('should return prefix as is when a string is informed that ends with :', () => {
        const result = (0, get_redis_prefix_1.getRedisPrefix)('test:');
        expect(result).toBe('test:');
    });
    it('should return empty string when the informed prefix is undefined', () => {
        const result = (0, get_redis_prefix_1.getRedisPrefix)(undefined);
        expect(result).toBe('');
    });
    it('should return empty string when the informed prefix is an empty string', () => {
        const result = (0, get_redis_prefix_1.getRedisPrefix)('');
        expect(result).toBe('');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlZGlzLXByZWZpeC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXJlZGlzLXByZWZpeC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUVBQTREO0FBRTVELFFBQVEsQ0FBQyxpQ0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7SUFDbEMsRUFBRSxDQUFDLGlGQUFpRixFQUFFLEdBQUcsRUFBRTtRQUMxRixNQUFNLE1BQU0sR0FBRyxJQUFBLGlDQUFjLEVBQUMsTUFBTSxDQUFDLENBQUM7UUFFdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx1RUFBdUUsRUFBRSxHQUFHLEVBQUU7UUFDaEYsTUFBTSxNQUFNLEdBQUcsSUFBQSxpQ0FBYyxFQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0VBQWtFLEVBQUUsR0FBRyxFQUFFO1FBQzNFLE1BQU0sTUFBTSxHQUFHLElBQUEsaUNBQWMsRUFBQyxTQUFTLENBQUMsQ0FBQztRQUV6QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLHdFQUF3RSxFQUFFLEdBQUcsRUFBRTtRQUNqRixNQUFNLE1BQU0sR0FBRyxJQUFBLGlDQUFjLEVBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ2V0UmVkaXNQcmVmaXggfSBmcm9tICcuLi8uLi9zcmMvZ2V0LXJlZGlzLXByZWZpeCc7XG5cbmRlc2NyaWJlKGdldFJlZGlzUHJlZml4Lm5hbWUsICgpID0+IHtcblx0aXQoJ3Nob3VsZCByZXR1cm4gcHJlZml4IGZvbGxvd2VkIGJ5OiB3aGVuIGEgc3RyaW5nIGlzIGluZm9ybWVkIHRoYXQgbm90IGVuZHMgaW4gaXQnLCAoKSA9PiB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gZ2V0UmVkaXNQcmVmaXgoJ3Rlc3QnKTtcblxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoJ3Rlc3Q6Jyk7XG5cdH0pO1xuXG5cdGl0KCdzaG91bGQgcmV0dXJuIHByZWZpeCBhcyBpcyB3aGVuIGEgc3RyaW5nIGlzIGluZm9ybWVkIHRoYXQgZW5kcyB3aXRoIDonLCAoKSA9PiB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gZ2V0UmVkaXNQcmVmaXgoJ3Rlc3Q6Jyk7XG5cblx0XHRleHBlY3QocmVzdWx0KS50b0JlKCd0ZXN0OicpO1xuXHR9KTtcblxuXHRpdCgnc2hvdWxkIHJldHVybiBlbXB0eSBzdHJpbmcgd2hlbiB0aGUgaW5mb3JtZWQgcHJlZml4IGlzIHVuZGVmaW5lZCcsICgpID0+IHtcblx0XHRjb25zdCByZXN1bHQgPSBnZXRSZWRpc1ByZWZpeCh1bmRlZmluZWQpO1xuXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSgnJyk7XG5cdH0pO1xuXG5cdGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IHN0cmluZyB3aGVuIHRoZSBpbmZvcm1lZCBwcmVmaXggaXMgYW4gZW1wdHkgc3RyaW5nJywgKCkgPT4ge1xuXHRcdGNvbnN0IHJlc3VsdCA9IGdldFJlZGlzUHJlZml4KCcnKTtcblxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoJycpO1xuXHR9KTtcbn0pO1xuIl19