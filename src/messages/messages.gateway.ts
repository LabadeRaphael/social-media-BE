// // src/messages/message.gateway.ts
// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   MessageBody,
//   ConnectedSocket,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { MessageService } from './messages.service';

// @WebSocketGateway({
//   cors: {
//     origin: '*', // later change to your frontend URL for security
//   },
// })
// export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   server: Server;

//   constructor(private readonly messageService: MessageService) {}

//   // When a client connects
//   handleConnection(socket: Socket) {
//     console.log('Client connected:', socket.id);
//   }

//   // When a client disconnects
//   handleDisconnect(socket: Socket) {
//     console.log('Client disconnected:', socket.id);
//   }

//   // 👇 Listen for "send_message" event from client
//   @SubscribeMessage('send_message')
//   async handleMessage(
//     @MessageBody() data: { text: string; conversationId: string; senderId: string },
//     @ConnectedSocket() socket: Socket,
//   ) {
//     // Save message in database
//     const message = await this.messageService.sendMessage(
//       { text: data.text, conversationId: data.conversationId, type: 'TEXT' },
//       data.senderId,
//     );

//     // Broadcast the message to everyone in that conversation room
//     this.server.to(data.conversationId).emit('receive_message', message);
//   }

//   // 👇 Join a conversation room
//   @SubscribeMessage('join_conversation')
//   handleJoinConversation(
//     @MessageBody() conversationId: string,
//     @ConnectedSocket() socket: Socket,
//   ) {
//     socket.join(conversationId);
//     console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
//   }
// }

// src/messages/message.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './messages.service';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie'; // ✅ new import
@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000', // your Next.js URL
        credentials: true, // ✅ allow cookies
    },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Map userId <-> socketId
    private onlineUsers = new Map<string, string>();

    constructor(
        private readonly messageService: MessageService,
        private readonly jwtService: JwtService, // ✅ use existing JwtService
    ) { }

    /**
     * Called when a client connects
     */
    async handleConnection(socket: Socket) {
        console.log("🔥 Client trying to connect...");
        try {
            // ✅ 1. Get token from handshake
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');
            const token = cookies['accessToken']; // use your cookie name here
            console.log("web socket", token);

            if (!token) {
                console.log('❌ No token provided');
                socket.disconnect();
                return;
            }

            // ✅ 2. Verify token using same secret as HTTP JWT
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET, // ensure same secret as used in your AuthModule
            });

            // ✅ 3. Extract userId from payload
            const userId = payload.sub;

            // ✅ 4. Store mapping
            this.onlineUsers.set(userId, socket.id);
            (socket as any).userId = userId; // attach userId to socket for reuse

            console.log("✅ Connected users:", Array.from(this.onlineUsers.keys()));

            // ✅ Always emit the full updated list
            this.server.emit('online_users', Array.from(this.onlineUsers.keys()));

            // ✅ Also send current list only to the newly connected user
            socket.emit('online_users', Array.from(this.onlineUsers.keys()));

        } catch (err) {
            console.log('❌ Invalid token or connection refused', err.message);
            socket.disconnect();
        }
    }

    /**
     * Called when a client disconnects
     */
    handleDisconnect(socket: Socket) {
        const userId = (socket as any).userId;
        if (userId) {
            this.onlineUsers.delete(userId);
            console.log("👋 User disconnected:", userId);
            console.log("✅ Remaining users:", Array.from(this.onlineUsers.keys()));

            // ✅ Emit same consistent list again to everyone
            this.server.emit('online_users', Array.from(this.onlineUsers.keys()));

            // console.log("array", Array.from(this.onlineUsers.keys()));
            // this.server.emit('user_offline', Array.from(this.onlineUsers.keys()));
            // console.log(`👋 User ${userId} disconnected`);
        }
    }

    /**
     * Handle sending messages
     */
    @SubscribeMessage('send_message')
    async handleMessage(
        @MessageBody() data: { text: string; receiverId: string, conversationId: string, type?: 'TEXT' | 'VOICE'; mediaUrl?: string | null, duration?:number|null },
        @ConnectedSocket() socket: Socket,
    ) {
        const senderId = (socket as any).userId;
        if (!senderId) return socket.emit('error', 'Unauthorized');
        console.log("sendMessageData", data);

        const message = await this.messageService.sendMessage(
            {
                text: data.text,
                conversationId: data.conversationId,
                type: data.type || 'TEXT', // use 'VOICE' if sent
                mediaUrl: data.mediaUrl || null,
                duration: data.duration || null,
            },
            senderId,
        );

        // ✅ 2. Send to everyone in the conversation room
        this.server.to(data.conversationId).emit('receive_message', message);

        // ✅ 3. Send directly to the receiver if they’re online
        const receiverSocketId = this.onlineUsers.get(data.receiverId);
        console.log("receiverId", receiverSocketId);

        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('receive_message', message);
            console.log(`📨 Sent message directly to receiver ${data.receiverId}`);
        } else {
            console.log(`⚠️ Receiver ${data.receiverId} is offline. Message saved only.`);
        }


    }
    @SubscribeMessage('mark_as_read')
    async handleMarkAsRead(
        @MessageBody() conversationId: string,
        @ConnectedSocket() socket: Socket,
    ) {
        const userId = (socket as any).userId;
        if (!userId) return;

        // Mark messages as read in DB
        await this.messageService.markMessagesAsRead(conversationId, userId);

        // Broadcast to everyone in the conversation
        this.server.to(conversationId).emit('messages_read', { conversationId, userId });
    }
    // typing indicator events
    @SubscribeMessage("typing")
    handleTyping(
        @MessageBody() data: { conversationId: string; senderId: string },
        @ConnectedSocket() client: Socket
    ) {
        // console.log("Typing", data.senderId);

        // broadcast to others in the same conversation
        client.to(data.conversationId).emit("user_typing", {
            conversationId: data.conversationId,
            senderId: data.senderId,
        });
    }

    @SubscribeMessage("stop_typing")
    handleStopTyping(
        @MessageBody() data: { conversationId: string; senderId: string },
        @ConnectedSocket() client: Socket
    ) {
        client.to(data.conversationId).emit("user_stop_typing", {
            conversationId: data.conversationId,
            senderId: data.senderId,
        });
    }


    /**
     * Handle joining conversation rooms
     */
    @SubscribeMessage('join_conversation')
    handleJoinConversation(
        @MessageBody() conversationId: string,
        @ConnectedSocket() socket: Socket,
    ) {
        const userId = (socket as any).userId;
        if (!userId) return socket.emit('error', 'Unauthorized');

        // ✅ optionally check if user is a participant before joining (later step)
        console.log("the conv", conversationId);
        socket.join(conversationId);

        console.log(`🔹 User ${userId} joined conversation ${conversationId}`);
    }
}
