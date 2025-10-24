import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Achievement types and definitions
const ACHIEVEMENTS = {
  // Ride Achievements
  first_ride: { requirement: 1, reward: 10, type: "rides" },
  frequent_rider: { requirement: 10, reward: 50, type: "rides" },
  road_warrior: { requirement: 50, reward: 200, type: "rides" },
  first_drive: { requirement: 1, reward: 15, type: "drives" },
  reliable_driver: { requirement: 20, reward: 100, type: "rating" },

  // Eco Achievements
  eco_starter: { requirement: 10, reward: 25, type: "co2_saved" },
  carbon_saver: { requirement: 100, reward: 150, type: "co2_saved" },
  green_champion: { requirement: 500, reward: 300, type: "co2_saved" },

  // Social Achievements
  social_butterfly: { requirement: 50, reward: 30, type: "messages" },
  helpful_rider: { requirement: 10, reward: 75, type: "positive_reviews" },

  // Financial Achievements
  money_saver: { requirement: 100, reward: 50, type: "savings" },
  earner: { requirement: 500, reward: 100, type: "earnings" },
} as const;

export const checkAndAwardAchievements = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(), // "complete_ride", "receive_review", "send_message", etc.
    value: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const achievements: Array<{ id: string; reward: number }> = [];

    // Get user's current stats
    const allRides = await ctx.db.query("rides").collect();
    const userRides = allRides.filter(
      (ride) =>
        ride.driverId === args.userId ||
        (ride.passengers &&
          ride.passengers.some((p) => p.userId === args.userId))
    );

    const completedRides = userRides.filter((r) => r.status === "completed");
    const ridesAsDriver = completedRides.filter(
      (r) => r.driverId === args.userId
    );
    const ridesAsPassenger = completedRides.filter(
      (r) => r.passengers && r.passengers.some((p) => p.userId === args.userId)
    );

    // Check ride-based achievements
    if (args.action === "complete_ride") {
      const totalRides = completedRides.length;

      // First ride as passenger
      if (
        ridesAsPassenger.length === 1 &&
        !user.achievements?.includes("first_ride")
      ) {
        achievements.push({
          id: "first_ride",
          reward: ACHIEVEMENTS.first_ride.reward,
        });
      }

      // First ride as driver
      if (
        ridesAsDriver.length === 1 &&
        !user.achievements?.includes("first_drive")
      ) {
        achievements.push({
          id: "first_drive",
          reward: ACHIEVEMENTS.first_drive.reward,
        });
      }

      // Frequent rider (10 rides)
      if (totalRides >= 10 && !user.achievements?.includes("frequent_rider")) {
        achievements.push({
          id: "frequent_rider",
          reward: ACHIEVEMENTS.frequent_rider.reward,
        });
      }

      // Road warrior (50 rides)
      if (totalRides >= 50 && !user.achievements?.includes("road_warrior")) {
        achievements.push({
          id: "road_warrior",
          reward: ACHIEVEMENTS.road_warrior.reward,
        });
      }
    }

    // Check eco achievements
    if (args.action === "complete_ride" && args.value) {
      const currentCO2Saved = user.co2Saved || 0;
      const newCO2Saved = currentCO2Saved + args.value;

      // Eco starter (10kg CO2)
      if (
        newCO2Saved >= 10 &&
        currentCO2Saved < 10 &&
        !user.achievements?.includes("eco_starter")
      ) {
        achievements.push({
          id: "eco_starter",
          reward: ACHIEVEMENTS.eco_starter.reward,
        });
      }

      // Carbon saver (100kg CO2)
      if (
        newCO2Saved >= 100 &&
        currentCO2Saved < 100 &&
        !user.achievements?.includes("carbon_saver")
      ) {
        achievements.push({
          id: "carbon_saver",
          reward: ACHIEVEMENTS.carbon_saver.reward,
        });
      }

      // Green champion (500kg CO2)
      if (
        newCO2Saved >= 500 &&
        currentCO2Saved < 500 &&
        !user.achievements?.includes("green_champion")
      ) {
        achievements.push({
          id: "green_champion",
          reward: ACHIEVEMENTS.green_champion.reward,
        });
      }
    }

    // Award achievements and EcoCoins
    if (achievements.length > 0) {
      const currentAchievements = user.achievements || [];
      const newAchievements = [
        ...currentAchievements,
        ...achievements.map((a) => a.id),
      ];
      const totalReward = achievements.reduce((sum, a) => sum + a.reward, 0);
      const newEcoCoins = (user.ecoCoins || 0) + totalReward;

      await ctx.db.patch(args.userId, {
        achievements: newAchievements,
        ecoCoins: newEcoCoins,
      });

      // Create notification for each achievement
      for (const achievement of achievements) {
        await ctx.db.insert("notifications", {
          userId: args.userId,
          title: "Achievement Unlocked! 🏆",
          message: `You've earned the "${achievement.id}" achievement and ${achievement.reward} EcoCoins!`,
          type: "achievement",
          read: false,
          relatedId: achievement.id,
          createdAt: Date.now(),
        });
      }
    }

    return achievements;
  },
});

export const getUserAchievements = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    return user.achievements || [];
  },
});

export const getLeaderboard = query({
  args: {
    category: v.union(
      v.literal("ecoCoins"),
      v.literal("rides"),
      v.literal("earnings"),
      v.literal("co2_saved")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get all users with their stats
    const users = await ctx.db.query("users").collect();

    // Sort based on category
    let sortedUsers = users;

    switch (args.category) {
      case "ecoCoins":
        sortedUsers = users.sort(
          (a, b) => (b.ecoCoins || 0) - (a.ecoCoins || 0)
        );
        break;
      case "rides":
        sortedUsers = users.sort(
          (a, b) => (b.totalRides || 0) - (a.totalRides || 0)
        );
        break;
      case "earnings":
        // Would need to calculate from transactions
        sortedUsers = users.sort(
          (a, b) => (b.walletBalance || 0) - (a.walletBalance || 0)
        );
        break;
      case "co2_saved":
        sortedUsers = users.sort(
          (a, b) => (b.co2Saved || 0) - (a.co2Saved || 0)
        );
        break;
    }

    return sortedUsers.slice(0, limit).map((user, index) => ({
      userId: user._id,
      name: user.name,
      photo: user.photo,
      score:
        args.category === "ecoCoins"
          ? user.ecoCoins || 0
          : args.category === "rides"
            ? user.totalRides || 0
            : args.category === "earnings"
              ? user.walletBalance || 0
              : args.category === "co2_saved"
                ? user.co2Saved || 0
                : 0,
      rank: index + 1,
      level: user.level || 1,
      badges: user.badges || [],
    }));
  },
});

export const awardEcoCoins = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const newEcoCoins = (user.ecoCoins || 0) + args.amount;
    await ctx.db.patch(args.userId, {
      ecoCoins: newEcoCoins,
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "EcoCoins Earned! 🪙",
      message: `You've earned ${args.amount} EcoCoins for ${args.reason}`,
      type: "reward",
      read: false,
      createdAt: Date.now(),
    });

    return newEcoCoins;
  },
});

export const spendEcoCoins = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    item: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const currentEcoCoins = user.ecoCoins || 0;
    if (currentEcoCoins < args.amount) {
      throw new Error("Insufficient EcoCoins");
    }

    const newEcoCoins = currentEcoCoins - args.amount;
    await ctx.db.patch(args.userId, {
      ecoCoins: newEcoCoins,
    });

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromUserId: args.userId,
      toUserId: args.userId, // Self-transaction for eco coin spending
      amount: args.amount,
      type: "eco_coin_purchase",
      description: `Purchased ${args.item} with EcoCoins`,
      status: "completed",
      createdAt: Date.now(),
    });

    return newEcoCoins;
  },
});

export const getAvailableRewards = query({
  args: {},
  handler: async () => {
    // Mock rewards store - would be configurable
    return [
      {
        id: "ride_discount_10",
        name: "10% Ride Discount",
        description: "Get 10% off your next ride",
        cost: 50,
        icon: "discount",
        category: "rides",
      },
      {
        id: "priority_matching",
        name: "Priority Matching",
        description: "Get matched with rides 2x faster for 24 hours",
        cost: 100,
        icon: "priority",
        category: "convenience",
      },
      {
        id: "custom_badge",
        name: "Custom Profile Badge",
        description: "Show off with a special badge on your profile",
        cost: 200,
        icon: "badge",
        category: "customization",
      },
      {
        id: "carbon_certificate",
        name: "Carbon Impact Certificate",
        description: "Digital certificate of your environmental impact",
        cost: 10,
        icon: "certificate",
        category: "eco",
      },
    ];
  },
});

// Certificate management
export const generateCertificate = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    certificateData: v.object({
      userName: v.string(),
      userEmail: v.string(),
      co2Saved: v.number(),
      ridesCompleted: v.number(),
      totalDistance: v.number(),
      joinDate: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const certificateId = `NAVIO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = Date.now();
    const issuedDate = new Date().toISOString();

    // Check if user already has this type of certificate
    const existingCertificate = await ctx.db
      .query("certificates")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .first();

    const certificateData = {
      userId: args.userId,
      type: args.type,
      certificateId,
      data: {
        ...args.certificateData,
        issuedDate,
      },
      createdAt: now,
      updatedAt: now,
    };

    if (existingCertificate) {
      // Update existing certificate
      await ctx.db.patch(existingCertificate._id, {
        certificateId,
        data: certificateData.data,
        updatedAt: now,
      });
      return { ...certificateData, _id: existingCertificate._id };
    } else {
      // Create new certificate
      const id = await ctx.db.insert("certificates", certificateData);
      return { ...certificateData, _id: id };
    }
  },
});

export const getUserCertificate = query({
  args: {
    userId: v.id("users"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .first();
  },
});

export const getCertificateById = query({
  args: {
    certificateId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_certificate_id", (q) =>
        q.eq("certificateId", args.certificateId)
      )
      .first();
  },
});

export const getUserCertificates = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
