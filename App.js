import React, { useState } from 'react';
import { View, Button, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, Text, LogBox } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import axios from 'axios';
import { Asset } from 'expo-asset';

// Cloudmersive API Key
const CLOUDMERSIVE_API_KEY = 'b28802c6-a1e8-48c5-98f3-f44f0d1f5b94';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function App() {
  const [clientName, setClientName] = useState('');
  const [weight, setWeight] = useState('');
  const [week, setWeek] = useState('');
  const [totalCalories, setTotalCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extractedData, setExtractedData] = useState({});

  // Meals sections to bold
  const meals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  const sanitizeText = (text) => {
    return text.replace(/ﬂ/g, 'fl'); // Replace problematic ligature 'ﬂ' with 'fl'
  };

  const pickFittrPdf = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        Alert.alert('No Document Selected', 'Please pick a Fittr PDF document.');
        return;
      }

      const pickedFile = result.assets && result.assets[0];
      if (pickedFile && pickedFile.uri) {
        console.log('Picked PDF URI:', pickedFile.uri);
        setFileName(pickedFile.name || 'Document');
        await extractFittrPdfDetails(pickedFile);
      } else {
        Alert.alert('Invalid Document', 'The selected file is not a valid PDF document.');
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'There was an error picking the document.');
    } finally {
      setLoading(false);
    }
  };

  const extractFittrPdfDetails = async (file) => {
    try {
      setLoading(true);
      console.log('Sending PDF to Cloudmersive API for extraction...');
      const formData = new FormData();
      formData.append('inputFile', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name || 'document.pdf',
      });

      const response = await axios.post(
        'https://api.cloudmersive.com/convert/autodetect/to/txt',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Apikey': CLOUDMERSIVE_API_KEY,
          },
        }
      );

      const textContent = response.data.TextResult;
      if (!textContent || typeof textContent !== 'string') {
        Alert.alert('Error', 'No content extracted from the PDF.');
        return;
      }

      console.log('Extracted Text from PDF:', textContent);

      const parsedData = parseFittrText(textContent);
      setExtractedData(parsedData);

      const totalValues = calculateTotal(parsedData);
      setTotalCalories(totalValues.totalCalories);
      setProtein(totalValues.totalProtein);
      setCarbs(totalValues.totalCarbs);
      setFats(totalValues.totalFats);

      Alert.alert('Success', 'Details extracted and parsed from Fittr PDF successfully!');
    } catch (err) {
      console.error('Error extracting Fittr PDF details:', err);
      Alert.alert('Error', 'There was an error extracting details from the Fittr PDF.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (data) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    meals.forEach((meal) => {
      if (data[meal]) {
        data[meal].forEach((item) => {
          totalCalories += parseFloat(item.calories);
          totalProtein += parseFloat(item.protein);
          totalCarbs += parseFloat(item.carbs);
          totalFats += parseFloat(item.fats);
        });
      }
    });

    return {
      totalCalories: totalCalories.toFixed(2),
      totalProtein: totalProtein.toFixed(2),
      totalCarbs: totalCarbs.toFixed(2),
      totalFats: totalFats.toFixed(2),
    };
  };

  const parseFittrText = (text) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '');
    const mealsData = { Breakfast: [], Lunch: [], Snacks: [], Dinner: [] };

    let currentMeal = null;
    const mealSections = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

    lines.forEach((line) => {
      line = line.trim();

      console.log('Processing line:', line);

      if (mealSections.includes(line)) {
        currentMeal = line;
        console.log(`Current meal set to: ${currentMeal}`);
        return;
      }

      if (!currentMeal || line.startsWith('Food') || line.includes('Calories')) {
        return;
      }

      const columns = line.split(/\s{2,}/);

      if (columns.length >= 6) {
        const foodItem = columns[0];
        const quantity = columns[1];
        const calories = columns[2].replace('kcl', '').trim();
        const protein = columns[3].replace('g', '').trim();
        const carbs = columns[4].replace('g', '').trim();
        const fats = columns[5].replace('g', '').trim();

        mealsData[currentMeal].push({
          food: foodItem,
          quantity,
          calories,
          protein,
          carbs,
          fats,
        });
        console.log(`Added food item: ${foodItem}`);
      } else {
        console.log('Line does not contain enough columns:', line);
      }
    });

    return mealsData;
  };

  const applyBackgroundColor = (page) => {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
      color: rgb(0.96, 0.93, 0.85),  // Light background color
    });
  };

  const createAndSharePdf = async () => {
    if (!clientName || !weight) {
      Alert.alert('Error', 'Please enter both Name and Weight.');
      return;
    }

    try {
      setLoading(true);

      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([600, 800]);

      applyBackgroundColor(page);

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Load the MuscleUp logo from assets folder
      const asset = Asset.fromModule(require('./assets/Logo.png'));
      await asset.downloadAsync();
      const logoBytes = await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 });
      const logoImage = await pdfDoc.embedPng(logoBytes);

      // Set logo dimensions and position
      const logoWidth = 75;
      const logoHeight = 75;
      const logoX = page.getWidth() - logoWidth - 10; // Position at the top-right corner
      const logoY = page.getHeight() - logoHeight - 10;

      // Draw the logo on the page
      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });

      const itemSpacing = 18;
      const sectionSpacing = 25;
      const firstItemSpacing = 25;
      const yOffsetThreshold = 30;

      page.drawText(sanitizeText(`Nutrition Plan for Week ${week}`), {
        x: 40,
        y: 750,
        size: 24,
        font,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText('Name:'), {
        x: 40,
        y: 700,
        size: 12,
        font: regularFont,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText('Weight:'), {
        x: 40,
        y: 670,
        size: 12,
        font: regularFont,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText(clientName), {
        x: 82,
        y: 700,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sanitizeText(`${weight} lbs`), {
        x: 85,
        y: 670,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sanitizeText('Total Calories:'), {
        x: 350,
        y: 700,
        size: 12,
        font: regularFont,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText('Protein:'), {
        x: 350,
        y: 670,
        size: 12,
        font: regularFont,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText('Carbs:'), {
        x: 350,
        y: 640,
        size: 12,
        font: regularFont,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText('Fats:'), {
        x: 350,
        y: 610,
        size: 12,
        font: regularFont,
        color: rgb(0.07, 0.51, 0.64),
      });

      page.drawText(sanitizeText(`${totalCalories} kcal`), {
        x: 435,
        y: 700,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sanitizeText(`${protein} g`), {
        x: 400,
        y: 670,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sanitizeText(`${carbs} g`), {
        x: 395,
        y: 640,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sanitizeText(`${fats} g`), {
        x: 385,
        y: 610,
        size: 14,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sanitizeText('Food Item'), { x: 40, y: 570, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
      page.drawText(sanitizeText('Quantity'), { x: 240, y: 570, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
      page.drawText(sanitizeText('Calories(kcal)'), { x: 310, y: 570, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
      page.drawText(sanitizeText('Protein(g)'), { x: 405, y: 570, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
      page.drawText(sanitizeText('Carbs(g)'), { x: 468, y: 570, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
      page.drawText(sanitizeText('Fats(g)'), { x: 528, y: 570, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });

      let yOffset = 530;

      meals.forEach((meal) => {
        if (yOffset <= yOffsetThreshold) {
          page = pdfDoc.addPage([600, 800]);
          applyBackgroundColor(page);
          yOffset = 780;
        }

        page.drawText(sanitizeText(meal), { x: 40, y: yOffset, size: 14, font, color: rgb(0.07, 0.51, 0.64) });
        yOffset -= firstItemSpacing;

        if (extractedData[meal]) {
          extractedData[meal].forEach((item, index) => {
            if (yOffset <= yOffsetThreshold) {
              page = pdfDoc.addPage([600, 800]);
              applyBackgroundColor(page);
              yOffset = 780;
            }

            const foodLines = wrapText(item.food, 200);

            foodLines.forEach((line, lineIndex) => {
              page.drawText(sanitizeText(line), { x: 40, y: yOffset - lineIndex * 7, size: 12, font: regularFont, color: rgb(0, 0, 0) });
            });

            page.drawText(sanitizeText(item.quantity), { x: 240, y: yOffset, size: 12, font: regularFont, color: rgb(0, 0, 0) });
            page.drawText(sanitizeText(item.calories), { x: 330, y: yOffset, size: 12, font: regularFont, color: rgb(0, 0, 0) });
            page.drawText(sanitizeText(item.protein), { x: 420, y: yOffset, size: 12, font: regularFont, color: rgb(0, 0, 0) });
            page.drawText(sanitizeText(item.carbs), { x: 480, y: yOffset, size: 12, font: regularFont, color: rgb(0, 0, 0) });
            page.drawText(sanitizeText(item.fats), { x: 540, y: yOffset, size: 12, font: regularFont, color: rgb(0, 0, 0) });

            yOffset -= itemSpacing + (foodLines.length - 1) * 7;

            if (index === extractedData[meal].length - 1) {
              yOffset -= sectionSpacing;
            }
          });
        }
      });

      const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: false });
      const pdfPath = `${FileSystem.documentDirectory}${clientName}_Diet_Week_${week}.pdf`;
      await FileSystem.writeAsStringAsync(pdfPath, pdfBytes, { encoding: FileSystem.EncodingType.Base64 });

      await sharePdf(pdfPath);

      Alert.alert('Success', 'MuscleUp branded PDF created and shared successfully!');
    } catch (error) {
      console.error('Error creating PDF:', error);
      Alert.alert('Error', 'There was an error creating the MuscleUp PDF.');
    } finally {
      setLoading(false);
    }
  };

  const sharePdf = async (pdfPath) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfPath);
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
    }
  };

  const wrapText = (text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const width = currentLine.length + word.length;
      if (width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    });

    lines.push(currentLine);
    return lines;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <TextInput
        style={styles.input}
        placeholder="Week"
        value={week}
        onChangeText={setWeek}
        placeholderTextColor="#aaa"
      />

      {fileName ? <Text style={styles.fileName}>File Selected: {fileName}</Text> : null}
      {extractedData && meals.some((meal) => extractedData[meal]?.length) ? (
        <Text style={styles.fileName}>Extracted Data Available</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color="#FFA500" />
      ) : (
        <>
          <Button title="Pick Fittr PDF" onPress={pickFittrPdf} color="#FFA500" />
          {extractedData && meals.some((meal) => extractedData[meal]?.length) ? (
            <Button title="Create and Share MuscleUp PDF" onPress={createAndSharePdf} color="#32CD32" style={styles.actionButton} />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F8F8',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E67E22',
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#333',
    width: '100%',
    fontSize: 16,
  },
  fileName: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  actionButton: {
    marginVertical: 10,
    borderRadius: 10,
  },
});
