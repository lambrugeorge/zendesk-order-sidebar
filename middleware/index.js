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

/* Accept text and return a mock AI summary*/
app.post('/ai-summary', (req, res)=> {
    const { text } = req.body;
    if (!text) {
        return res.json({ summary: 'No text provided for summarization.' });
    }
    
    // Mock AI processing - simulate intelligent summarization
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const hasOrder = /order|ORD/i.test(text);
    const hasIssue = /problem|issue|error|bug|broken/i.test(text);
    const hasRequest = /request|need|want|please/i.test(text);
    
    let summary = `📋 Ticket Summary:\n\n`;
    
    if (lines.length > 0) {
        summary += `• Main Topic: ${lines[0].substring(0, 80)}${lines[0].length > 80 ? '...' : ''}\n`;
    }
    
    if (hasOrder) {
        summary += `• Mentions order information\n`;
    }
    if (hasIssue) {
        summary += `• Reports an issue or problem\n`;
    }
    if (hasRequest) {
        summary += `• Contains a request or inquiry\n`;
    }
    
    summary += `\n📊 Statistics:\n`;
    summary += `• Total comments processed: ${lines.length}\n`;
    summary += `• Text length: ${text.length} characters\n`;
    
    // Add key points if text is long enough
    if (text.length > 200) {
        summary += `\n💡 Key Points:\n`;
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const keySentences = sentences.slice(0, 2);
        keySentences.forEach((s, i) => {
            summary += `${i + 1}. ${s.trim()}\n`;
        });
    }
    
    res.json({ summary });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Middleware listening on ${PORT}`))