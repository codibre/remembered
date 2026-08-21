"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const try_to_factory_1 = require("../../src/try-to-factory");
describe(try_to_factory_1.tryToFactory.name, () => {
    let logError;
    beforeEach(() => {
        logError = jest.fn();
    });
    it('should return a function that runs the action', async () => {
        const callback = (0, try_to_factory_1.tryToFactory)(logError);
        const action = jest.fn().mockResolvedValue('test');
        const result = await callback(action);
        expect(action).toHaveCallsLike([]);
        expect(logError).toHaveCallsLike();
        expect(result).toBe('test');
    });
    it('should return a function that runs the action and log an error, if the action throws one', async () => {
        const callback = (0, try_to_factory_1.tryToFactory)(logError);
        const action = jest.fn().mockImplementation(async () => {
            throw new Error('my error');
        });
        const result = await callback(action);
        expect(action).toHaveCallsLike([]);
        expect(logError).toHaveCallsLike(['my error']);
        expect(result).toBeUndefined();
    });
    it('should return a function that runs the action and do not log an error, if the action throws one and logError is undefined', async () => {
        const callback = (0, try_to_factory_1.tryToFactory)(undefined);
        const action = jest.fn().mockImplementation(async () => {
            throw new Error('my error');
        });
        const result = await callback(action);
        expect(action).toHaveCallsLike([]);
        expect(result).toBeUndefined();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ5LXRvLWZhY3Rvcnkuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyeS10by1mYWN0b3J5LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw2REFBd0Q7QUFFeEQsUUFBUSxDQUFDLDZCQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtJQUNoQyxJQUFJLFFBQWtCLENBQUM7SUFFdkIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUQsTUFBTSxRQUFRLEdBQUcsSUFBQSw2QkFBWSxFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVuRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV0QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDBGQUEwRixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pHLE1BQU0sUUFBUSxHQUFHLElBQUEsNkJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXRDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDJIQUEySCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFJLE1BQU0sUUFBUSxHQUFHLElBQUEsNkJBQVksRUFBQyxTQUFTLENBQUMsQ0FBQztRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXRDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dFcnJvciB9IGZyb20gJy4uLy4uL3NyYyc7XG5pbXBvcnQgeyB0cnlUb0ZhY3RvcnkgfSBmcm9tICcuLi8uLi9zcmMvdHJ5LXRvLWZhY3RvcnknO1xuXG5kZXNjcmliZSh0cnlUb0ZhY3RvcnkubmFtZSwgKCkgPT4ge1xuXHRsZXQgbG9nRXJyb3I6IExvZ0Vycm9yO1xuXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xuXHRcdGxvZ0Vycm9yID0gamVzdC5mbigpO1xuXHR9KTtcblxuXHRpdCgnc2hvdWxkIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgcnVucyB0aGUgYWN0aW9uJywgYXN5bmMgKCkgPT4ge1xuXHRcdGNvbnN0IGNhbGxiYWNrID0gdHJ5VG9GYWN0b3J5KGxvZ0Vycm9yKTtcblx0XHRjb25zdCBhY3Rpb24gPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoJ3Rlc3QnKTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNhbGxiYWNrKGFjdGlvbik7XG5cblx0XHRleHBlY3QoYWN0aW9uKS50b0hhdmVDYWxsc0xpa2UoW10pO1xuXHRcdGV4cGVjdChsb2dFcnJvcikudG9IYXZlQ2FsbHNMaWtlKCk7XG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZSgndGVzdCcpO1xuXHR9KTtcblxuXHRpdCgnc2hvdWxkIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgcnVucyB0aGUgYWN0aW9uIGFuZCBsb2cgYW4gZXJyb3IsIGlmIHRoZSBhY3Rpb24gdGhyb3dzIG9uZScsIGFzeW5jICgpID0+IHtcblx0XHRjb25zdCBjYWxsYmFjayA9IHRyeVRvRmFjdG9yeShsb2dFcnJvcik7XG5cdFx0Y29uc3QgYWN0aW9uID0gamVzdC5mbigpLm1vY2tJbXBsZW1lbnRhdGlvbihhc3luYyAoKSA9PiB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ215IGVycm9yJyk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBjYWxsYmFjayhhY3Rpb24pO1xuXG5cdFx0ZXhwZWN0KGFjdGlvbikudG9IYXZlQ2FsbHNMaWtlKFtdKTtcblx0XHRleHBlY3QobG9nRXJyb3IpLnRvSGF2ZUNhbGxzTGlrZShbJ215IGVycm9yJ10pO1xuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmVVbmRlZmluZWQoKTtcblx0fSk7XG5cblx0aXQoJ3Nob3VsZCByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHJ1bnMgdGhlIGFjdGlvbiBhbmQgZG8gbm90IGxvZyBhbiBlcnJvciwgaWYgdGhlIGFjdGlvbiB0aHJvd3Mgb25lIGFuZCBsb2dFcnJvciBpcyB1bmRlZmluZWQnLCBhc3luYyAoKSA9PiB7XG5cdFx0Y29uc3QgY2FsbGJhY2sgPSB0cnlUb0ZhY3RvcnkodW5kZWZpbmVkKTtcblx0XHRjb25zdCBhY3Rpb24gPSBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKGFzeW5jICgpID0+IHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignbXkgZXJyb3InKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNhbGxiYWNrKGFjdGlvbik7XG5cblx0XHRleHBlY3QoYWN0aW9uKS50b0hhdmVDYWxsc0xpa2UoW10pO1xuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmVVbmRlZmluZWQoKTtcblx0fSk7XG59KTtcbiJdfQ==