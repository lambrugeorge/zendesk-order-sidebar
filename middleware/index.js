/*Import express, middleware CORS, JSON post request and Mock JSON (for data test)*/
/*Simple node.js middleware for the Zendesk app*/
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const orders = require('./mockOrders.json');

const app = express(); //Initialze app Express
app.use(cors());
app.use(bodyParser.json());

/* Get /order email=someome@example.com*/
app.get('/order', (req, res) => {
        const email = (req.query.email || '').toLocaleLowerCase();
        const useOrders = orders[email] || [];
        const latest = useOrders.length ? useOrders[useOrders.length-1] : null;
        if (!latest) {
            return res.json({ error: 'No orders found', orders: [] });
        }
        res.json(latest);
});

/* Accept text and return a mock..*/
app.post('/ai-summary', (req, res)=> {
    const { text } = req.body;
    const summary = text ? (text.slice(0,120) + (text.length > 120 ? '...' : '')) : '';
    res.json({ summary });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Middleware listening on ${PORT}`))