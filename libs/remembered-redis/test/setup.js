"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNames = getNames;
require("jest-callslike");
function getNames(c) {
    return new Proxy(c.prototype, {
        get(target, property) {
            const result = target[property];
            if (!result) {
                throw new Error(`Method ${property} doesn't exist`);
            }
            return result;
        },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDRCQVdDO0FBYkQsMEJBQXdCO0FBRXhCLFNBQWdCLFFBQVEsQ0FBbUIsQ0FBbUI7SUFDN0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO1FBQzdCLEdBQUcsQ0FBQyxNQUFTLEVBQUUsUUFBZ0I7WUFDOUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQW1CLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLFFBQVEsZ0JBQWdCLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO0tBQ0QsQ0FBQyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnamVzdC1jYWxsc2xpa2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TmFtZXM8VCBleHRlbmRzIG9iamVjdD4oYzogeyBwcm90b3R5cGU6IFQgfSk6IFQge1xuXHRyZXR1cm4gbmV3IFByb3h5KGMucHJvdG90eXBlLCB7XG5cdFx0Z2V0KHRhcmdldDogVCwgcHJvcGVydHk6IHN0cmluZykge1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gdGFyZ2V0W3Byb3BlcnR5IGFzIGtleW9mIFRdO1xuXHRcdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBNZXRob2QgJHtwcm9wZXJ0eX0gZG9lc24ndCBleGlzdGApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH0sXG5cdH0pO1xufVxuIl19