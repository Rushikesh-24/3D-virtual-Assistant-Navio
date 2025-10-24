import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createRide = mutation({
  args: {
    driverId: v.id("users"),
    startLocation: v.object({
      name: v.string(),
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
    }),
    endLocation: v.object({
      name: v.string(),
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
    }),
    departureTime: v.number(),
    distance: v.number(),
    estimatedCost: v.number(),
    maxPassengers: v.number(),
    isRecurring: v.optional(v.boolean()),
    recurringDays: v.optional(v.array(v.string())),
    vehicleInfo: v.optional(
      v.object({
        make: v.string(),
        model: v.string(),
        color: v.string(),
        licensePlate: v.string(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const costPerPassenger = Math.round(
      args.estimatedCost / args.maxPassengers
    );

    const rideId = await ctx.db.insert("rides", {
      driverId: args.driverId,
      passengers: [],
      startLocation: args.startLocation,
      endLocation: args.endLocation,
      departureTime: args.departureTime,
      distance: args.distance,
      estimatedCost: args.estimatedCost,
      costPerPassenger,
      maxPassengers: args.maxPassengers,
      status: "scheduled",
      isRecurring: args.isRecurring,
      recurringDays: args.recurringDays,
      vehicleInfo: args.vehicleInfo,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return rideId;
  },
});

export const requestRide = mutation({
  args: {
    rideId: v.id("rides"),
    passengerId: v.id("users"),
    message: v.optional(v.string()),
    preferredPaymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    if (ride.passengers.length >= ride.maxPassengers) {
      throw new Error("Ride is full");
    }

    // Check if user already requested this ride
    const existingRequest = await ctx.db
      .query("rideRequests")
      .filter((q) =>
        q.and(
          q.eq(q.field("rideId"), args.rideId),
          q.eq(q.field("passengerId"), args.passengerId)
        )
      )
      .first();

    if (existingRequest) {
      throw new Error("You have already requested this ride");
    }

    await ctx.db.insert("rideRequests", {
      rideId: args.rideId,
      passengerId: args.passengerId,
      status: "pending",
      requestedAt: Date.now(),
      message: args.message,
      preferredPaymentMethod: args.preferredPaymentMethod,
    });

    // Create notification for driver
    await ctx.db.insert("notifications", {
      userId: ride.driverId,
      title: "New Ride Request",
      message: "Someone wants to join your ride",
      type: "ride_request",
      read: false,
      relatedId: args.rideId,
      createdAt: Date.now(),
    });

    return true;
  },
});

export const respondToRideRequest = mutation({
  args: {
    requestId: v.id("rideRequests"),
    response: v.string(), // "approved" or "declined"
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    const ride = await ctx.db.get(request.rideId);
    if (!ride) throw new Error("Ride not found");

    await ctx.db.patch(args.requestId, {
      status: args.response,
      respondedAt: Date.now(),
    });

    if (args.response === "approved") {
      // Get passenger details for payment processing
      const passenger = await ctx.db.get(request.passengerId);
      if (!passenger) throw new Error("Passenger not found");

      // Process payment based on preferred method
      if (request.preferredPaymentMethod === "wallet") {
        // Check if passenger has sufficient balance
        if ((passenger.walletBalance || 0) < ride.costPerPassenger) {
          throw new Error("Insufficient wallet balance");
        }

        // Deduct from passenger's wallet
        await ctx.db.patch(request.passengerId, {
          walletBalance: (passenger.walletBalance || 0) - ride.costPerPassenger,
          updatedAt: Date.now(),
        });

        // Add to driver's wallet
        const driver = await ctx.db.get(ride.driverId);
        if (driver) {
          await ctx.db.patch(ride.driverId, {
            walletBalance: (driver.walletBalance || 0) + ride.costPerPassenger,
            updatedAt: Date.now(),
          });
        }

        // Create transaction record
        await ctx.db.insert("transactions", {
          fromUserId: request.passengerId,
          toUserId: ride.driverId,
          rideId: request.rideId,
          amount: ride.costPerPassenger,
          type: "payment",
          status: "completed",
          description: `Payment for ride from ${ride.startLocation.name} to ${ride.endLocation.name}`,
          createdAt: Date.now(),
        });
      }

      // Add passenger to ride
      const updatedPassengers = [
        ...ride.passengers,
        {
          userId: request.passengerId,
          status: "approved",
          joinedAt: Date.now(),
        },
      ];

      await ctx.db.patch(request.rideId, {
        passengers: updatedPassengers,
        updatedAt: Date.now(),
      });
    }

    // Create notification for passenger
    await ctx.db.insert("notifications", {
      userId: request.passengerId,
      title:
        args.response === "approved"
          ? "Ride Request Approved!"
          : "Ride Request Declined",
      message:
        args.response === "approved"
          ? "Your ride request has been approved"
          : "Your ride request was declined",
      type: "ride_approved",
      read: false,
      relatedId: request.rideId,
      createdAt: Date.now(),
    });

    return true;
  },
});

export const startRide = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    await ctx.db.patch(args.rideId, {
      status: "active",
      actualStartTime: Date.now(),
      currentLocation: {
        lat: ride.startLocation.lat,
        lng: ride.startLocation.lng,
        timestamp: Date.now(),
        speed: 0,
        heading: 0,
      },
      updatedAt: Date.now(),
    });

    // Notify all passengers
    for (const passenger of ride.passengers) {
      await ctx.db.insert("notifications", {
        userId: passenger.userId,
        title: "Ride Started!",
        message: "Your ride has started. Track it live!",
        type: "ride_started",
        read: false,
        relatedId: args.rideId,
        createdAt: Date.now(),
      });
    }

    return true;
  },
});

// Auto-start rides that have passed their departure time
export const autoStartScheduledRides = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const scheduledRides = await ctx.db
      .query("rides")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.lt(q.field("departureTime"), now)
        )
      )
      .collect();

    const startedRides = [];

    for (const ride of scheduledRides) {
      // Only auto-start if departure time was within the last 30 minutes
      // This prevents very old rides from being started
      const timeSinceDeparture = now - ride.departureTime;
      if (timeSinceDeparture <= 30 * 60 * 1000) {
        // 30 minutes
        await ctx.db.patch(ride._id, {
          status: "active",
          actualStartTime: now,
          currentLocation: {
            lat: ride.startLocation.lat,
            lng: ride.startLocation.lng,
            timestamp: now,
            speed: 0,
            heading: 0,
          },
          updatedAt: now,
        });

        // Notify all passengers
        for (const passenger of ride.passengers) {
          await ctx.db.insert("notifications", {
            userId: passenger.userId,
            title: "Ride Started!",
            message: "Your ride has started automatically. Track it live!",
            type: "ride_started",
            read: false,
            relatedId: ride._id,
            createdAt: now,
          });
        }

        startedRides.push(ride._id);
      }
    }

    return { startedRides: startedRides.length };
  },
});

// Simulate vehicle movement for active rides
export const simulateVehicleMovement = mutation({
  args: {},
  handler: async (ctx) => {
    const activeRides = await ctx.db
      .query("rides")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const updatedRides = [];

    for (const ride of activeRides) {
      if (!ride.currentLocation) continue;

      const currentLat = ride.currentLocation.lat;
      const currentLng = ride.currentLocation.lng;
      const targetLat = ride.endLocation.lat;
      const targetLng = ride.endLocation.lng;

      // Calculate distance to destination
      const distanceToDestination = calculateDistance(
        currentLat,
        currentLng,
        targetLat,
        targetLng
      );

      // If very close to destination (within 100m), complete the ride
      if (distanceToDestination < 0.1) {
        await ctx.db.patch(ride._id, {
          status: "completed",
          arrivalTime: Date.now(),
          updatedAt: Date.now(),
        });

        // Notify completion
        for (const passenger of ride.passengers) {
          await ctx.db.insert("notifications", {
            userId: passenger.userId,
            title: "Ride Completed!",
            message:
              "You have arrived at your destination. Thank you for riding with us!",
            type: "ride_completed",
            read: false,
            relatedId: ride._id,
            createdAt: Date.now(),
          });
        }

        updatedRides.push({ rideId: ride._id, status: "completed" });
        continue;
      }

      // Simulate movement towards destination
      const speed = 30 + Math.random() * 20; // 30-50 km/h
      const timeStep = 30; // 30 seconds
      const distanceStep = (speed * timeStep) / 3600; // distance in km for 30 seconds

      // Calculate new position
      const bearing = calculateBearing(
        currentLat,
        currentLng,
        targetLat,
        targetLng
      );
      const newPosition = moveTowards(
        currentLat,
        currentLng,
        targetLat,
        targetLng,
        distanceStep
      );

      // Add some random variation to make movement more realistic
      const randomOffset = 0.0005; // ~50m
      const newLat = newPosition.lat + (Math.random() - 0.5) * randomOffset;
      const newLng = newPosition.lng + (Math.random() - 0.5) * randomOffset;

      await ctx.db.patch(ride._id, {
        currentLocation: {
          lat: newLat,
          lng: newLng,
          timestamp: Date.now(),
          speed: Math.round(speed),
          heading: Math.round(bearing),
        },
        updatedAt: Date.now(),
      });

      updatedRides.push({
        rideId: ride._id,
        status: "moving",
        distanceRemaining: distanceToDestination,
        speed: Math.round(speed),
      });
    }

    return { updatedRides: updatedRides.length, rides: updatedRides };
  },
});

// Helper functions for movement simulation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  let bearing = Math.atan2(y, x);
  bearing = ((bearing * 180) / Math.PI + 360) % 360; // Convert to degrees
  return bearing;
}

function moveTowards(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  distanceKm: number
): { lat: number; lng: number } {
  const R = 6371; // Earth's radius in km
  const bearing = calculateBearing(
    currentLat,
    currentLng,
    targetLat,
    targetLng
  );
  const bearingRad = toRadians(bearing);

  const lat1Rad = toRadians(currentLat);
  const lon1Rad = toRadians(currentLng);

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(distanceKm / R) +
      Math.cos(lat1Rad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
  );

  const lon2Rad =
    lon1Rad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(lat1Rad),
      Math.cos(distanceKm / R) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  return {
    lat: (lat2Rad * 180) / Math.PI,
    lng: (lon2Rad * 180) / Math.PI,
  };
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export const completeRide = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    await ctx.db.patch(args.rideId, {
      status: "completed",
      arrivalTime: Date.now(),
      updatedAt: Date.now(),
    });

    // Process payments and update stats
    const passengerCount = ride.passengers.length;
    const ecoCoinsPerPerson = Math.round(ride.distance * 2);
    const co2Saved = ride.distance * 0.15 * passengerCount;

    // Update driver stats
    const driver = await ctx.db.get(ride.driverId);
    if (driver) {
      await ctx.db.patch(ride.driverId, {
        totalRides: (driver.totalRides || 0) + 1,
        ecoCoins: (driver.ecoCoins || 0) + ecoCoinsPerPerson,
        co2Saved: (driver.co2Saved || 0) + co2Saved,
        walletBalance:
          (driver.walletBalance || 0) + ride.costPerPassenger * passengerCount,
        updatedAt: Date.now(),
      });

      // TODO: Integrate with gamification system for achievement checking
      // This would trigger achievements like "first_ride", "frequent_rider", etc.
    }

    // Update passenger stats and process payments
    for (const passenger of ride.passengers) {
      const passengerUser = await ctx.db.get(passenger.userId);
      if (passengerUser) {
        await ctx.db.patch(passenger.userId, {
          totalRides: (passengerUser.totalRides || 0) + 1,
          ecoCoins: (passengerUser.ecoCoins || 0) + ecoCoinsPerPerson,
          co2Saved: (passengerUser.co2Saved || 0) + co2Saved,
          walletBalance:
            (passengerUser.walletBalance || 0) - ride.costPerPassenger,
          moneySaved:
            (passengerUser.moneySaved || 0) + ride.costPerPassenger * 0.5, // 50% savings
          updatedAt: Date.now(),
        });

        // Create transaction record
        await ctx.db.insert("transactions", {
          fromUserId: passenger.userId,
          toUserId: ride.driverId,
          rideId: args.rideId,
          amount: ride.costPerPassenger,
          type: "payment",
          status: "completed",
          description: `Payment for ride from ${ride.startLocation.name} to ${ride.endLocation.name}`,
          createdAt: Date.now(),
        });

        // Create notification
        await ctx.db.insert("notifications", {
          userId: passenger.userId,
          title: "Ride Completed!",
          message: `You earned ${ecoCoinsPerPerson} EcoCoins for this eco-friendly ride!`,
          type: "ride_completed",
          read: false,
          relatedId: args.rideId,
          createdAt: Date.now(),
        });
      }
    }

    return true;
  },
});

export const updateRide = mutation({
  args: {
    rideId: v.id("rides"),
    userId: v.id("users"),
    startLocation: v.optional(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
        address: v.optional(v.string()),
      })
    ),
    endLocation: v.optional(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
        address: v.optional(v.string()),
      })
    ),
    departureTime: v.optional(v.number()),
    distance: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    maxPassengers: v.optional(v.number()),
    isRecurring: v.optional(v.boolean()),
    recurringDays: v.optional(v.array(v.string())),
    vehicleInfo: v.optional(
      v.object({
        make: v.string(),
        model: v.string(),
        color: v.string(),
        licensePlate: v.string(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    if (ride.driverId !== args.userId) {
      throw new Error("Only the driver can update the ride");
    }

    if (ride.status !== "scheduled") {
      throw new Error("Cannot update a ride that is not scheduled");
    }

    // Calculate new cost per passenger if cost or max passengers changed
    let costPerPassenger = ride.costPerPassenger;
    if (args.estimatedCost !== undefined || args.maxPassengers !== undefined) {
      const newCost = args.estimatedCost ?? ride.estimatedCost;
      const newMaxPassengers = args.maxPassengers ?? ride.maxPassengers;
      costPerPassenger = Math.round(newCost / newMaxPassengers);
    }

    // Prepare update object with only provided fields
    const updateData: Partial<{
      startLocation: typeof args.startLocation;
      endLocation: typeof args.endLocation;
      departureTime: number;
      distance: number;
      estimatedCost: number;
      maxPassengers: number;
      isRecurring: boolean;
      recurringDays: string[];
      vehicleInfo: typeof args.vehicleInfo;
      notes: string;
      costPerPassenger: number;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
      costPerPassenger,
    };

    if (args.startLocation !== undefined)
      updateData.startLocation = args.startLocation;
    if (args.endLocation !== undefined)
      updateData.endLocation = args.endLocation;
    if (args.departureTime !== undefined)
      updateData.departureTime = args.departureTime;
    if (args.distance !== undefined) updateData.distance = args.distance;
    if (args.estimatedCost !== undefined)
      updateData.estimatedCost = args.estimatedCost;
    if (args.maxPassengers !== undefined)
      updateData.maxPassengers = args.maxPassengers;
    if (args.isRecurring !== undefined)
      updateData.isRecurring = args.isRecurring;
    if (args.recurringDays !== undefined)
      updateData.recurringDays = args.recurringDays;
    if (args.vehicleInfo !== undefined)
      updateData.vehicleInfo = args.vehicleInfo;
    if (args.notes !== undefined) updateData.notes = args.notes;

    await ctx.db.patch(args.rideId, updateData);

    // Notify passengers if significant changes were made
    if (
      args.departureTime !== undefined ||
      args.startLocation !== undefined ||
      args.endLocation !== undefined
    ) {
      for (const passenger of ride.passengers) {
        if (passenger.status === "approved") {
          await ctx.db.insert("notifications", {
            userId: passenger.userId,
            title: "Ride Updated",
            message:
              "The ride you joined has been updated by the driver. Please check the details.",
            type: "ride_updated",
            read: false,
            relatedId: args.rideId,
            createdAt: Date.now(),
          });
        }
      }
    }

    return true;
  },
});

export const deleteRide = mutation({
  args: {
    rideId: v.id("rides"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    if (ride.driverId !== args.userId) {
      throw new Error("Only the driver can delete the ride");
    }

    if (ride.status === "active") {
      throw new Error("Cannot delete an active ride. Cancel it first.");
    }

    // Notify all passengers if there are any
    for (const passenger of ride.passengers) {
      if (passenger.status === "approved") {
        await ctx.db.insert("notifications", {
          userId: passenger.userId,
          title: "Ride Deleted",
          message: "The ride you joined has been deleted by the driver",
          type: "ride_deleted",
          read: false,
          relatedId: args.rideId,
          createdAt: Date.now(),
        });
      }
    }

    // Delete related ride requests
    const rideRequests = await ctx.db
      .query("rideRequests")
      .filter((q) => q.eq(q.field("rideId"), args.rideId))
      .collect();

    for (const request of rideRequests) {
      await ctx.db.delete(request._id);
    }

    // Delete the ride
    await ctx.db.delete(args.rideId);

    return true;
  },
});

export const cancelRide = mutation({
  args: {
    rideId: v.id("rides"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) throw new Error("Ride not found");

    if (ride.driverId !== args.userId) {
      throw new Error("Only the driver can cancel the ride");
    }

    await ctx.db.patch(args.rideId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // Notify all passengers
    for (const passenger of ride.passengers) {
      await ctx.db.insert("notifications", {
        userId: passenger.userId,
        title: "Ride Cancelled",
        message: "The ride you joined has been cancelled by the driver",
        type: "ride_cancelled",
        read: false,
        relatedId: args.rideId,
        createdAt: Date.now(),
      });
    }

    return true;
  },
});

export const getRideById = query({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) return null;

    const driver = await ctx.db.get(ride.driverId);
    const passengers = await Promise.all(
      ride.passengers.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          ...p,
          user: user
            ? {
                name: user.name,
                photo: user.photo,
                trustScore: user.trustScore || 70,
              }
            : null,
        };
      })
    );

    return {
      ...ride,
      driver: driver
        ? {
            name: driver.name,
            photo: driver.photo,
            trustScore: driver.trustScore || 70,
            phone: driver.phone,
          }
        : null,
      passengers,
    };
  },
});

export const getRidesByUser = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    asDriver: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let rides;

    if (args.asDriver) {
      rides = await ctx.db
        .query("rides")
        .filter((q) => q.eq(q.field("driverId"), args.userId))
        .order("desc")
        .collect();
    } else {
      // Get rides where user is a passenger
      const allRides = await ctx.db.query("rides").collect();
      rides = allRides.filter((ride) =>
        ride.passengers.some((p) => p.userId === args.userId)
      );
    }

    if (args.status) {
      rides = rides.filter((ride) => ride.status === args.status);
    }

    return rides;
  },
});

export const searchRides = query({
  args: {
    startLat: v.number(),
    startLng: v.number(),
    endLat: v.number(),
    endLng: v.number(),
    departureTime: v.optional(v.number()),
    tolerance: v.optional(v.number()), // km tolerance for matching
  },
  handler: async (ctx, args) => {
    const tolerance = args.tolerance || 5; // 5km default tolerance
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours window

    const rides = await ctx.db
      .query("rides")
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    // Calculate distance function (simplified Haversine)
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const matchingRides = rides.filter((ride) => {
      // Check if ride is full
      if (ride.passengers.length >= ride.maxPassengers) return false;

      // Check start location proximity
      const startDistance = calculateDistance(
        args.startLat,
        args.startLng,
        ride.startLocation.lat,
        ride.startLocation.lng
      );

      // Check end location proximity
      const endDistance = calculateDistance(
        args.endLat,
        args.endLng,
        ride.endLocation.lat,
        ride.endLocation.lng
      );

      // Check time proximity if provided
      let timeMatch = true;
      if (args.departureTime) {
        const timeDiff = Math.abs(ride.departureTime - args.departureTime);
        timeMatch = timeDiff <= timeWindow;
      }

      return (
        startDistance <= tolerance && endDistance <= tolerance && timeMatch
      );
    });

    // Get driver details for each matching ride
    const ridesWithDrivers = await Promise.all(
      matchingRides.map(async (ride) => {
        const driver = await ctx.db.get(ride.driverId);
        return {
          ...ride,
          driver: driver
            ? {
                name: driver.name,
                photo: driver.photo,
                trustScore: driver.trustScore || 70,
                level: driver.level || 1,
              }
            : null,
        };
      })
    );

    return ridesWithDrivers.sort((a, b) => a.departureTime - b.departureTime);
  },
});

export const getPendingRequests = query({
  args: {
    driverId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all rides by this driver
    const rides = await ctx.db
      .query("rides")
      .filter((q) => q.eq(q.field("driverId"), args.driverId))
      .collect();

    const rideIds = rides.map((ride) => ride._id);

    // Get all pending requests for these rides
    const requests = await ctx.db
      .query("rideRequests")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const relevantRequests = requests.filter((req) =>
      rideIds.includes(req.rideId)
    );

    // Get passenger details for each request
    const requestsWithDetails = await Promise.all(
      relevantRequests.map(async (request) => {
        const passenger = await ctx.db.get(request.passengerId);
        const ride = rides.find((r) => r._id === request.rideId);

        return {
          ...request,
          passenger: passenger
            ? {
                name: passenger.name,
                photo: passenger.photo,
                trustScore: passenger.trustScore || 70,
                totalRides: passenger.totalRides || 0,
              }
            : null,
          ride: ride
            ? {
                startLocation: ride.startLocation,
                endLocation: ride.endLocation,
                departureTime: ride.departureTime,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

export const getAvailableRides = query({
  args: {
    excludeUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const rides = await ctx.db
      .query("rides")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("status"), "scheduled"),
            q.gt(q.field("departureTime"), Date.now())
          ),
          q.eq(q.field("status"), "active")
        )
      )
      .order("desc")
      .collect();

    // Filter out rides where user is already the driver or a passenger
    const filteredRides = rides.filter((ride) => {
      if (args.excludeUserId) {
        // Exclude if user is the driver
        if (ride.driverId === args.excludeUserId) return false;

        // Exclude if user is already a passenger
        if (ride.passengers.some((p) => p.userId === args.excludeUserId))
          return false;
      }
      return true;
    });

    const ridesWithDetails = await Promise.all(
      filteredRides.map(async (ride) => {
        const driver = await ctx.db.get(ride.driverId);

        return {
          ...ride,
          driver: driver
            ? {
                name: driver.name,
                photo: driver.photo,
                trustScore: driver.trustScore || 70,
                level: driver.level || 1,
              }
            : null,
        };
      })
    );

    return ridesWithDetails;
  },
});

export const getActiveRides = query({
  args: {},
  handler: async (ctx) => {
    const rides = await ctx.db
      .query("rides")
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    const ridesWithDetails = await Promise.all(
      rides.map(async (ride) => {
        const driver = await ctx.db.get(ride.driverId);

        return {
          ...ride,
          driver: driver
            ? {
                name: driver.name,
                photo: driver.photo,
                trustScore: driver.trustScore || 70,
                level: driver.level || 1,
              }
            : null,
        };
      })
    );

    return ridesWithDetails;
  },
});

export const submitRating = mutation({
  args: {
    rideId: v.id("rides"),
    raterId: v.id("users"),
    ratedUserId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if rating already exists
    const existingRating = await ctx.db
      .query("ratings")
      .filter((q) =>
        q.and(
          q.eq(q.field("rideId"), args.rideId),
          q.eq(q.field("raterId"), args.raterId),
          q.eq(q.field("ratedUserId"), args.ratedUserId)
        )
      )
      .first();

    if (existingRating) {
      throw new Error("You have already rated this user for this ride");
    }

    // Insert the rating
    await ctx.db.insert("ratings", {
      rideId: args.rideId,
      raterId: args.raterId,
      ratedUserId: args.ratedUserId,
      rating: args.rating,
      comment: args.comment,
      createdAt: Date.now(),
    });

    // Update the rated user's trust score
    const ratedUser = await ctx.db.get(args.ratedUserId);
    if (ratedUser) {
      // Get all ratings for this user
      const allRatings = await ctx.db
        .query("ratings")
        .filter((q) => q.eq(q.field("ratedUserId"), args.ratedUserId))
        .collect();

      // Calculate new average rating
      const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / allRatings.length;

      // Update trust score (convert 1-5 rating to 0-100 scale)
      const newTrustScore = Math.round(avgRating * 20);

      await ctx.db.patch(args.ratedUserId, {
        trustScore: newTrustScore,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

export const getRideRatings = query({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .filter((q) => q.eq(q.field("rideId"), args.rideId))
      .collect();

    const ratingsWithUsers = await Promise.all(
      ratings.map(async (rating) => {
        const rater = await ctx.db.get(rating.raterId);
        const ratedUser = await ctx.db.get(rating.ratedUserId);

        return {
          ...rating,
          rater: rater ? { name: rater.name, photo: rater.photo } : null,
          ratedUser: ratedUser
            ? { name: ratedUser.name, photo: ratedUser.photo }
            : null,
        };
      })
    );

    return ratingsWithUsers;
  },
});

export const getRideRequests = query({
  args: {
    rideId: v.id("rides"),
    passengerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("rideRequests")
      .filter((q) => q.eq(q.field("rideId"), args.rideId));

    if (args.passengerId) {
      query = query.filter((q) =>
        q.eq(q.field("passengerId"), args.passengerId)
      );
    }

    const requests = await query.collect();

    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const passenger = await ctx.db.get(request.passengerId);
        return {
          ...request,
          passenger: passenger
            ? {
                _id: passenger._id,
                name: passenger.name,
                email: passenger.email,
                photo: passenger.photo,
                trustScore: passenger.trustScore,
              }
            : null,
        };
      })
    );

    return requestsWithUsers;
  },
});
