"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface UserRideStats {
  totalRides: number;
  totalDistance: number;
  co2Saved?: number;
  moneySaved?: number;
  completionRate: number;
  averageRating: number;
}

export interface RideLocation {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface RideDriver {
  name: string;
  photo?: string;
  trustScore: number;
  level: number;
}

export interface Ride {
  _id: string;
  startLocation: RideLocation;
  endLocation: RideLocation;
  departureTime: number;
  maxPassengers: number;
  passengers: Array<{ userId: string; status: string }>;
  costPerPassenger: number;
  driver?: RideDriver | null;
  status: string;
  completedAt?: number;
}

export interface UserAppData {
  user: any | null;
  rides: Ride[];
  rideStats: UserRideStats | null;
  financialStats: any | null;
  environmentalImpact: any | null;
  achievements: any[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAppContext(): UserAppData {
  const { user: clerkUser, isLoaded } = useUser();

  // Get user from convex by email
  const convexUser = useQuery(
    api.user.getUserByEmail,
    clerkUser?.emailAddresses[0]?.emailAddress
      ? { email: clerkUser.emailAddresses[0].emailAddress }
      : "skip"
  );

  // Get user's rides
  const userRides = useQuery(
    api.rides.getRidesByUser,
    convexUser && typeof convexUser === "object"
      ? { userId: convexUser._id as Id<"users"> }
      : "skip"
  );

  // Get ride statistics
  const rideStats = useQuery(
    api.analytics.getRideStats,
    convexUser && typeof convexUser === "object"
      ? {
          userId: convexUser._id as Id<"users">,
          timeframe: "30d" as const,
        }
      : "skip"
  );

  // Get financial statistics
  const financialStats = useQuery(
    api.analytics.getFinancialStats,
    convexUser && typeof convexUser === "object"
      ? {
          userId: convexUser._id as Id<"users">,
          timeframe: "30d" as const,
        }
      : "skip"
  );

  // Get environmental impact
  const environmentalImpact = useQuery(
    api.analytics.getEnvironmentalImpact,
    convexUser && typeof convexUser === "object"
      ? {
          userId: convexUser._id as Id<"users">,
          timeframe: "30d" as const,
        }
      : "skip"
  );

  // Get user achievements
  const achievements = useQuery(
    api.achievements.getUserAchievements,
    convexUser && typeof convexUser === "object"
      ? { userId: convexUser._id as Id<"users"> }
      : "skip"
  );

  const isAuthenticated =
    isLoaded && !!clerkUser && !!convexUser && typeof convexUser === "object";
  const isLoadingValue = !isLoaded || (clerkUser && convexUser === undefined);

  return {
    user: convexUser && typeof convexUser === "object" ? convexUser : null,
    rides: userRides || [],
    rideStats: rideStats || null,
    financialStats: financialStats || null,
    environmentalImpact: environmentalImpact || null,
    achievements: Array.isArray(achievements)
      ? achievements
      : achievements?.achievements || [],
    isAuthenticated,
    isLoading: !!isLoadingValue,
  };
}

// Helper functions to format app data for AI responses
export function formatUserStatsForAI(appData: UserAppData): string {
  if (!appData.isAuthenticated || !appData.user) {
    return "User is not authenticated or data is not available.";
  }

  const { user, rideStats, environmentalImpact, achievements } = appData;

  let summary = `User Profile:
- Name: ${user.name}
- Trust Score: ${user.trustScore || 70}/100
- Level: ${user.level || 1}
- EcoCoins: ${user.ecoCoins || 0}
- Total Rides: ${user.totalRides || 0}
`;

  if (rideStats) {
    summary += `
Recent Ride Statistics (Last 30 days):
- Total Rides: ${rideStats.totalRides}
- Distance Traveled: ${rideStats.totalDistance}km
- Completion Rate: ${rideStats.completionRate}%
- Average Rating: ${rideStats.averageRating}/5
`;
  }

  if (environmentalImpact) {
    summary += `
Environmental Impact:
- CO2 Saved: ${environmentalImpact.co2Saved || 0}kg
- Fuel Saved: ${environmentalImpact.fuelSaved || 0}L
- Money Saved: ₹${environmentalImpact.moneySaved || 0}
`;
  }

  if (achievements?.length > 0) {
    summary += `
Recent Achievements: ${achievements.map((a) => a.title || a.name).join(", ")}
`;
  }

  return summary;
}

export function formatUpcomingRidesForAI(rides: Ride[]): string {
  const upcomingRides = rides.filter(
    (ride) => ride.status === "scheduled" && ride.departureTime > Date.now()
  );

  if (upcomingRides.length === 0) {
    return "No upcoming rides scheduled.";
  }

  return `Upcoming Rides:
${upcomingRides
  .map((ride) => {
    const date = new Date(ride.departureTime);
    return `- ${ride.startLocation.name} to ${ride.endLocation.name} on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  })
  .join("\n")}`;
}

export function formatRecentRidesForAI(rides: Ride[]): string {
  const recentRides = rides
    .filter((ride) => ride.status === "completed" && ride.completedAt)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  if (recentRides.length === 0) {
    return "No recent completed rides.";
  }

  return `Recent Completed Rides:
${recentRides
  .map((ride) => {
    const date = new Date(ride.completedAt!);
    return `- ${ride.startLocation.name} to ${ride.endLocation.name} on ${date.toLocaleDateString()}`;
  })
  .join("\n")}`;
}

export function formatAvailableRidesForAI(rides: Ride[]): string {
  if (rides.length === 0) {
    return "No matching rides found for your destination.";
  }

  return `Available Rides Found:
${rides
  .map((ride) => {
    const date = new Date(ride.departureTime);
    const availableSeats = ride.maxPassengers - ride.passengers.length;
    return `🚗 ${ride.startLocation.name} → ${ride.endLocation.name}
   📅 ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}
   💺 ${availableSeats} seats available
   💰 ₹${ride.costPerPassenger} per person
   👤 Driver: ${ride.driver?.name || "Unknown"} (Trust: ${ride.driver?.trustScore || 70}/100)`;
  })
  .join("\n\n")}

Would you like me to help you book one of these rides?`;
}
