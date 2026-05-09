import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const patientsToSeed = [
  { fullName: "Abhishek Sharma", healthId: "HID-12345", age: 24, gender: "Male" },
  { fullName: "Rajesh Kumar", healthId: "91123456789012", age: 45, gender: "Male" },
  { fullName: "Aisha Khan", healthId: "98765", age: 29, gender: "Female" },
  { fullName: "Meera Reddy", healthId: "HID-67890", age: 52, gender: "Female" },
  { fullName: "Vikram Joshi", healthId: "HID-VJ221", age: 36, gender: "Male" },
  { fullName: "Sarah Chen", healthId: "HID-SC1984", age: 42, gender: "Female" },
  { fullName: "Marcus King", healthId: "HID-MK808", age: 61, gender: "Male" },
  { fullName: "Laura Palmer", healthId: "HID-LP942", age: 27, gender: "Female" },
  { fullName: "Ravi Verma", healthId: "HID-RV001", age: 48, gender: "Male" },
  { fullName: "Naomi Kim", healthId: "HID-NK334", age: 35, gender: "Female" }
];

export async function seedPatients() {
  for (const patient of patientsToSeed) {
    const userRef = doc(db, 'users', patient.healthId);
    await setDoc(userRef, {
      uid: patient.healthId,
      fullName: patient.fullName,
      healthId: patient.healthId,
      role: 'citizen',
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`Created account for ${patient.fullName}`);
  }
}
