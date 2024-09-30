import React, { useState } from 'react';
import { View, Button, Text, TextInput, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Google Slides direct PDF export link (replace with your correct link)
const TEMPLATE_URL = 'https://docs.google.com/presentation/d/1oaYi2-My8UymcPYyCFxnNCJdonVHhQvC/export/pdf';

export default function App() {
  const [clientName, setClientName] = useState('');
  const [weight, setWeight] = useState('');
  const [totalCalories, setTotalCalories] = useState({
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [mealData, setMealData] = useState({
    breakfast: [],
    lunch: [],
    snacks: [],
    dinner: []
  });

  // Function to pick the Fittr PDF
  const pickFittrPdf = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const pickedFile = result.assets[0];
        extractFittrPdfDetails(pickedFile.uri);
      } else {
        Alert.alert('No Document Selected', 'Please pick a Fittr PDF document.');
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'There was an error picking the document. Please try again.');
    }
  };

  // Function to extract data from Fittr PDF
  const extractFittrPdfDetails = async (pdfUri) => {
    try {
      const pdfBytes = await FileSystem.readAsStringAsync(pdfUri, { encoding: FileSystem.EncodingType.Base64 });
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pdfArrayBuffer = await pdfDoc.save(); // convert to ArrayBuffer for text extraction
      
      // Load the PDF using pdfjs-lib to extract text content
      const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
      let extractedText = '';

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        extractedText += ` ${pageText}`;
      }

      // Now, dynamically extract the customer details and meal information from the extracted text
      console.log("Extracted Text: ", extractedText);
      
      // Simulate extraction of client details
      const clientNameMatch = extractedText.match(/Client Name: (\w+ \w+)/);
      const weightMatch = extractedText.match(/Weight: (\d+)/);
      const proteinMatch = extractedText.match(/Protein: (\d+)/);
      const carbsMatch = extractedText.match(/Carbs: (\d+)/);
      const fatsMatch = extractedText.match(/Fats: (\d+)/);

      setClientName(clientNameMatch ? clientNameMatch[1] : 'Unknown');
      setWeight(weightMatch ? weightMatch[1] : '0');
      setTotalCalories({
        protein: proteinMatch ? parseInt(proteinMatch[1], 10) : 0,
        carbs: carbsMatch ? parseInt(carbsMatch[1], 10) : 0,
        fats: fatsMatch ? parseInt(fatsMatch[1], 10) : 0
      });

      // Extract meal sections (You can refine the regex based on Fittr PDF format)
      const breakfastMatches = extractedText.match(/Breakfast.*?\((.*?)\)/g);
      const lunchMatches = extractedText.match(/Lunch.*?\((.*?)\)/g);
      const snacksMatches = extractedText.match(/Snacks.*?\((.*?)\)/g);
      const dinnerMatches = extractedText.match(/Dinner.*?\((.*?)\)/g);

      setMealData({
        breakfast: breakfastMatches ? parseMealData(breakfastMatches) : [],
        lunch: lunchMatches ? parseMealData(lunchMatches) : [],
        snacks: snacksMatches ? parseMealData(snacksMatches) : [],
        dinner: dinnerMatches ? parseMealData(dinnerMatches) : []
      });

      Alert.alert('Fittr PDF Processed', 'Details extracted from Fittr PDF successfully!');
    } catch (err) {
      console.error('Error extracting Fittr PDF details:', err);
      Alert.alert('Error', 'There was an error extracting details from the Fittr PDF.');
    }
  };

  // Function to parse meal data (assumes a format like "Oats (80 gm, 300 kcal, 10g Protein, ...)")
  const parseMealData = (mealMatches) => {
    return mealMatches.map((meal) => {
      const mealMatch = meal.match(/(.*?)\((.*?) gm, (.*?) kcal, (.*?)g Protein, (.*?)g Carbs, (.*?)g Fats\)/);
      if (mealMatch) {
        return {
          name: mealMatch[1].trim(),
          quantity: parseFloat(mealMatch[2]),
          calories: parseFloat(mealMatch[3]),
          protein: parseFloat(mealMatch[4]),
          carbs: parseFloat(mealMatch[5]),
          fats: parseFloat(mealMatch[6])
        };
      }
      return null;
    }).filter(Boolean);
  };

  // Function to fetch and modify the MuscleUp PDF
  const fetchAndModifyMuscleUpPdf = async () => {
    try {
      if (!clientName || !weight) {
        Alert.alert('Missing Information', 'Please enter the client name and weight.');
        return;
      }

      // Fetch the MuscleUp template PDF from Google Slides
      const response = await fetch(TEMPLATE_URL);
      const templateBytes = await response.arrayBuffer();

      // Load the PDF from fetched bytes
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Get the first page of the template
      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Modify the template with client info
      page.drawText(`Client: ${clientName}`, { x: 100, y: 700, size: 18, font, color: rgb(0, 0, 0) });
      page.drawText(`Weight: ${weight} lbs`, { x: 100, y: 670, size: 18, font, color: rgb(0, 0, 0) });

      // Add Total Calories
      page.drawText(`Protein: ${totalCalories.protein} g`, { x: 100, y: 640, size: 18, font, color: rgb(0, 0, 0) });
      page.drawText(`Carbs: ${totalCalories.carbs} g`, { x: 100, y: 610, size: 18, font, color: rgb(0, 0, 0) });
      page.drawText(`Fats: ${totalCalories.fats} g`, { x: 100, y: 580, size: 18, font, color: rgb(0, 0, 0) });

      // Add dynamic meal data (example for breakfast)
      let yOffset = 550;
      mealData.breakfast.forEach((meal) => {
        page.drawText(`${meal.name}: ${meal.quantity} gm | ${meal.calories} kcal | ${meal.protein} g Protein | ${meal.carbs} g Carbs | ${meal.fats} g Fats`, {
          x: 100, y: yOffset, size: 12, font, color: rgb(0, 0, 0),
        });
        yOffset -= 20;
      });

      // Add Lunch
      yOffset -= 30;
      page.drawText('Lunch', { x: 100, y: yOffset, size: 18, font, color: rgb(0.12, 0.56, 1) });
      yOffset -= 30;
      mealData.lunch.forEach((meal) => {
        page.drawText(`${meal.name}: ${meal.quantity} gm | ${meal.calories} kcal | ${meal.protein} g Protein | ${meal.carbs} g Carbs | ${meal.fats} g Fats`, {
          x: 100, y: yOffset, size: 12, font, color: rgb(0, 0, 0),
        });
        yOffset -= 20;
      });

      // Add Snacks
      yOffset -= 30;
      page.drawText('Snacks', { x: 100, y: yOffset, size: 18, font, color: rgb(0.12, 0.56, 1) });
      yOffset -= 30;
      mealData.snacks.forEach((meal) => {
        page.drawText(`${meal.name}: ${meal.quantity} gm | ${meal.calories} kcal | ${meal.protein} g Protein | ${meal.carbs} g Carbs | ${meal.fats} g Fats`, {
          x: 100, y: yOffset, size: 12, font, color: rgb(0, 0, 0),
        });
        yOffset -= 20;
      });

      // Add Dinner
      yOffset -= 30;
      page.drawText('Dinner', { x: 100, y: yOffset, size: 18, font, color: rgb(0.12, 0.56, 1) });
      yOffset -= 30;
      mealData.dinner.forEach((meal) => {
        page.drawText(`${meal.name}: ${meal.quantity} gm | ${meal.calories} kcal | ${meal.protein} g Protein | ${meal.carbs} g Carbs | ${meal.fats} g Fats`, {
          x: 100, y: yOffset, size: 12, font, color: rgb(0, 0, 0),
        });
        yOffset -= 20;
      });

      // Save the modified PDF locally
      const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: false });
      const newPdfPath = FileSystem.documentDirectory + 'MuscleUpFinal.pdf';
      await FileSystem.writeAsStringAsync(newPdfPath, pdfBytes, { encoding: FileSystem.EncodingType.Base64 });

      // Share the final PDF
      await Sharing.shareAsync(newPdfPath);
    } catch (err) {
      console.error('Error fetching or modifying MuscleUp PDF:', err);
      Alert.alert('Error', 'There was an error generating the MuscleUp PDF.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>MuscleUp PDF Generator</Text>

      <Button title="Pick Fittr PDF" onPress={pickFittrPdf} color="#FFA500" />

      <TextInput
        style={styles.input}
        placeholder="Client Name"
        value={clientName}
        onChangeText={setClientName}
        placeholderTextColor="#aaa"
      />
      <TextInput
        style={styles.input}
        placeholder="Weight (in lbs)"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />

      <Button title="Generate MuscleUp PDF" onPress={fetchAndModifyMuscleUpPdf} color="#1E90FF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#0D47A1',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
});
