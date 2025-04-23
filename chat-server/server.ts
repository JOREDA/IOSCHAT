import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';

// --- Custom Request Interface ---
interface CustomRequest extends Request {
  user?: JwtPayload;
}

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });
const PORT = 5001;
const JWT_SECRET = 'yourSecretKey';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MongoDB Setup ---
mongoose.connect('mongodb://localhost:27017/chatApp').then(() =>
  console.log('Connected to MongoDB')
);

// --- Schemas ---
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
});

const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  participants: [String], // emails
  messages: [messageSchema],
});

const User = mongoose.model('User', userSchema);
const Chat = mongoose.model('Chat', chatSchema);

// --- Auth Middleware ---
function verifyToken(req: CustomRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded.email) throw new Error('Invalid token payload');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
}

// --- Register ---
app.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'Required fields' });
    return;
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400).json({ message: 'User exists' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.status(201).json({ message: 'Registered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Login ---
app.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).exec();
    if (!user || !user.password) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid password' });
      return;
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Get Chat List ---
app.get('/chatlist', verifyToken, async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ email: req.user?.email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const chats = await Chat.find({ _id: { $in: user.chats } });

    const chatList = chats.map(chat => ({
      chatId: chat._id,
      participants: chat.participants.filter(p => p !== req.user?.email),
      lastMessage: chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1]
        : { text: '', timestamp: null },
    }));

    res.json(chatList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Real-time Chat ---
// --- Real-time Chat ---
io.on('connection', socket => {
  console.log('User connected');

  socket.on('register_socket', ({ email }) => {
    socket.join(email);
  });

  socket.on('join_chat', async ({ chatId }) => {
    socket.join(chatId);
  });

  socket.on('send_message', async ({ chatId, sender, text }) => {
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    const message = { sender, text };
    chat.messages.push(message);
    await chat.save();

    io.to(chatId).emit('receive_message', { ...message, timestamp: new Date() });
  });

  socket.on('create_chat', async ({ participants }) => {
    let existing = await Chat.findOne({
      participants: { $all: participants },
      $expr: { $eq: [{ $size: "$participants" }, participants.length] },
    });

    if (!existing) {
      existing = new Chat({ participants, messages: [] });
      await existing.save();

      for (const email of participants) {
        const user = await User.findOne({ email });
        if (user && !user.chats.includes(existing._id)) {
          user.chats.push(existing._id);
          await user.save();
        }
      }
    }

    for (const email of participants) {
      const user = await User.findOne({ email });
      if (user) {
        const chats = await Chat.find({ _id: { $in: user.chats } });

        const chatList = chats.map(chat => ({
          chatId: chat._id,
          participants: chat.participants.filter(p => p !== email),
          lastMessage: chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1]
            : { text: '', timestamp: null },
        }));

        io.to(email).emit('chatlist_updated', chatList);
      }
    }

    const structuredChat = {
      chatId: existing._id,
      participants: existing.participants,
      lastMessage: existing.messages.length > 0
        ? existing.messages[existing.messages.length - 1]
        : { text: '', timestamp: null },
    };
    socket.emit('chat_created', structuredChat);
  });
});

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});