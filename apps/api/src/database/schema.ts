import * as auth from "./schema/auth";
import * as claims from "./schema/claims";
import * as media from "./schema/media";
import * as moderation from "./schema/moderation";
import * as places from "./schema/places";
import * as reviews from "./schema/reviews";

/** Tables only: relations and `db` need a plain table map. */
export const schema = {
	...auth,
	...claims,
	...media,
	...moderation,
	...places,
	...reviews,
};
