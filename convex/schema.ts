import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    photo: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    trustScore: v.optional(v.number()),
    ecoCoins: v.optional(v.number()),
    level: v.optional(v.number()),
    badges: v.optional(v.array(v.string())),
    achievements: v.optional(v.array(v.string())),
    circleId: v.optional(v.id("circles")),
    // Commute preferences
    homeLocation: v.optional(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
        address: v.optional(v.string()),
      })
    ),
    workLocation: v.optional(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
        address: v.optional(v.string()),
      })
    ),
    usualCommuteTime: v.optional(v.string()),
    preferredRoutes: v.optional(
      v.array(
        v.object({
          name: v.string(),
          startLat: v.number(),
          startLng: v.number(),
          endLat: v.number(),
          endLng: v.number(),
          frequency: v.number(),
        })
      )
    ),
    // Stats
    totalRides: v.optional(v.number()),
    co2Saved: v.optional(v.number()),
    fuelSaved: v.optional(v.number()),
    moneySaved: v.optional(v.number()),
    walletBalance: v.optional(v.number()),
    aadhaarVerified: v.optional(v.boolean()),
    dlVerified: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_circle", ["circleId"]),

  circles: defineTable({
    name: v.string(),
    type: v.string(), // "college", "company", "housing"
    verified: v.boolean(),
    memberCount: v.number(),
    createdBy: v.id("users"),
    description: v.optional(v.string()),
    location: v.optional(
      v.object({
        name: v.string(),
        lat: v.number(),
        lng: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_creator", ["createdBy"]),

  rides: defineTable({
    driverId: v.id("users"),
    passengers: v.array(
      v.object({
        userId: v.id("users"),
        status: v.string(), // "requested", "approved", "declined"
        joinedAt: v.optional(v.number()),
      })
    ),
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
    actualStartTime: v.optional(v.number()),
    arrivalTime: v.optional(v.number()),
    currentLocation: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
        timestamp: v.number(),
        speed: v.optional(v.number()), // km/h
        heading: v.optional(v.number()), // degrees
      })
    ),
    route: v.optional(
      v.array(
        v.object({
          lat: v.number(),
          lng: v.number(),
        })
      )
    ),
    distance: v.number(), // in km
    estimatedCost: v.number(),
    costPerPassenger: v.number(),
    maxPassengers: v.number(),
    status: v.string(), // "scheduled", "active", "completed", "cancelled"
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"])
    .index("by_departure", ["departureTime"]),

  rideRequests: defineTable({
    rideId: v.id("rides"),
    passengerId: v.id("users"),
    status: v.string(), // "pending", "approved", "declined"
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
    message: v.optional(v.string()),
    preferredPaymentMethod: v.optional(v.string()), // "wallet", "card"
  })
    .index("by_ride", ["rideId"])
    .index("by_passenger", ["passengerId"])
    .index("by_status", ["status"]),

  transactions: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    rideId: v.optional(v.id("rides")), // Optional for system transactions
    amount: v.number(),
    type: v.string(), // "payment", "refund", "ecocoin_reward", "wallet_topup", "wallet_withdrawal"
    status: v.string(), // "pending", "completed", "failed"
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_ride", ["rideId"])
    .index("by_type", ["type"]),

  messages: defineTable({
    rideId: v.id("rides"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(v.string()), // "text", "location", "alert"
    timestamp: v.number(),
    read: v.optional(v.boolean()),
  })
    .index("by_ride", ["rideId"])
    .index("by_sender", ["senderId"])
    .index("by_timestamp", ["timestamp"]),

  liveLocations: defineTable({
    userId: v.id("users"),
    rideId: v.id("rides"),
    lat: v.number(),
    lng: v.number(),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_ride", ["rideId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(), // "ride_request", "ride_approved", "ride_started", "payment", "safety_alert"
    read: v.boolean(),
    relatedId: v.optional(v.string()), // rideId, transactionId, etc.
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["read"])
    .index("by_type", ["type"]),

  emergencyContacts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    relationship: v.string(),
    isPrimary: v.boolean(),
  }).index("by_user", ["userId"]),

  ratings: defineTable({
    rideId: v.id("rides"),
    raterId: v.id("users"), // The person giving the rating
    ratedUserId: v.id("users"), // The person being rated
    rating: v.number(), // 1-5 stars
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_ride", ["rideId"])
    .index("by_rater", ["raterId"])
    .index("by_rated", ["ratedUserId"]),

  certificates: defineTable({
    userId: v.id("users"),
    type: v.string(), // "carbon_impact"
    certificateId: v.string(), // Unique certificate ID
    data: v.object({
      userName: v.string(),
      userEmail: v.string(),
      co2Saved: v.number(),
      ridesCompleted: v.number(),
      totalDistance: v.number(),
      joinDate: v.string(),
      issuedDate: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_certificate_id", ["certificateId"]),
});
