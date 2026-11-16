import type { Rating } from "./models/ratings.js";
import type { User, UserRole } from "./models/users.js";
import {
  userRoles,
  userLoginSchema,
  userRegistrationSchema,
} from "./models/users.js";
import type { Movie } from "./models/movies.js";

export type { Rating, User, UserRole, Movie };
export { userRoles, userLoginSchema, userRegistrationSchema };
