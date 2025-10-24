import { v } from "convex/values";
import { query } from "./_generated/server";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "rides" | "eco" | "social" | "financial";
  icon: string;
  requirement: number;
  reward: number; // EcoCoins
  isUnlocked: boolean;
  progress: number;
  progressMax: number;
  unlockedAt?: number;
}

interface UserStats {
  totalRides: number;
  completedRides: number;
  totalDistance: number;
  co2Saved: number;
  moneySaved: number;
  ecoCoins: number;
}

// Define all available achievements
const ACHIEVEMENTS_DEFINITIONS = [
  // Ride Achievements
  {
    id: "first_ride",
    title: "First Journey",
    description: "Complete your first ride",
    category: "rides" as const,
    icon: "car",
    requirement: 1,
    reward: 50,
    getProgress: (stats: UserStats) => stats.totalRides,
  },
  {
    id: "regular_rider",
    title: "Regular Rider",
    description: "Complete 10 rides",
    category: "rides" as const,
    icon: "users",
    requirement: 10,
    reward: 100,
    getProgress: (stats: UserStats) => stats.totalRides,
  },
  {
    id: "veteran_rider",
    title: "Veteran Rider",
    description: "Complete 50 rides",
    category: "rides" as const,
    icon: "trophy",
    requirement: 50,
    reward: 250,
    getProgress: (stats: UserStats) => stats.totalRides,
  },
  {
    id: "century_club",
    title: "Century Club",
    description: "Complete 100 rides",
    category: "rides" as const,
    icon: "medal",
    requirement: 100,
    reward: 500,
    getProgress: (stats: UserStats) => stats.totalRides,
  },

  // Eco Achievements
  {
    id: "carbon_saver",
    title: "Carbon Saver",
    description: "Save 10kg of CO₂ emissions",
    category: "eco" as const,
    icon: "leaf",
    requirement: 10,
    reward: 75,
    getProgress: (stats: UserStats) => Math.round(stats.co2Saved),
  },
  {
    id: "eco_warrior",
    title: "Eco Warrior",
    description: "Save 100kg of CO₂ emissions",
    category: "eco" as const,
    icon: "leaf",
    requirement: 100,
    reward: 200,
    getProgress: (stats: UserStats) => Math.round(stats.co2Saved),
  },
  {
    id: "planet_guardian",
    title: "Planet Guardian",
    description: "Save 500kg of CO₂ emissions",
    category: "eco" as const,
    icon: "award",
    requirement: 500,
    reward: 750,
    getProgress: (stats: UserStats) => Math.round(stats.co2Saved),
  },

  // Financial Achievements
  {
    id: "money_saver",
    title: "Money Saver",
    description: "Save ₹1,000 through carpooling",
    category: "financial" as const,
    icon: "dollar-sign",
    requirement: 1000,
    reward: 100,
    getProgress: (stats: UserStats) => stats.moneySaved,
  },
  {
    id: "coin_collector",
    title: "Coin Collector",
    description: "Earn 1,000 EcoCoins",
    category: "financial" as const,
    icon: "coins",
    requirement: 1000,
    reward: 150,
    getProgress: (stats: UserStats) => stats.ecoCoins,
  },
  {
    id: "coin_master",
    title: "Coin Master",
    description: "Earn 5,000 EcoCoins",
    category: "financial" as const,
    icon: "coins",
    requirement: 5000,
    reward: 500,
    getProgress: (stats: UserStats) => stats.ecoCoins,
  },

  // Social Achievements
  {
    id: "social_butterfly",
    title: "Social Butterfly",
    description: "Complete rides with 10 different people",
    category: "social" as const,
    icon: "users",
    requirement: 10,
    reward: 200,
    getProgress: (stats: UserStats) => Math.min(stats.totalRides, 10), // Simplified for now
  },
];

export const getUserAchievements = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user's actual stats
    const allRides = await ctx.db.query("rides").collect();

    const userRides = allRides.filter(
      (ride) =>
        ride.driverId === args.userId ||
        ride.passengers.some((p) => p.userId === args.userId)
    );

    const completedRides = userRides.filter(
      (ride) => ride.status === "completed"
    );

    // Calculate stats
    const totalRides = userRides.length;
    const totalDistance = completedRides.reduce(
      (sum, ride) => sum + (ride.distance || 0),
      0
    );

    const co2Saved = completedRides.reduce((sum, ride) => {
      const passengerCount = ride.passengers.length;
      const co2PerKm = 0.15;
      return sum + (ride.distance || 0) * passengerCount * co2PerKm;
    }, 0);

    let moneySaved = 0;
    let ecoCoinsEarned = 0;

    completedRides.forEach((ride) => {
      const passengerCount = ride.passengers.length;

      if (ride.driverId === args.userId) {
        ecoCoinsEarned += Math.round((ride.distance || 0) * passengerCount * 2);
      } else {
        const fullCost = (ride.distance || 0) * 8;
        const paidCost = ride.costPerPassenger || 0;
        moneySaved += Math.max(0, fullCost - paidCost);
        ecoCoinsEarned += Math.round((ride.distance || 0) * 2);
      }
    });

    const stats = {
      totalRides,
      completedRides: completedRides.length,
      totalDistance: Math.round(totalDistance),
      co2Saved,
      moneySaved: Math.round(moneySaved),
      ecoCoins: ecoCoinsEarned,
    };

    // Generate achievements based on stats
    const achievements: Achievement[] = ACHIEVEMENTS_DEFINITIONS.map((def) => {
      const progress = def.getProgress(stats);
      const isUnlocked = progress >= def.requirement;

      return {
        id: def.id,
        title: def.title,
        description: def.description,
        category: def.category,
        icon: def.icon,
        requirement: def.requirement,
        reward: def.reward,
        isUnlocked,
        progress: Math.min(progress, def.requirement),
        progressMax: def.requirement,
        unlockedAt: isUnlocked
          ? Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          : undefined, // Mock unlock time
      };
    });

    const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
    const totalEcoCoinsFromAchievements = achievements
      .filter((a) => a.isUnlocked)
      .reduce((sum, a) => sum + a.reward, 0);

    return {
      achievements,
      stats: {
        unlockedCount,
        totalCount: achievements.length,
        totalEcoCoinsFromAchievements,
        completionPercentage: Math.round(
          (unlockedCount / achievements.length) * 100
        ),
      },
    };
  },
});
