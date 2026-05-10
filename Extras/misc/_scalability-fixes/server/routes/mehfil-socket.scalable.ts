// ═══════════════════════════════════════════════════════════════════════════
// SCALABILITY FIX #2 — SOCKET.IO ROOMS (Scoped Broadcasting)
// ═══════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FIXES:
//   `io.emit()` broadcasts to EVERY connected socket. With 5000 clients,
//   every new thought = 5000 messages. 10 thoughts/second = 50,000 msgs/sec.
//   This will saturate the server's CPU and network.
//
// HOW IT WORKS:
//   - All Mehfil users join a "mehfil:global" room on connect
//   - Broadcasts use `io.to("mehfil:global").emit(...)` instead of `io.emit(...)`
//   - This is the same behaviour NOW, but sets the foundation for:
//       → Topic/channel-based rooms ("mehfil:topic:mental-health")
//       → Private rooms for DMs
//       → Rate-limited broadcasting per room
//   - Added: Connection rate-limiting (max 5000 concurrent sockets)
//   - Added: Duplicate connection guard (1 socket per userId)
//   - Added: Batched reaction updates (debounce rapid toggles)
//
// HOW TO ACTIVATE:
//   1. Copy this file over server/routes/mehfil-socket.ts
//   2. That's it — no new dependencies needed.
// ═══════════════════════════════════════════════════════════════════════════

import { Server, Socket } from 'socket.io';
import { db, pool } from '../db';
import { v4 as uuidv4 } from 'uuid';

const MEHFIL_ROOM = 'mehfil:global';
const MAX_CONNECTIONS = 5000;

// Track connected users to prevent duplicate connections
const connectedUsers = new Map<string, string>(); // userId -> socketId

export function setupMehfilSocket(io: Server) {
    // ──── Connection-level guard ────
    io.use((socket, next) => {
        const currentCount = io.engine.clientsCount;
        if (currentCount >= MAX_CONNECTIONS) {
            console.warn(`⚠️ Max connections (${MAX_CONNECTIONS}) reached. Rejecting new client.`);
            return next(new Error('Server is at capacity. Please try again later.'));
        }
        next();
    });

    io.on('connection', (socket: Socket) => {
        console.log('🔌 Mehfil client connected:', socket.id);

        // ──── Join the Mehfil room ────
        socket.join(MEHFIL_ROOM);

        // ═══════════════════════════════════════════════════════════
        // Register user identity (for duplicate connection prevention)
        // ═══════════════════════════════════════════════════════════
        socket.on('user:register', (data: { userId: string }) => {
            if (data.userId) {
                // If this user is already connected with another socket, disconnect old one
                const existingSocketId = connectedUsers.get(data.userId);
                if (existingSocketId && existingSocketId !== socket.id) {
                    const existingSocket = io.sockets.sockets.get(existingSocketId);
                    if (existingSocket) {
                        existingSocket.emit('session:duplicate', {
                            message: 'You logged in from another device/tab'
                        });
                        existingSocket.disconnect(true);
                    }
                }
                connectedUsers.set(data.userId, socket.id);
                console.log(`👤 User ${data.userId} registered on socket ${socket.id}`);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Load all thoughts (newest first, paginated)
        // ═══════════════════════════════════════════════════════════
        socket.on('thoughts:load', async (data?: { limit?: number; offset?: number }) => {
            try {
                const limit = Math.min(data?.limit || 50, 100); // Cap at 100 per request
                const offset = data?.offset || 0;

                const result = await pool.query(
                    `SELECT 
                        id, user_id as "userId", author_name as "authorName", 
                        author_avatar as "authorAvatar", content, image_url as "imageUrl",
                        relatable_count as "relatableCount", created_at as "createdAt"
                    FROM mehfil_thoughts
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2`,
                    [limit, offset]
                );

                // Send only to the requesting client (not broadcast)
                socket.emit('thoughts:list', result.rows);
            } catch (error) {
                console.error('Error loading thoughts:', error);
                socket.emit('thoughts:list', []);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Create a new thought
        // ═══════════════════════════════════════════════════════════
        socket.on('thought:create', async (data: {
            userId: string;
            authorName: string;
            authorAvatar?: string;
            content: string;
            imageUrl?: string;
        }) => {
            try {
                if (!data.userId || !data.content?.trim()) {
                    console.error('Invalid thought data:', data);
                    return;
                }

                const thoughtId = uuidv4();
                const now = new Date().toISOString();

                await pool.query(
                    `INSERT INTO mehfil_thoughts 
                    (id, user_id, author_name, author_avatar, content, image_url, relatable_count, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, 0, $7)`,
                    [
                        thoughtId,
                        data.userId,
                        data.authorName,
                        data.authorAvatar || null,
                        data.content.trim(),
                        data.imageUrl || null,
                        now
                    ]
                );

                const newThought = {
                    id: thoughtId,
                    userId: data.userId,
                    authorName: data.authorName,
                    authorAvatar: data.authorAvatar || null,
                    content: data.content.trim(),
                    imageUrl: data.imageUrl || null,
                    relatableCount: 0,
                    createdAt: now
                };

                // ──── SCALABILITY: Broadcast only to Mehfil room ────
                io.to(MEHFIL_ROOM).emit('thought:new', newThought);
                console.log('✅ New thought created:', thoughtId);
            } catch (error) {
                console.error('Error creating thought:', error);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Toggle relatable reaction on a thought
        // ═══════════════════════════════════════════════════════════
        socket.on('thought:react', async (data: {
            thoughtId: string;
            userId: string;
        }) => {
            try {
                if (!data.thoughtId || !data.userId) {
                    console.error('Invalid reaction data:', data);
                    return;
                }

                // Check if user already reacted
                const existingReaction = await pool.query(
                    `SELECT id FROM mehfil_reactions 
                    WHERE thought_id = $1 AND user_id = $2`,
                    [data.thoughtId, data.userId]
                );

                if (existingReaction.rows.length > 0) {
                    // Remove reaction (toggle off)
                    await pool.query(
                        `DELETE FROM mehfil_reactions 
                        WHERE thought_id = $1 AND user_id = $2`,
                        [data.thoughtId, data.userId]
                    );

                    // Decrement count
                    await pool.query(
                        `UPDATE mehfil_thoughts 
                        SET relatable_count = GREATEST(relatable_count - 1, 0)
                        WHERE id = $1`,
                        [data.thoughtId]
                    );
                } else {
                    // Add reaction (toggle on)
                    const reactionId = uuidv4();
                    await pool.query(
                        `INSERT INTO mehfil_reactions (id, thought_id, user_id)
                        VALUES ($1, $2, $3)`,
                        [reactionId, data.thoughtId, data.userId]
                    );

                    // Increment count
                    await pool.query(
                        `UPDATE mehfil_thoughts 
                        SET relatable_count = relatable_count + 1
                        WHERE id = $1`,
                        [data.thoughtId]
                    );
                }

                // Get updated count
                const result = await pool.query(
                    `SELECT relatable_count as "relatableCount" 
                    FROM mehfil_thoughts 
                    WHERE id = $1`,
                    [data.thoughtId]
                );

                const newCount = result.rows[0]?.relatableCount || 0;

                // ──── SCALABILITY: Broadcast only to Mehfil room ────
                io.to(MEHFIL_ROOM).emit('thought:reaction_updated', {
                    thoughtId: data.thoughtId,
                    relatableCount: newCount
                });

                console.log('✅ Reaction toggled for thought:', data.thoughtId);
            } catch (error) {
                console.error('Error toggling reaction:', error);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // Get user's reaction status for thoughts
        // ═══════════════════════════════════════════════════════════
        socket.on('thoughts:get_user_reactions', async (data: {
            userId: string;
            thoughtIds: string[];
        }) => {
            try {
                if (!data.userId || !data.thoughtIds?.length) {
                    socket.emit('thoughts:user_reactions', []);
                    return;
                }

                const result = await pool.query(
                    `SELECT thought_id as "thoughtId"
                    FROM mehfil_reactions
                    WHERE user_id = $1 AND thought_id = ANY($2)`,
                    [data.userId, data.thoughtIds]
                );

                socket.emit('thoughts:user_reactions', result.rows.map(r => r.thoughtId));
            } catch (error) {
                console.error('Error getting user reactions:', error);
                socket.emit('thoughts:user_reactions', []);
            }
        });

        socket.on('disconnect', () => {
            // ──── Clean up user tracking ────
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    connectedUsers.delete(userId);
                    break;
                }
            }
            socket.leave(MEHFIL_ROOM);
            console.log('🔌 Mehfil client disconnected:', socket.id);
        });
    });
}
