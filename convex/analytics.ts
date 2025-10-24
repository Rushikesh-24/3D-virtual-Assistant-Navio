import { v } from "convex/values";
import { query } from "./_generated/server";

export const getRideStats = query({
  args: {
    userId: v.id("users"),
    timeframe: v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("1y")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let startTime: number;

    // Calculate timeframe start
    switch (args.timeframe) {
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get all rides for the user in the timeframe
    const allRides = await ctx.db
      .query("rides")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    // Filter rides where user is driver or passenger
    const userRides = allRides.filter(
      (ride) =>
        ride.driverId === args.userId ||
        ride.passengers.some((p) => p.userId === args.userId)
    );

    const ridesAsDriver = userRides.filter(
      (ride) => ride.driverId === args.userId
    );
    const ridesAsPassenger = userRides.filter((ride) =>
      ride.passengers.some((p) => p.userId === args.userId)
    );

    // Calculate total distance
    const totalDistance = userRides.reduce((sum, ride) => {
      return sum + (ride.distance || 0);
    }, 0);

    // Calculate completion rate
    const completedRides = userRides.filter(
      (ride) => ride.status === "completed"
    );
    const completionRate =
      userRides.length > 0
        ? Math.round((completedRides.length / userRides.length) * 100)
        : 0;

    // Get user's trust score as a proxy for average rating
    const user = await ctx.db.get(args.userId);
    const averageRating = user?.trustScore
      ? Math.min(5, user.trustScore / 20)
      : 4.5;

    // Generate monthly breakdown for charts
    const monthlyData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 2; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ).getTime();
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getTime();

      const monthRides = userRides.filter(
        (ride) => ride.createdAt >= monthStart && ride.createdAt <= monthEnd
      );

      monthlyData.push({
        month: months[date.getMonth()],
        rides: monthRides.length,
      });
    }

    return {
      totalRides: userRides.length,
      totalDistance: Math.round(totalDistance),
      averageRating: Math.round(averageRating * 10) / 10,
      ridesAsDriver: ridesAsDriver.length,
      ridesAsPassenger: ridesAsPassenger.length,
      completionRate,
      ridesByMonth: monthlyData,
    };
  },
});

export const getFinancialStats = query({
  args: {
    userId: v.id("users"),
    timeframe: v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("1y")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let startTime: number;

    switch (args.timeframe) {
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get user transactions in timeframe
    const transactions = await ctx.db
      .query("transactions")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("fromUserId"), args.userId),
            q.eq(q.field("toUserId"), args.userId)
          ),
          q.gte(q.field("createdAt"), startTime)
        )
      )
      .collect();

    const earned = transactions
      .filter((t) => t.toUserId === args.userId && t.type === "payment")
      .reduce((sum, t) => sum + t.amount, 0);

    const spent = transactions
      .filter((t) => t.fromUserId === args.userId && t.type === "payment")
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = earned - spent;
    const avgEarningsPerRide =
      earned > 0
        ? Math.round(
            earned /
              transactions.filter((t) => t.toUserId === args.userId).length
          )
        : 0;

    // Get user's current wallet balance
    const user = await ctx.db.get(args.userId);
    const walletBalance = user?.walletBalance || 0;

    // Calculate EcoCoins earned (mock calculation)
    const ecoCoinsEarned = Math.round(earned * 0.1); // 10% of earnings as EcoCoins

    return {
      totalEarned: earned,
      totalSpent: spent,
      netIncome,
      avgEarningsPerRide,
      ecoCoinsEarned,
      walletBalance,
    };
  },
});

export const getEnvironmentalImpact = query({
  args: {
    userId: v.id("users"),
    timeframe: v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("1y")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let startTime: number;

    switch (args.timeframe) {
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    // Get user's rides in timeframe
    const allRides = await ctx.db
      .query("rides")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), startTime),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Filter rides where user is driver or passenger
    const userRides = allRides.filter(
      (ride) =>
        ride.driverId === args.userId ||
        ride.passengers.some((p) => p.userId === args.userId)
    );

    const totalDistance = userRides.reduce(
      (sum, ride) => sum + (ride.distance || 0),
      0
    );

    // Environmental impact calculations (estimates)
    const co2PerMile = 0.2; // kg CO2 per mile saved by carpooling
    const fuelPerMile = 0.08; // liters fuel saved per mile
    const treesPerTonCO2 = 15; // trees equivalent per ton of CO2

    const co2Saved = Math.round(totalDistance * co2PerMile * 10) / 10;
    const fuelSaved = Math.round(totalDistance * fuelPerMile * 10) / 10;
    const treesEquivalent = Math.round((co2Saved / 1000) * treesPerTonCO2);

    // Calculate eco score based on various factors
    const ridesCount = userRides.length;
    const avgDistance = ridesCount > 0 ? totalDistance / ridesCount : 0;
    const ecoScore = Math.min(
      100,
      Math.round(
        ridesCount * 10 + // 10 points per ride
          co2Saved * 2 + // 2 points per kg CO2 saved
          (avgDistance > 20 ? 20 : avgDistance) // bonus for longer rides
      )
    );

    const carbonFootprintReduction = Math.round(
      (co2Saved / (co2Saved + 100)) * 100
    ); // Percentage reduction

    return {
      co2Saved,
      fuelSaved,
      treesEquivalent,
      milesShared: Math.round(totalDistance),
      carbonFootprintReduction,
      ecoScore,
    };
  },
});

// Global platform statistics
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;

    // Get all completed rides
    const allRides = await ctx.db
      .query("rides")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const totalRides = allRides.length;

    // Calculate total distance and CO2 saved
    const totalDistance = allRides.reduce((sum, ride) => {
      return sum + (ride.distance || 0);
    }, 0);

    // Calculate total CO2 saved from all completed rides
    const totalCO2Saved = allRides.reduce((sum, ride) => {
      const passengerCount = ride.passengers.length;
      const co2PerKm = 0.15; // kg CO2 per km for average car
      return sum + (ride.distance || 0) * passengerCount * co2PerKm;
    }, 0);

    // Calculate total money saved (estimated)
    const totalMoneySaved = allRides.reduce((sum, ride) => {
      const passengerCount = ride.passengers.length;
      return sum + (ride.costPerPassenger || 0) * passengerCount;
    }, 0);

    // Calculate total certificates issued (users with completed rides)
    const usersWithCompletedRides = new Set();
    allRides.forEach((ride) => {
      usersWithCompletedRides.add(ride.driverId);
      ride.passengers.forEach((p) => usersWithCompletedRides.add(p.userId));
    });
    const totalCertificates = usersWithCompletedRides.size;

    return {
      totalUsers,
      totalRides,
      totalDistance: Math.round(totalDistance),
      totalCO2Saved: Math.round(totalCO2Saved * 10) / 10,
      totalMoneySaved: Math.round(totalMoneySaved),
      totalCertificates,
      activeUsers: totalUsers, // For now, assume all users are active
    };
  },
});

// Get actual user statistics from rides data
export const getUserActualStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all rides where user is driver or passenger
    const allRides = await ctx.db.query("rides").collect();

    const userRides = allRides.filter(
      (ride) =>
        ride.driverId === args.userId ||
        ride.passengers.some((p) => p.userId === args.userId)
    );

    const completedRides = userRides.filter(
      (ride) => ride.status === "completed"
    );

    // Calculate actual stats
    const totalRides = userRides.length;
    const totalCompletedRides = completedRides.length;

    const totalDistance = completedRides.reduce((sum, ride) => {
      return sum + (ride.distance || 0);
    }, 0);

    // Calculate CO2 saved from completed rides
    const co2Saved = completedRides.reduce((sum, ride) => {
      const passengerCount = ride.passengers.length;
      const co2PerKm = 0.15; // kg CO2 per km for average car
      return sum + (ride.distance || 0) * passengerCount * co2PerKm;
    }, 0);

    // Calculate money saved (for passengers) and earned (for drivers)
    let moneySaved = 0;
    let moneyEarned = 0;
    let ecoCoinsEarned = 0;

    completedRides.forEach((ride) => {
      const passengerCount = ride.passengers.length;

      if (ride.driverId === args.userId) {
        // User was driver - earned money
        moneyEarned += (ride.costPerPassenger || 0) * passengerCount;
        // EcoCoins for driver: 2 per km per passenger
        ecoCoinsEarned += Math.round((ride.distance || 0) * passengerCount * 2);
      } else {
        // User was passenger - saved money compared to solo travel
        const fullCost = (ride.distance || 0) * 8; // Estimated full cost per km
        const paidCost = ride.costPerPassenger || 0;
        moneySaved += Math.max(0, fullCost - paidCost);
        // EcoCoins for passenger: 2 per km
        ecoCoinsEarned += Math.round((ride.distance || 0) * 2);
      }
    });

    return {
      totalRides,
      completedRides: totalCompletedRides,
      totalDistance: Math.round(totalDistance),
      co2Saved: Math.round(co2Saved * 10) / 10,
      moneySaved: Math.round(moneySaved),
      moneyEarned: Math.round(moneyEarned),
      ecoCoins: ecoCoinsEarned,
      level: Math.floor(ecoCoinsEarned / 1000) + 1, // Level based on EcoCoins
      badges: generateBadges(totalRides, co2Saved, ecoCoinsEarned),
    };
  },
});

// Helper function to generate badges based on achievements
function generateBadges(
  totalRides: number,
  co2Saved: number,
  ecoCoins: number
): string[] {
  const badges: string[] = [];

  // Ride-based badges
  if (totalRides >= 1) badges.push("First Ride");
  if (totalRides >= 10) badges.push("Regular Rider");
  if (totalRides >= 50) badges.push("Veteran Rider");
  if (totalRides >= 100) badges.push("Century Club");

  // Environmental badges
  if (co2Saved >= 10) badges.push("Carbon Saver");
  if (co2Saved >= 100) badges.push("Eco Warrior");
  if (co2Saved >= 500) badges.push("Planet Guardian");

  // EcoCoins badges
  if (ecoCoins >= 1000) badges.push("Coin Collector");
  if (ecoCoins >= 5000) badges.push("Coin Master");
  if (ecoCoins >= 10000) badges.push("Eco Millionaire");

  return badges;
}
