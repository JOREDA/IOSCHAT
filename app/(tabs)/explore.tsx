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
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'http://192.168.0.105:5001'; // Replace with your backend URL

interface Chat {
  _id: string;
  name: string;
}

interface Message {
  _id: string;
  sender: string; // In real usage, compare with current user ID
  text: string;
  image?: string;
  timestamp: string;
}

const App = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load chat list
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/chatlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched chats:', response.data); 
        setChats(response.data);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };
    fetchChats();
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
      }
    };
    requestPermissions();
  }, []);  

  // Load messages when a chat is selected
  const loadMessages = async (chatId: string) => {
    try {
      setSelectedChatId(chatId);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !imageUri) return;
    if (!selectedChatId) return;

    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    formData.append('text', newMessage);
    formData.append('chatId', selectedChatId);

    if (imageUri) {
      const file = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'message.jpg',
      } as any;
      formData.append('image', file);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/messages/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
      setImageUri(null);

      // Auto-scroll to bottom
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Message send error:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (

    <View style={styles.container}>
      {!selectedChatId ? (
    <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => loadMessages(item._id)} style={styles.chatItem}>
            <Text style={styles.chatName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.containername}>No chats available</Text>
        }
      />
      ) : (

        <>
          <ScrollView
            style={styles.messageArea}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <View
                key={msg._id}
                style={[
                  styles.messageContainer,
                  msg.sender === 'me' ? styles.senderMessage : styles.receiverMessage,
                ]}
              >
                {msg.image && <Image source={{ uri: msg.image }} style={styles.image} />}
                <Text style={styles.messageText}>{msg.text}</Text>
                <Text style={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message"
            />
            <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
              <Text style={styles.iconText}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Text style={styles.iconText}>➡️</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#dbe6e9',
  },
  containername: {
    flex: 1,
    padding: 10,
    backgroundColor: '#dbe6e9',
    fontSize: 40,
    fontWeight: 'bold',
    justifyContent: 'center', 
    alignItems: 'center',
    textAlign: 'center', 
  },
  chatItem: {
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 10,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageArea: {
    flex: 1,
    marginBottom: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  senderMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#cdeffd',
  },
  receiverMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: '#777',
    marginTop: 4,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginTop: 5,
  },
  previewImage: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 5,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 18,
  },
});

export default App;
