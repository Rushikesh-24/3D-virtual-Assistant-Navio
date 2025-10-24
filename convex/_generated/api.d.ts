/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as analytics from "../analytics.js";
import type * as circles from "../circles.js";
import type * as gamification from "../gamification.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as rides from "../rides.js";
import type * as tracking from "../tracking.js";
import type * as transactions from "../transactions.js";
import type * as user from "../user.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  analytics: typeof analytics;
  circles: typeof circles;
  gamification: typeof gamification;
  messages: typeof messages;
  notifications: typeof notifications;
  rides: typeof rides;
  tracking: typeof tracking;
  transactions: typeof transactions;
  user: typeof user;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
