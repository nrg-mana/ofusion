require('dotenv').config();

const express = require('express');
const app = express();
 
app.get('/', (req, res) => {
  res.send('<iframe src="/be">Hello World</iframe>');
});
 
app.get('/be', (req, res) => {
    const _k_yelpFusionAPI = process.env._k_yelpFusionAPI;

    // Build request with bearer
    /*
    business name
    business address (street, city)
    excerpt from a review of that business
    name of the person that wrote the review
    business information should be output in the order received from the API response
    */
    res.send(`<ul>
    <li>business name</li>
    <li>business address (street, city)</li>
    <li>excerpt from a review of that business</li>
    <li>name of the person that wrote the review</li>
    <li>business information should be output in the order received from the API response</li>
    </ul>
    `);
});
app.listen(3000);