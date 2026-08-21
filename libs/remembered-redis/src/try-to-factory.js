"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryToFactory = tryToFactory;
function tryToFactory(logError) {
    return async function (action) {
        try {
            return await action();
        }
        catch (err) {
            logError?.(err.message);
            return undefined;
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ5LXRvLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cnktdG8tZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLG9DQVNDO0FBVEQsU0FBZ0IsWUFBWSxDQUFDLFFBQThCO0lBQzFELE9BQU8sS0FBSyxXQUFjLE1BQWlCO1FBQzFDLElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxNQUFNLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNuQixRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUMsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBY3Rpb24sIExvZ0Vycm9yLCBUcnlUbyB9IGZyb20gJy4vcmVtZW1iZXJlZC1yZWRpcy1jb25maWcnO1xuXG5leHBvcnQgZnVuY3Rpb24gdHJ5VG9GYWN0b3J5KGxvZ0Vycm9yOiBMb2dFcnJvciB8IHVuZGVmaW5lZCk6IFRyeVRvIHtcblx0cmV0dXJuIGFzeW5jIGZ1bmN0aW9uIDxUPihhY3Rpb246IEFjdGlvbjxUPikge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgYWN0aW9uKCk7XG5cdFx0fSBjYXRjaCAoZXJyOiBhbnkpIHtcblx0XHRcdGxvZ0Vycm9yPy4oZXJyLm1lc3NhZ2UpO1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cdH07XG59XG4iXX0=