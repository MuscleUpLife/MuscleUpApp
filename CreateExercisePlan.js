import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib';

// Function to wrap long text based on a character limit (40 characters)
// Function to wrap long text based on a character limit (40 characters)
const wrapText = (text, maxCharacters) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    // Check if adding the next word would exceed the max character limit
    if ((currentLine + ' ' + word).length > maxCharacters) {
      // If the word itself exceeds the limit and there is no space, split it
      if (word.length > maxCharacters) {
        let remainingWord = word;
        while (remainingWord.length > maxCharacters) {
          lines.push(remainingWord.slice(0, maxCharacters));
          remainingWord = remainingWord.slice(maxCharacters);
        }
        // Add any remaining part of the word
        if (remainingWord.length > 0) {
          currentLine = remainingWord;
        } else {
          currentLine = '';
        }
      } else {
        // Add the current line to the lines array and start a new line with the word
        lines.push(currentLine);
        currentLine = word;
      }
    } else {
      // Otherwise, add the word to the current line
      currentLine += (currentLine ? ' ' : '') + word;
    }
  });

  // Push the last line if it's not empty
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};


// Sanitize text to prevent potential issues with PDF rendering
const sanitizeText = (text) => {
  return text.replace(/ﬂ/g, 'fl'); // Replace problematic ligature 'ﬂ' with 'fl'
};

// Function to apply background color to a page
const applyBackgroundColor = (page) => {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
    color: rgb(0.96, 0.93, 0.85),  // Light background color
  });
};

// Function to create the PDF for the exercise plan
const createExercisePlanPDF = async (clientName, weight, exercisePlan) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 800]);

  // Apply background color to the first page
  applyBackgroundColor(page);

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

 

  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAFACAYAAABKjY7pAABT5UlEQVR4AezBCdC1+VnX+e/v+t/3OefZ3vftLenO1llJhhiWIIIBSQEakLCUFIJGBRzBEnEYtdQRmRJlhhkdnZphBswwlqWDIBipATQqMIABAhhIACFAFsjaSXrvd3mWc859/6/fPE93Oul0up90VaesMu/1+VBKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWcS5RSnrRLt9+u5/2JVz17PbfnMYPnjHmJJDxswg3kWHgeiJZG6+00ZL7tN/7p//q+Pm3Nf+Ge+6xP42mf/4XP3ezuPmca9xa0jMjZ0aR0aEYwLPGcDHSP68PNsl37rZ//7u/6AKWUj4uBUsqTtrH1/t29L4W9b3EOg0DTmMvQ2IbtMLWuNrXQZlSL7ZyxOPrAqk3/i8UPAua/cMe7Xe/P/Iph/6Zv3B7ccCuKUXIMpDJGJUE6GIRWufX66r13TLr4N4AfoZTycTFQSnnSggWLuHGYWN661/Z2B1quhxy6zbgcsYOtks1g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';

  const logoImage = await pdfDoc.embedPng(logoBase64);
  const logoWidth = 120;
  const logoHeight = 75;
  const logoX = 500;
  const logoY = 727;
  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });

  // Adding title and client details
  page.drawText(sanitizeText('Exercise Plan'), {
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

  // Headers for exercise table
  page.drawText('Exercise', { x: 40, y: 620, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
  page.drawText('Sets', { x: 290, y: 620, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
  page.drawText('Reps', { x: 390, y: 620, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });
  page.drawText('Tutorial Link', { x: 490, y: 620, size: 12, font: regularFont, color: rgb(0.2, 0.4, 0.6) });

  let yOffset = 590;
  const itemSpacing = 25;
  const daySpacing = 30;

  // Iterate through the exercise plan and add it to the PDF
  for (const day in exercisePlan) {
    page.drawText(sanitizeText(day), { x: 40, y: yOffset, size: 14, font, color: rgb(0.07, 0.51, 0.64) });
    yOffset -= itemSpacing + 10;

    exercisePlan[day].forEach((exercise) => {
      if (yOffset <= 30) {
        page = pdfDoc.addPage([600, 800]);
        applyBackgroundColor(page);
        yOffset = 750;
      }

      // Wrap exercise text before drawing
      const wrappedText = wrapText(sanitizeText(exercise.exercise), 40);

      wrappedText.forEach((line, lineIndex) => {
        if (yOffset <= 30) {
          page = pdfDoc.addPage([600, 800]);
          yOffset = 750;
        }
        page.drawText(line, { x: 40, y: yOffset - (lineIndex * (itemSpacing-5)), size: 12, font: regularFont, color: rgb(0, 0, 0) });
      });

      page.drawText(sanitizeText(exercise.sets), { x: 295, y: yOffset, size: 14, font: regularFont, color: rgb(0, 0, 0) });
      page.drawText(sanitizeText(exercise.reps), { x: 395, y: yOffset, size: 14, font: regularFont, color: rgb(0, 0, 0) });

      // Add link if it exists
      if (exercise.link) {
        page.drawText('Link', { x: 505, y: yOffset, size: 14, font: font, color: rgb(0.07, 0.51, 0.64) });

        const linkAnnotation = pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [500, yOffset-5, 550, yOffset + 17],
          Border: [0, 0, 1],
          C: [0, 0, 1],
          A: {
            Type: 'Action',
            S: 'URI',
            URI: exercise.link,
          },
          H: 'I',
        });

        // Update page annotations to include the new link annotation
        const annotations = page.node.Annots();
        if (annotations) {
          annotations.push(linkAnnotation);
        } else {
          page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotation]));
        }
      }

      yOffset -= itemSpacing * wrappedText.length;
    });
    yOffset -= daySpacing;
  }

  const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: false });
  const pdfPath = `${FileSystem.documentDirectory}${clientName}_Exercise_Plan.pdf`;
  await FileSystem.writeAsStringAsync(pdfPath, pdfBytes, { encoding: FileSystem.EncodingType.Base64 });

  return pdfPath;
};

// Function to share the PDF using the Sharing API
const shareExercisePlan = async (clientName, weight, exercisePlan) => {
  try {
    const pdfPath = await createExercisePlanPDF(clientName, weight, exercisePlan);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfPath);
    } else {
      Alert.alert('Error', 'Sharing is not available on this device.');
    }
  } catch (error) {
    console.error('Error sharing exercise plan PDF:', error);
    Alert.alert('Error', 'There was an error sharing the exercise plan PDF.');
  }
};

export default function CreateExercisePlan() {
  const [clientName, setClientName] = useState('');
  const [weight, setWeight] = useState('');
  const [days, setDays] = useState([{ day: '', exercises: [{ exercise: '', sets: '', reps: '', link: '' }] }]);
  const [loading, setLoading] = useState(false);

  const addExercise = (dayIndex) => {
    const updatedDays = [...days];
    updatedDays[dayIndex].exercises.push({ exercise: '', sets: '', reps: '', link: '' });
    setDays(updatedDays);
  };

  const addDay = () => {
    setDays([...days, { day: '', exercises: [{ exercise: '', sets: '', reps: '', link: '' }] }]);
  };

  // Function to remove a selected exercise
  const removeExercise = (dayIndex, exerciseIndex) => {
    const updatedDays = [...days];
    updatedDays[dayIndex].exercises.splice(exerciseIndex, 1);
    setDays(updatedDays);
  };

  // Function to remove a selected day
  const removeDay = (dayIndex) => {
    const updatedDays = [...days];
    updatedDays.splice(dayIndex, 1);
    setDays(updatedDays);
  };

  const handleInputChange = (value, dayIndex, exerciseIndex, field) => {
    const updatedDays = [...days];
    updatedDays[dayIndex].exercises[exerciseIndex][field] = value;
    setDays(updatedDays);
  };

  const handleDayChange = (value, dayIndex) => {
    const updatedDays = [...days];
    updatedDays[dayIndex].day = value;
    setDays(updatedDays);
  };

  const exportExercisePlan = () => {
    const exercisePlan = {};
    days.forEach((day) => {
      exercisePlan[`Day ${day.day}`] = day.exercises;
    });

    setLoading(true);
    shareExercisePlan(clientName, weight, exercisePlan).finally(() => setLoading(false));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require('./assets/Logo.png')}
        style={styles.logo}
      />

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

      {days.map((day, dayIndex) => (
        <View key={dayIndex} style={styles.dayContainer}>
          <TextInput
            style={styles.input}
            placeholder={`Day ${dayIndex + 1}`}
            value={day.day}
            onChangeText={(value) => handleDayChange(value, dayIndex)}
            placeholderTextColor="#aaa"
          />

          {day.exercises.map((exercise, exerciseIndex) => (
            <View key={exerciseIndex} style={styles.exerciseContainer}>
              <TextInput
                style={styles.input}
                placeholder="Exercise"
                value={exercise.exercise}
                onChangeText={(value) => handleInputChange(value, dayIndex, exerciseIndex, 'exercise')}
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={styles.input}
                placeholder="Sets"
                value={exercise.sets}
                onChangeText={(value) => handleInputChange(value, dayIndex, exerciseIndex, 'sets')}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={styles.input}
                placeholder="Reps"
                value={exercise.reps}
                onChangeText={(value) => handleInputChange(value, dayIndex, exerciseIndex, 'reps')}
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={styles.input}
                placeholder="Link (optional)"
                value={exercise.link}
                onChangeText={(value) => handleInputChange(value, dayIndex, exerciseIndex, 'link')}
                placeholderTextColor="#aaa"
              />
              <Button
                title="Remove Exercise"
                onPress={() => removeExercise(dayIndex, exerciseIndex)} color ='#96a29f'
              />
            </View>
          ))}
          <Button title="Add Exercise" onPress={() => addExercise(dayIndex)} color ='#1889ab'/>
          <Button title="Remove Day" onPress={() => removeDay(dayIndex)} color ='#96a29f' />
        </View>
      ))}

      <Button title="Add Day" onPress={addDay} color ='#1889ab'/>

      {loading ? <ActivityIndicator size="large" color="#1889ab" /> : (
        <Button title="Export MuscleUp Exercise Plan" onPress={exportExercisePlan} color ='#1889ab'/>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fdf5ea',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    color: '#333'
  },
  dayContainer: {
    marginBottom: 20,
  },
  exerciseContainer: {
    marginBottom: 10,
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
  },
});

