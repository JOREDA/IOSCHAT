// App.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'http://192.168.0.105:5001';

interface Chat {
  _id: string;
  name: string;
}

interface Message {
  _id: string;
  sender: string;
  text: string;
  image?: string;
  timestamp: string;
}

export default function App() {
  // 1) Seed with dummy chats so UI shows immediately
  const dummyChats: Chat[] = [
    { _id: '1', name: 'Alice' },
    { _id: '2', name: 'Bob' },
    { _id: '3', name: 'Carol' },
  ];
  
  const [chats, setChats] = useState<Chat[]>(dummyChats);
  const [selectedChatId, setSelectedChatId] = useState<string>(dummyChats[0]._id);
  const [messages, setMessages] = useState<Message[]>([
    // seed dummy messages for the first chat
    {
      _id: 'm1',
      sender: 'Alice',
      text: 'Welcome to the dummy chat!',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // 2) Optional: actually fetch real chats (will overwrite dummy if backend returns non‑empty)
  useEffect(() => {
    (async () => {
      setLoadingChats(true);
      try {
        const res = await axios.get<Chat[]>(`${API_BASE_URL}/chatlist`);
        if (res.data.length) {
          setChats(res.data);
          setSelectedChatId(res.data[0]._id);
        }
      } catch (err) {
        console.warn('Could not fetch chats, using dummy');
      } finally {
        setLoadingChats(false);
      }
    })();
  }, []);

  // 3) Load messages for whichever chat is selected
  const loadMessages = async (chatId: string) => {
    setSelectedChatId(chatId);
    setLoadingMessages(true);
    try {
      const res = await axios.get<Message[]>(`${API_BASE_URL}/messages/${chatId}`);
      if (res.data.length) {
        setMessages(res.data);
      }
    } catch {
      console.warn('Could not fetch messages, keeping dummy');
    } finally {
      setLoadingMessages(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  // 4) Send message stub (still dummy until backend is up)
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const next: Message = {
      _id: Date.now().toString(),
      sender: 'me',
      text: newMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(m => [...m, next]);
    setNewMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    // uncomment below to hit real endpoint once ready:
    /*
    const form = new FormData();
    form.append('text', newMessage);
    form.append('chatId', selectedChatId);
    if (imageUri) form.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    await axios.post(`${API_BASE_URL}/messages/send`, form, { headers:{ 'Content-Type':'multipart/form-data'}})
      .then(res=>setMessages(m=>[...m,res.data]))
      .catch(console.error);
    setImageUri(null);
    */
  };

  // 5) Pick image stub
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return alert('grant permission');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes:ImagePicker.MediaTypeOptions.Images, quality:0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  return (
    <View style={styles.outer}>
      {/* Chat List */}
      <View style={styles.listPane}>
        {loadingChats ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={chats}
            keyExtractor={c => c._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.chatItem,
                  item._id === selectedChatId && styles.chatItemActive,
                ]}
                onPress={() => loadMessages(item._id)}
              >
                <Text style={styles.chatName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Chat View */}
      <View style={styles.chatPane}>
        {loadingMessages ? (
          <ActivityIndicator />
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              style={styles.messageArea}
            >
              {messages.map(m => (
                <View
                  key={m._id}
                  style={[
                    styles.bubble,
                    m.sender === 'me' ? styles.bubbleRight : styles.bubbleLeft,
                  ]}
                >
                  {m.image && <Image source={{ uri: m.image }} style={styles.msgImage} />}
                  <Text>{m.text}</Text>
                  <Text style={styles.ts}>
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type a message…"
                value={newMessage}
                onChangeText={setNewMessage}
              />
              <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                <Text>📷</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSend} style={styles.iconBtn}>
                <Text>➡️</Text>
              </TouchableOpacity>
            </View>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, flexDirection: 'row' },
  listPane: {
    width: '30%',
    backgroundColor: '#f4f4f4',
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
  },
  chatItem: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  chatItemActive: { backgroundColor: '#bbb' },
  chatName: { fontSize: 16 },

  chatPane: { flex: 1, backgroundColor: '#fff', padding: 8 },
  messageArea: { flex: 1 },

  bubble: {
    maxWidth: '75%',
    marginVertical: 4,
    padding: 8,
    borderRadius: 8,
  },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: '#cdeffd' },
  ts: { fontSize: 10, color: '#666', marginTop: 4 },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconBtn: { marginLeft: 8, padding: 6 },
  preview: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginVertical: 4,
  },
  msgImage: { width: 120, height: 120, borderRadius: 8, marginBottom: 4 },
});
