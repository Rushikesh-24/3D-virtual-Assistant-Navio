import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createCircle = mutation({
  args: {
    name: v.string(),
    type: v.string(), // "college", "company", "housing"
    description: v.optional(v.string()),
    location: v.optional(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
      })
    ),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const circleId = await ctx.db.insert("circles", {
      name: args.name,
      type: args.type,
      description: args.description,
      location: args.location,
      createdBy: args.createdBy,
      verified: false,
      memberCount: 1,
      createdAt: Date.now(),
    });

    // Add creator to the circle
    await ctx.db.patch(args.createdBy, {
      circleId,
      updatedAt: Date.now(),
    });

    return circleId;
  },
});

export const joinCircle = mutation({
  args: {
    circleId: v.id("circles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const circle = await ctx.db.get(args.circleId);
    if (!circle) throw new Error("Circle not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    if (user.circleId) {
      throw new Error("User is already part of a circle");
    }

    // Update user's circle
    await ctx.db.patch(args.userId, {
      circleId: args.circleId,
      updatedAt: Date.now(),
    });

    // Update circle member count
    await ctx.db.patch(args.circleId, {
      memberCount: circle.memberCount + 1,
    });

    return true;
  },
});

export const leaveCircle = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.circleId) {
      throw new Error("User is not part of any circle");
    }

    const circle = await ctx.db.get(user.circleId);
    if (circle) {
      await ctx.db.patch(user.circleId, {
        memberCount: Math.max(0, circle.memberCount - 1),
      });
    }

    await ctx.db.patch(args.userId, {
      circleId: undefined,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const getCircleById = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.circleId);
  },
});

export const getCirclesByType = query({
  args: {
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("circles")
      .filter((q) => q.eq(q.field("type"), args.type))
      .order("desc")
      .take(limit);
  },
});

export const searchCircles = query({
  args: {
    query: v.string(),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const circles = await ctx.db.query("circles").collect();

    return circles
      .filter((circle) => {
        const matchesQuery =
          circle.name.toLowerCase().includes(args.query.toLowerCase()) ||
          circle.description
            ?.toLowerCase()
            .includes(args.query.toLowerCase()) ||
          false;
        const matchesType = !args.type || circle.type === args.type;
        return matchesQuery && matchesType;
      })
      .slice(0, limit);
  },
});

export const getCircleMembers = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("circleId"), args.circleId))
      .collect();

    return members.map((member) => ({
      userId: member._id,
      name: member.name,
      photo: member.photo,
      trustScore: member.trustScore || 70,
      level: member.level || 1,
      totalRides: member.totalRides || 0,
    }));
  },
});

export const getCircleLeaderboard = query({
  args: {
    circleId: v.id("circles"),
    type: v.string(), // "ecoCoins", "co2Saved", "totalRides"
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("circleId"), args.circleId))
      .collect();

    const field = args.type as "ecoCoins" | "co2Saved" | "totalRides";

    return members
      .filter((member) => (member[field] || 0) > 0)
      .sort((a, b) => (b[field] || 0) - (a[field] || 0))
      .slice(0, 10)
      .map((member, index) => ({
        rank: index + 1,
        userId: member._id,
        name: member.name,
        photo: member.photo,
        value: member[field] || 0,
        level: member.level || 1,
      }));
  },
});
