import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity,Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CreateDietPlan from './CreateDietPlan.js'; // Assuming you've already created CreateDietPlan.js
import CreateExercisePlan from './CreateExercisePlan.js'; // Assuming you've already created CreateExercisePlan.js

const Stack = createStackNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/Logo.png')}
        style={styles.logo}
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CreateDietPlan')}
      >
        <Text style={styles.buttonText}>Create Diet Plan</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CreateExercisePlan')}
      >
        <Text style={styles.buttonText}>Create Exercise Plan</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateDietPlan" component={CreateDietPlan} />
        <Stack.Screen name="CreateExercisePlan" component={CreateExercisePlan} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdf5ea',
    padding: 20,
  },
  logo: {
    width: 100,   // Width of the logo in pixels
    height: 100,  // Height of the logo in pixels
    marginBottom: 20,  // Space between the logo and the next component
  },

  button: {
    backgroundColor: '#1889ab',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
