import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTransaction = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    rideId: v.optional(v.id("rides")),
    amount: v.number(),
    type: v.string(), // "payment", "refund", "ecocoin_reward"
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("transactions", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      rideId: args.rideId,
      amount: args.amount,
      type: args.type,
      status: "pending",
      description: args.description,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

export const processTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.string(), // "completed", "failed"
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new Error("Transaction not found");

    await ctx.db.patch(args.transactionId, {
      status: args.status,
    });

    if (args.status === "completed") {
      // Update wallet balances
      const fromUser = await ctx.db.get(transaction.fromUserId);
      const toUser = await ctx.db.get(transaction.toUserId);

      if (fromUser && toUser) {
        // Debit from sender
        await ctx.db.patch(transaction.fromUserId, {
          walletBalance: (fromUser.walletBalance || 0) - transaction.amount,
        });

        // Credit to receiver
        await ctx.db.patch(transaction.toUserId, {
          walletBalance: (toUser.walletBalance || 0) + transaction.amount,
        });
      }
    }

    return true;
  },
});

export const getUserTransactions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let transactions = await ctx.db
      .query("transactions")
      .filter((q) =>
        q.or(
          q.eq(q.field("fromUserId"), args.userId),
          q.eq(q.field("toUserId"), args.userId)
        )
      )
      .order("desc")
      .take(limit);

    if (args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }

    // Get user details for each transaction
    const transactionsWithUsers = await Promise.all(
      transactions.map(async (transaction) => {
        const fromUser = await ctx.db.get(transaction.fromUserId);
        const toUser = await ctx.db.get(transaction.toUserId);
        const ride = transaction.rideId
          ? await ctx.db.get(transaction.rideId)
          : null;

        return {
          ...transaction,
          fromUser: fromUser
            ? {
                name: fromUser.name,
                photo: fromUser.photo,
              }
            : null,
          toUser: toUser
            ? {
                name: toUser.name,
                photo: toUser.photo,
              }
            : null,
          ride: ride
            ? {
                startLocation: ride.startLocation,
                endLocation: ride.endLocation,
                departureTime: ride.departureTime,
              }
            : null,
          isIncoming: transaction.toUserId === args.userId,
        };
      })
    );

    return transactionsWithUsers;
  },
});

export const getRideTransactions = query({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("rideId"), args.rideId))
      .collect();

    // Get user details for each transaction
    const transactionsWithUsers = await Promise.all(
      transactions.map(async (transaction) => {
        const fromUser = await ctx.db.get(transaction.fromUserId);
        const toUser = await ctx.db.get(transaction.toUserId);

        return {
          ...transaction,
          fromUser: fromUser
            ? {
                name: fromUser.name,
                photo: fromUser.photo,
              }
            : null,
          toUser: toUser
            ? {
                name: toUser.name,
                photo: toUser.photo,
              }
            : null,
        };
      })
    );

    return transactionsWithUsers;
  },
});

export const getWalletBalance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.walletBalance || 0;
  },
});

export const addFundsToWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const newBalance = (user.walletBalance || 0) + args.amount;

    await ctx.db.patch(args.userId, {
      walletBalance: newBalance,
      updatedAt: Date.now(),
    });

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromUserId: args.userId, // Self-transaction for wallet top-up
      toUserId: args.userId,
      rideId: undefined, // System transaction
      amount: args.amount,
      type: "wallet_topup",
      status: "completed",
      description: args.description || `Wallet top-up of ₹${args.amount}`,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

export const withdrawFromWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const currentBalance = user.walletBalance || 0;
    if (currentBalance < args.amount) {
      throw new Error("Insufficient balance");
    }

    const newBalance = currentBalance - args.amount;

    await ctx.db.patch(args.userId, {
      walletBalance: newBalance,
      updatedAt: Date.now(),
    });

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromUserId: args.userId,
      toUserId: args.userId, // Self-transaction for withdrawal
      rideId: undefined, // System transaction
      amount: args.amount,
      type: "wallet_withdrawal",
      status: "completed",
      description: args.description || `Wallet withdrawal of ₹${args.amount}`,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

export const getTransactionStats = query({
  args: {
    userId: v.id("users"),
    timeRange: v.optional(v.string()), // "week", "month", "year"
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || "month";
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = now - 30 * 24 * 60 * 60 * 1000;
    }

    const transactions = await ctx.db
      .query("transactions")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("fromUserId"), args.userId),
            q.eq(q.field("toUserId"), args.userId)
          ),
          q.gte(q.field("createdAt"), startTime),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    const stats = {
      totalSpent: 0,
      totalEarned: 0,
      totalTransactions: transactions.length,
      ridePayments: 0,
      ecoCoinsEarned: 0,
    };

    transactions.forEach((transaction) => {
      if (transaction.toUserId === args.userId) {
        stats.totalEarned += transaction.amount;
        if (transaction.type === "payment") {
          stats.ridePayments += transaction.amount;
        } else if (transaction.type === "ecocoin_reward") {
          stats.ecoCoinsEarned += transaction.amount;
        }
      } else if (transaction.fromUserId === args.userId) {
        stats.totalSpent += transaction.amount;
      }
    });

    return stats;
  },
});
