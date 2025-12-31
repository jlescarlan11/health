import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000/api';

export const getFacilities = async () => {
  try {
    const response = await axios.get(`${API_URL}/facilities`);
    return response.data;
  } catch (error) {
    console.error('Error fetching facilities:', error);
    throw error;
  }
};
