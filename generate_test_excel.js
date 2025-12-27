const XLSX = require('xlsx');

const data = [
    { "Name": "Alice Johnson", "Follower Count": 1500000 }, // Should be VIP
    { "Name": "Bob Smith", "Follower Count": 5000 },        // Should be GST
    { "Name": "Charlie Brown", "Follower Count": 200 },     // Should be GST
    { "Name": "Diana Prince", "Follower Count": 5000000 }   // Should be VIP
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Recipients");

XLSX.writeFile(wb, "test_recipients.xlsx");
console.log("test_recipients.xlsx created successfully!");
