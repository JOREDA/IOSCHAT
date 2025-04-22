import React, { useState } from 'react';
import { Image, StyleSheet, TextInput, Button, View } from 'react-native';

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.0.105:8081'; 

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  // State hooks for email, password, and loading
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle login
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { email, password });

      const { token } = res.data;

      // Save token to AsyncStorage for future API calls
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('email', email);

      console.log('Login successful');
      // Navigate to Home or chat screen
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error);
      alert(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign up
  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/register`, { email, password });

      if (res.status === 201) {
        alert('Registered successfully! You can now log in.');
      } else {
        alert('Registration failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error.response?.data || error);
      alert(error.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image source={require('@/assets/images/15.jpeg')} style={styles.headerImage} />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Log In / Sign Up!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* Login Section */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Log In</ThemedText>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <Button
          title={isLoading ? 'Loading...' : 'Login'}
          onPress={handleLogin}
          disabled={isLoading}
        />
      </ThemedView>

      {/* Sign Up Section */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Sign Up</ThemedText>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <Button
          title={isLoading ? 'Loading...' : 'Sign Up'}
          onPress={handleSignup}
          disabled={isLoading}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  inputContainer: {
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  input: {
    width: '80%',
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
  },
  headerImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
});