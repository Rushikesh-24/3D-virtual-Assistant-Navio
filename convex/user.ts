import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    photo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUser) {
      throw new Error("User with the same email already exists");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phone: args.phone || "",
      gender: args.gender,
      photo: args.photo,
      verified: false,
      trustScore: 70, // Starting trust score
      ecoCoins: 100, // Welcome EcoCoins
      level: 1,
      badges: [],
      totalRides: 0,
      co2Saved: 0,
      fuelSaved: 0,
      moneySaved: 0,
      walletBalance: 0,
      aadhaarVerified: false,
      dlVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    return user || false;
  },
});

export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      gender: v.optional(v.string()),
      photo: v.optional(v.string()),
      homeLocation: v.optional(
        v.object({
          name: v.string(),
          lat: v.number(),
          lng: v.number(),
        })
      ),
      workLocation: v.optional(
        v.object({
          name: v.string(),
          lat: v.number(),
          lng: v.number(),
        })
      ),
      usualCommuteTime: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const updateUserStats = mutation({
  args: {
    userId: v.id("users"),
    stats: v.object({
      totalRides: v.optional(v.number()),
      co2Saved: v.optional(v.number()),
      fuelSaved: v.optional(v.number()),
      moneySaved: v.optional(v.number()),
      ecoCoins: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const updatedStats = {
      totalRides: (user.totalRides || 0) + (args.stats.totalRides || 0),
      co2Saved: (user.co2Saved || 0) + (args.stats.co2Saved || 0),
      fuelSaved: (user.fuelSaved || 0) + (args.stats.fuelSaved || 0),
      moneySaved: (user.moneySaved || 0) + (args.stats.moneySaved || 0),
      ecoCoins: (user.ecoCoins || 0) + (args.stats.ecoCoins || 0),
    };

    // Calculate new level
    const newLevel = Math.floor(updatedStats.ecoCoins / 1000) + 1;

    // Calculate badges
    const badges: string[] = [];
    if (updatedStats.totalRides >= 10) badges.push("Regular Rider");
    if (updatedStats.totalRides >= 50) badges.push("Veteran Rider");
    if (updatedStats.totalRides >= 100) badges.push("Century Club");
    if (updatedStats.co2Saved >= 100) badges.push("Carbon Saver");
    if (updatedStats.co2Saved >= 500) badges.push("Eco Warrior");
    if (updatedStats.ecoCoins >= 5000) badges.push("Coin Master");

    await ctx.db.patch(args.userId, {
      ...updatedStats,
      level: newLevel,
      badges,
      updatedAt: Date.now(),
    });

    return { level: newLevel, badges };
  },
});

export const updateWalletBalance = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // positive for credit, negative for debit
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const newBalance = (user.walletBalance || 0) + args.amount;
    if (newBalance < 0) throw new Error("Insufficient balance");

    await ctx.db.patch(args.userId, {
      walletBalance: newBalance,
      updatedAt: Date.now(),
    });

    return newBalance;
  },
});

export const setVerification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("aadhaar"), v.literal("dl")),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const patch: any = { updatedAt: Date.now() };
    if (args.type === "aadhaar") {
      patch.aadhaarVerified = args.verified;
    } else if (args.type === "dl") {
      patch.dlVerified = args.verified;
    }

    await ctx.db.patch(args.userId, patch);
    return true;
  },
});

export const getLeaderboard = query({
  args: {
    type: v.string(), // "ecoCoins", "co2Saved", "totalRides"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const field = args.type as "ecoCoins" | "co2Saved" | "totalRides";

    // Get all users and sort by the specified field
    const users = await ctx.db.query("users").collect();

    return users
      .filter((user) => (user[field] || 0) > 0)
      .sort((a, b) => (b[field] || 0) - (a[field] || 0))
      .slice(0, limit)
      .map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        name: user.name,
        photo: user.photo,
        value: user[field] || 0,
        level: user.level || 1,
        badges: user.badges || [],
      }));
  },
});

export const getUsersByCircle = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("circleId"), args.circleId))
      .collect();
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const users = await ctx.db.query("users").collect();

    return users
      .filter(
        (user) =>
          user.name.toLowerCase().includes(args.query.toLowerCase()) ||
          user.email.toLowerCase().includes(args.query.toLowerCase())
      )
      .slice(0, limit)
      .map((user) => ({
        userId: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        trustScore: user.trustScore || 70,
        level: user.level || 1,
        circleId: user.circleId,
      }));
  },
});
