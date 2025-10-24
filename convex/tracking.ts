import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const updateLocation = mutation({
  args: {
    userId: v.id("users"),
    rideId: v.id("rides"),
    lat: v.number(),
    lng: v.number(),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Remove old location for this user/ride
    const existingLocation = await ctx.db
      .query("liveLocations")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("rideId"), args.rideId)
        )
      )
      .first();

    if (existingLocation) {
      await ctx.db.delete(existingLocation._id);
    }

    // Insert new location
    await ctx.db.insert("liveLocations", {
      userId: args.userId,
      rideId: args.rideId,
      lat: args.lat,
      lng: args.lng,
      heading: args.heading,
      speed: args.speed,
      timestamp: Date.now(),
    });

    return true;
  },
});

export const getRideLocations = query({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const locations = await ctx.db
      .query("liveLocations")
      .filter((q) => q.eq(q.field("rideId"), args.rideId))
      .collect();

    const locationsWithUsers = await Promise.all(
      locations.map(async (location) => {
        const user = await ctx.db.get(location.userId);
        return {
          ...location,
          user: user
            ? {
                name: user.name,
                photo: user.photo,
              }
            : null,
        };
      })
    );

    return locationsWithUsers;
  },
});

export const checkGeofence = mutation({
  args: {
    userId: v.id("users"),
    rideId: v.id("rides"),
    lat: v.number(),
    lng: v.number(),
    route: v.array(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if user is within geofence (simplified implementation)
    const tolerance = 0.5; // 500m tolerance in km

    // Calculate distance function
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

    // Check if current location is near any point in the route
    const isOnRoute = args.route.some(
      (point) =>
        calculateDistance(args.lat, args.lng, point.lat, point.lng) <= tolerance
    );

    if (!isOnRoute) {
      // User is off route - create alert
      const ride = await ctx.db.get(args.rideId);
      if (ride) {
        // Notify all participants
        const allUserIds = [
          ride.driverId,
          ...ride.passengers.map((p) => p.userId),
        ];

        for (const userId of allUserIds) {
          if (userId !== args.userId) {
            // Don't notify the user who went off route
            await ctx.db.insert("notifications", {
              userId,
              title: "Route Deviation Alert",
              message: "A passenger has deviated from the planned route",
              type: "safety_alert",
              read: false,
              relatedId: args.rideId,
              createdAt: Date.now(),
            });
          }
        }
      }

      return { alert: true, message: "User has deviated from route" };
    }

    return { alert: false, message: "User is on route" };
  },
});

export const triggerSOS = mutation({
  args: {
    userId: v.id("users"),
    rideId: v.id("rides"),
    lat: v.number(),
    lng: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    const user = await ctx.db.get(args.userId);

    if (!ride || !user) {
      throw new Error("Ride or user not found");
    }

    // Notify all ride participants
    const allUserIds = [ride.driverId, ...ride.passengers.map((p) => p.userId)];

    for (const userId of allUserIds) {
      if (userId !== args.userId) {
        await ctx.db.insert("notifications", {
          userId,
          title: "🚨 EMERGENCY ALERT 🚨",
          message: `${user.name} has triggered an SOS alert. Location: ${args.lat}, ${args.lng}`,
          type: "safety_alert",
          read: false,
          relatedId: args.rideId,
          createdAt: Date.now(),
        });
      }
    }

    // Get emergency contacts for the user
    const emergencyContacts = await ctx.db
      .query("emergencyContacts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Simulate emergency contact notifications (in real app, would send SMS/call)
    console.log(`SOS Alert triggered by ${user.name}`);
    console.log(`Location: ${args.lat}, ${args.lng}`);
    console.log(
      `Emergency contacts to notify:`,
      emergencyContacts.map((c) => c.phone)
    );

    // Create a system notification record
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "SOS Alert Sent",
      message:
        "Your emergency alert has been sent to ride participants and emergency contacts",
      type: "safety_alert",
      read: false,
      relatedId: args.rideId,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "SOS alert sent successfully",
      contactsNotified: emergencyContacts.length,
    };
  },
});

export const addEmergencyContact = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    relationship: v.string(),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // If this is set as primary, unset others
    if (args.isPrimary) {
      const existingContacts = await ctx.db
        .query("emergencyContacts")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();

      for (const contact of existingContacts) {
        if (contact.isPrimary) {
          await ctx.db.patch(contact._id, { isPrimary: false });
        }
      }
    }

    const contactId = await ctx.db.insert("emergencyContacts", {
      userId: args.userId,
      name: args.name,
      phone: args.phone,
      relationship: args.relationship,
      isPrimary: args.isPrimary || false,
    });

    return contactId;
  },
});

export const getEmergencyContacts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emergencyContacts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});

export const deleteEmergencyContact = mutation({
  args: {
    contactId: v.id("emergencyContacts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.contactId);
    return true;
  },
});

export const getUserSosAlerts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("type"), "safety_alert")
        )
      )
      .order("desc")
      .take(20);

    return alerts;
  },
});

// Simulate GPS updates for demo purposes
export const simulateGPSUpdate = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride || ride.status !== "active") {
      return { message: "Ride not active" };
    }

    // Simulate movement along route for demo
    const startLat = ride.startLocation.lat;
    const startLng = ride.startLocation.lng;
    const endLat = ride.endLocation.lat;
    const endLng = ride.endLocation.lng;

    // Generate random progress between start and end (0-1)
    const progress = Math.random();
    const currentLat = startLat + (endLat - startLat) * progress;
    const currentLng = startLng + (endLng - startLng) * progress;

    // Update driver location
    await ctx.db.insert("liveLocations", {
      userId: ride.driverId,
      rideId: args.rideId,
      lat: currentLat,
      lng: currentLng,
      heading: Math.random() * 360,
      speed: 30 + Math.random() * 50, // 30-80 km/h
      timestamp: Date.now(),
    });

    // Simulate passenger locations (slightly offset from driver)
    for (const passenger of ride.passengers) {
      const passengerLat = currentLat + (Math.random() - 0.5) * 0.001; // Small offset
      const passengerLng = currentLng + (Math.random() - 0.5) * 0.001;

      await ctx.db.insert("liveLocations", {
        userId: passenger.userId,
        rideId: args.rideId,
        lat: passengerLat,
        lng: passengerLng,
        timestamp: Date.now(),
      });
    }

    return {
      message: "GPS updated",
      progress: Math.round(progress * 100),
      currentLocation: { lat: currentLat, lng: currentLng },
    };
  },
});
