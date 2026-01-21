import { writeFileSync } from 'fs';
import { join } from 'path';

const firstNames = [
  'Mohammad', 'Abdullah', 'Ahmed', 'Hasan', 'Hossain', 'Rahman', 'Islam', 'Khan', 'Ali', 'Hussain',
  'Mahmud', 'Kabir', 'Siddique', 'Chowdhury', 'Uddin', 'Begum', 'Akter', 'Khatun', 'Sultana', 'Parvin',
  'Jahan', 'Akhtar', 'Fatima', 'Aisha', 'Zahra', 'Maryam', 'Khadija', 'Amina', 'Sara', 'Huda'
];

const lastNames = [
  'Khan', 'Ahmed', 'Islam', 'Hossain', 'Rahman', 'Ali', 'Hussain', 'Mahmud', 'Kabir', 'Siddique',
  'Chowdhury', 'Uddin', 'Begum', 'Akter', 'Khatun', 'Sultana', 'Parvin', 'Jahan', 'Akhtar', 'Miah',
  'Chakraborty', 'Das', 'Saha', 'Banerjee', 'Ghosh', 'Roy', 'Sen', 'Dutta', 'Mitra', 'Chatterjee'
];

const operators = ['17', '18', '19', '16', '15']; // Grameenphone, Robi, Banglalink, Airtel, Teletalk

function generatePhone(): string {
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+880${operator}${number}`;
}

function generateEmail(first: string, last: string): string {
  return `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`;
}

function generateName(): { first: string, last: string, full: string } {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { first, last, full: `${first} ${last}` };
}

const csvLines = ['Email,Fullname,Number'];

for (let i = 0; i < 300; i++) {
  const { first, last, full } = generateName();
  const email = generateEmail(first, last);
  const phone = generatePhone();
  csvLines.push(`${email},${full},${phone}`);
}

const csvContent = csvLines.join('\n');

writeFileSync(join(__dirname, '../sample-data/students-bangladeshi-300.csv'), csvContent);

console.log('Generated 300 Bangladeshi students CSV at backend/sample-data/students-bangladeshi-300.csv');