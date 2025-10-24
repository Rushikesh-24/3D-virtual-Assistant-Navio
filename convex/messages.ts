import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const sendMessage = mutation({
  args: {
    rideId: v.id("rides"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(v.string()), // "text", "location", "alert"
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      rideId: args.rideId,
      senderId: args.senderId,
      content: args.content,
      type: args.type || "text",
      timestamp: Date.now(),
      read: false,
    });

    // Get ride participants to notify
    const ride = await ctx.db.get(args.rideId);
    if (ride) {
      const participants = [
        ride.driverId,
        ...ride.passengers.map((p) => p.userId),
      ];
      const sender = await ctx.db.get(args.senderId);

      // Create notifications for all participants except sender
      for (const participantId of participants) {
        if (participantId !== args.senderId) {
          await ctx.db.insert("notifications", {
            userId: participantId,
            title: "New Message",
            message: `${sender?.name || "Someone"} sent a message in your ride chat`,
            type: "message",
            read: false,
            relatedId: args.rideId,
            createdAt: Date.now(),
          });
        }
      }
    }

    return messageId;
  },
});

export const getRideMessages = query({
  args: {
    rideId: v.id("rides"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("rideId"), args.rideId))
      .order("desc")
      .take(limit);

    // Get sender details for each message
    const messagesWithSenders = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender: sender
            ? {
                name: sender.name,
                photo: sender.photo,
              }
            : null,
        };
      })
    );

    return messagesWithSenders.reverse(); // Show oldest first
  },
});

export const markMessagesAsRead = mutation({
  args: {
    rideId: v.id("rides"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("rideId"), args.rideId),
          q.neq(q.field("senderId"), args.userId)
        )
      )
      .collect();

    // Mark all messages from others as read
    for (const message of messages) {
      await ctx.db.patch(message._id, { read: true });
    }

    return true;
  },
});

export const getUnreadMessageCount = query({
  args: {
    userId: v.id("users"),
    rideId: v.optional(v.id("rides")),
  },
  handler: async (ctx, args) => {
    if (args.rideId) {
      // Count unread messages for specific ride
      const messages = await ctx.db
        .query("messages")
        .filter((q) =>
          q.and(
            q.eq(q.field("rideId"), args.rideId),
            q.neq(q.field("senderId"), args.userId),
            q.eq(q.field("read"), false)
          )
        )
        .collect();

      return messages.length;
    } else {
      // Count all unread messages for user
      // Get all rides user is part of
      const userRides = await ctx.db.query("rides").collect();
      const relevantRides = userRides.filter(
        (ride) =>
          ride.driverId === args.userId ||
          ride.passengers.some((p) => p.userId === args.userId)
      );

      let totalUnread = 0;
      for (const ride of relevantRides) {
        const messages = await ctx.db
          .query("messages")
          .filter((q) =>
            q.and(
              q.eq(q.field("rideId"), ride._id),
              q.neq(q.field("senderId"), args.userId),
              q.eq(q.field("read"), false)
            )
          )
          .collect();

        totalUnread += messages.length;
      }

      return totalUnread;
    }
  },
});

export const sendLocationMessage = mutation({
  args: {
    rideId: v.id("rides"),
    senderId: v.id("users"),
    lat: v.number(),
    lng: v.number(),
    locationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const content = JSON.stringify({
      lat: args.lat,
      lng: args.lng,
      name:
        args.locationName ||
        `Location: ${args.lat.toFixed(4)}, ${args.lng.toFixed(4)}`,
    });

    return await ctx.db.insert("messages", {
      rideId: args.rideId,
      senderId: args.senderId,
      content,
      type: "location",
      timestamp: Date.now(),
      read: false,
    });
  },
});

export const sendAlertMessage = mutation({
  args: {
    rideId: v.id("rides"),
    senderId: v.id("users"),
    alertType: v.string(), // "running_late", "arrived", "issue", "custom"
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const alertMessages = {
      running_late: "I'm running a bit late",
      arrived: "I've arrived at the pickup location",
      issue: "There's an issue with the ride",
      custom: args.message || "Alert",
    };

    const content =
      alertMessages[args.alertType as keyof typeof alertMessages] ||
      args.message ||
      "Alert";

    const messageId = await ctx.db.insert("messages", {
      rideId: args.rideId,
      senderId: args.senderId,
      content,
      type: "alert",
      timestamp: Date.now(),
      read: false,
    });

    // Send urgent notification for alerts
    const ride = await ctx.db.get(args.rideId);
    if (ride) {
      const participants = [
        ride.driverId,
        ...ride.passengers.map((p) => p.userId),
      ];
      const sender = await ctx.db.get(args.senderId);

      for (const participantId of participants) {
        if (participantId !== args.senderId) {
          await ctx.db.insert("notifications", {
            userId: participantId,
            title: "🚨 Ride Alert",
            message: `${sender?.name || "Someone"}: ${content}`,
            type: "ride_alert",
            read: false,
            relatedId: args.rideId,
            createdAt: Date.now(),
          });
        }
      }
    }

    return messageId;
  },
});
